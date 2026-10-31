/**
 * POST /api/suza/plan — model-backed planning for Suza.
 *
 * The app sends what the user said plus the current search context; Claude
 * returns Suza's reply, typed actions and at most one follow-up question as
 * structured output. Everything is validated with the same `validateActions`
 * the device planner uses, so a bad model answer can never do more than the
 * action vocabulary allows. Place names come back as text and are geocoded
 * here with Photon (OpenStreetMap) — the model never invents coordinates.
 *
 * Server env: ANTHROPIC_API_KEY (the app bundle holds no key).
 * GET returns { ok } so the app falls back to its on-device parser when unset.
 */
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { validateActions, type SuzaAction, type SuzaPlan } from "../../../lib/suza/actions";
import type { BrainContext } from "../../../lib/suza/brain";
import type { SearchTarget } from "../../../types/search";

const MODEL = process.env.SUZA_PLAN_MODEL || "claude-opus-5-5";

// Kept deliberately flat: the API compiles this into a grammar, and a nested
// "array of action objects with many optional fields" was rejected as too large.
const Plan = z.object({
  reply: z.string().describe("What Suza says, one to two short friendly sentences. Mention anything you could not do."),
  locationQuery: z.string().nullable().describe("A place the user named (city, area, landmark, address), to be geocoded. null if none."),
  intent: z.enum(["buy", "rent", "stay", "list"]).nullable().describe("Only when the user states or changes it."),
  filters: z
    .object({
      propertyTypes: z.array(z.string()).nullable().describe("apartment, villa, townhouse, studio, loft, house"),
      budgetMin: z.number().nullable(),
      budgetMax: z.number().nullable(),
      bedroomsMin: z.number().nullable(),
      bathroomsMin: z.number().nullable(),
      pool: z.boolean().nullable(),
      garage: z.boolean().nullable(),
      furnished: z.boolean().nullable(),
      seaView: z.boolean().nullable(),
      pets: z.boolean().nullable(),
      guests: z.number().nullable(),
      rentalDuration: z.string().nullable().describe("short, seasonal or long"),
      dateStart: z.string().nullable().describe("ISO date"),
      dateEnd: z.string().nullable().describe("ISO date"),
      nearKind: z.string().nullable().describe("sea, beach, airport, school, supermarket, gym, restaurants, transport, hospital or center"),
      nearKm: z.number().nullable().describe("Straight-line km for nearKind. Convert minutes: walking ≈ 0.08 km/min, driving ≈ 0.6 km/min, and say so in the reply."),
    })
    .nullable()
    .describe("Filters to merge into the search; null when nothing changes."),
  clearFilters: z.boolean().describe("true for 'show me everything', 'start over', 'clear filters'."),
  showAll: z.boolean().describe("true when the user wants no more questions."),
  openUploadPurpose: z.enum(["sell", "rent_out"]).nullable().describe("When the user wants to list their own property."),
  openUploadDuration: z.enum(["short", "seasonal", "long"]).nullable(),
  openListingId: z.string().nullable().describe("One of context.resultIds, or context.selectedListingId, when the user asks to open one."),
  viewMode: z.enum(["map", "list"]).nullable(),
  zoom: z.number().nullable().describe(">1 zooms in, <1 zooms out"),
  showSaved: z.boolean(),
  question: z
    .object({
      key: z.string().describe("Stable id: intent, location, budget, bedrooms, pets, movein, duration, type, purpose, dates, guests"),
      text: z.string(),
      options: z.array(z.object({ label: z.string(), value: z.string() })).nullable(),
    })
    .nullable()
    .describe("At most one follow-up, never one whose key is already in context.asked, never when context.showAll is true."),
});

const SYSTEM = [
  "You are Suza, the voice of Zouza, a friendly Spain-first real-estate app that only connects people with owners (no payments, deposits or legal/tax/financial advice).",
  "You turn what the user says into typed actions on a map-first property search and a short spoken reply.",
  "Rules:",
  "- Extract only what was said. Never invent listings, places, coordinates, prices or availability.",
  "- Put place names in locationQuery; the server geocodes them. Keep existing filters unless the user changes or clears them (filters merge).",
  "- \"show me everything\" / \"just show all\" means clearFilters true, showAll true and no question.",
  "- Selling or renting out their own property means intent list + openUploadPurpose (and openUploadDuration if said).",
  "- Distances are straight-line. Never present them as walking or driving times. \"Near the sea / beach / a school\" with no distance means nearKind with nearKm 2.",
  "- Ask at most one follow-up question, only when it would materially narrow the search, and never a key already in context.asked. Offer 2-4 short options when natural.",
  "- Replies are spoken aloud: warm, concise, no markdown, no lists.",
].join("\n");

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
}

export function GET() {
  return json({ ok: !!process.env.ANTHROPIC_API_KEY, model: MODEL });
}

async function geocode(query: string, bias?: { lat: number; lng: number } | null): Promise<SearchTarget | null> {
  const biasParam = bias ? `&lat=${bias.lat}&lon=${bias.lng}&location_bias_scale=0.4` : "";
  const res = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=1&lang=en${biasParam}`, { headers: { accept: "application/json" } });
  if (!res.ok) return null;
  const data = (await res.json()) as { features?: { geometry: { coordinates: [number, number] }; properties: Record<string, unknown> }[] };
  const f = data.features?.[0];
  if (!f) return null;
  const [lng, lat] = f.geometry.coordinates;
  const p = f.properties;
  const extent = p.extent as [number, number, number, number] | undefined;
  const label = [p.name, p.city !== p.name ? p.city : undefined, p.country].filter(Boolean).join(", ");
  const kind = p.type === "city" || p.type === "locality" ? "city" : p.type === "district" ? "district" : p.osm_key === "place" ? "city" : "place";
  const bounds = extent ? { west: extent[0], north: extent[1], east: extent[2], south: extent[3] } : { north: lat + 0.05, south: lat - 0.05, east: lng + 0.06, west: lng - 0.06 };
  return { label: label || query, point: { lat, lng }, bounds, kind: kind as SearchTarget["kind"], source: "photon" };
}

export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) return json({ error: "Planner isn't configured on this server (set ANTHROPIC_API_KEY)." }, 503);
  let body: { message?: string; context?: BrainContext };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return json({ error: "Expected JSON { message, context }." }, 400);
  }
  const message = (body.message ?? "").toString().trim().slice(0, 2000);
  const ctx = body.context;
  if (!message || !ctx) return json({ error: "Missing message or context." }, 400);

  const client = new Anthropic();
  const context = {
    intent: ctx.intent,
    criteria: { ...ctx.criteria, bounds: undefined },
    asked: ctx.asked,
    showAll: ctx.showAll,
    userLocationLabel: ctx.userLocationLabel,
    resultCount: ctx.resultCount,
    selectedListingId: ctx.selectedListingId,
    resultIds: ctx.resultIds,
    today: new Date().toISOString().slice(0, 10),
  };

  try {
    const response = await client.beta.messages.parse({
      model: MODEL,
      max_tokens: 2048,
      system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
      output_config: { effort: "low", format: zodOutputFormat(Plan) },
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      messages: [{ role: "user", content: `Context:\n${JSON.stringify(context)}\n\nUser said: "${message}"` }],
    });
    if (response.stop_reason === "refusal" || !response.parsed_output) return json({ error: "No plan." }, 502);
    const out = response.parsed_output;

    const raw: Record<string, unknown>[] = [];
    if (out.intent) raw.push({ type: "setIntent", intent: out.intent });
    if (out.clearFilters) raw.push({ type: "clearFilters" });
    if (out.filters) {
      const { nearKind, nearKm, ...rest } = out.filters;
      const patch: Record<string, unknown> = Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== null));
      if (nearKind && nearKm) patch.distance = [{ to: nearKind, maxKm: nearKm }];
      if (Object.keys(patch).length) raw.push({ type: "setFilters", patch });
    }
    if (out.zoom) raw.push({ type: "zoom", factor: out.zoom });
    if (out.viewMode) raw.push({ type: "setViewMode", mode: out.viewMode });
    if (out.openListingId) raw.push({ type: "openListing", id: out.openListingId });
    if (out.openUploadPurpose) raw.push({ type: "openUpload", purpose: out.openUploadPurpose, duration: out.openUploadDuration ?? undefined });
    if (out.showSaved) raw.push({ type: "showSaved" });
    if (out.showAll) raw.push({ type: "showAll" });
    const actions: SuzaAction[] = validateActions(raw);
    let reply = out.reply;
    if (out.locationQuery) {
      const target = await geocode(out.locationQuery, ctx.criteria.target?.point ?? null).catch(() => null);
      if (target) actions.unshift({ type: "setTarget", target });
      else reply = `${reply} I couldn't find "${out.locationQuery}" on the map, though.`;
    }
    const question =
      out.question && !ctx.asked.includes(out.question.key) && !ctx.showAll
        ? { key: out.question.key, text: out.question.text, options: out.question.options ?? undefined }
        : undefined;
    const plan: SuzaPlan = { reply, actions, question };
    return json(plan);
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) return json({ error: "Planner key rejected." }, 503);
    if (e instanceof Anthropic.RateLimitError) return json({ error: "Planner busy." }, 429);
    console.warn("[suza/plan] failed", e);
    return json({ error: "Planner error." }, 502);
  }
}

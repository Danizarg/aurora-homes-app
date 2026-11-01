import type { Intent, SearchCriteria, SearchTarget } from "../../types/search";
import type { SuzaAction, SuzaPlan } from "./actions";
import { validateActions } from "./actions";
import { parseUtterance, type ParsedUtterance } from "./parse";
import { nextQuestion } from "./questions";
import { geocode } from "../geo/geocode";
import { parseDateRange } from "./dates";
import { suzaEndpointReady, suzaUrl } from "./api";

/**
 * Turns a user message into words plus typed actions.
 *
 * Two planners share one contract:
 *  - local: the deterministic parser + question policy below, always
 *    available, no keys.
 *  - remote: POST /api/suza/plan (an Expo API route in this repo; the server holds the model key),
 *    returning the same { reply, actions, question } shape. Its actions are
 *    validated before use, and any failure falls back to local.
 */
export interface BrainContext {
  intent: Intent | null;
  criteria: SearchCriteria;
  asked: string[];
  showAll: boolean;
  userLocationLabel: string | null;
  resultCount: number | null;
  /** The listing currently selected on the map, if any. */
  selectedListingId: string | null;
  /** First few result ids, so "open the first one" can resolve. */
  resultIds: string[];
}

// The server planner (app/api/suza/plan+api.ts) is used whenever the server reports it is
// configured; EXPO_PUBLIC_SUZA_REMOTE_PLANNER=false forces the on-device parser.
const REMOTE_DISABLED = process.env.EXPO_PUBLIC_SUZA_REMOTE_PLANNER === "false";

export async function planTurn(message: string, ctx: BrainContext): Promise<SuzaPlan> {
  if (!REMOTE_DISABLED && (await suzaEndpointReady("/api/suza/plan"))) {
    const remote = await planRemotely(message, ctx);
    if (remote) return remote;
  }
  return planLocally(message, ctx);
}

async function planRemotely(message: string, ctx: BrainContext): Promise<SuzaPlan | null> {
  const url = suzaUrl("/api/suza/plan");
  if (!url) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ message, context: ctx }),
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const json = (await res.json()) as Partial<SuzaPlan>;
    if (typeof json.reply !== "string") return null;
    return { reply: json.reply, actions: validateActions(json.actions), question: json.question };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// ------------------------------------------------------------------ local

const intentWord: Record<Exclude<Intent, "list">, string> = { buy: "buy", rent: "rent", stay: "stay in" };

function describe(c: SearchCriteria, intent: Intent | null): string {
  const bits: string[] = [];
  if (c.pets) bits.push("pet-friendly");
  if (c.bedroomsMin) bits.push(`${c.bedroomsMin}-bedroom`);
  if (c.propertyTypes?.length) bits.push(c.propertyTypes.length === 1 ? pluralType(c.propertyTypes[0]) : "homes");
  else bits.push("homes");
  let s = bits.join(" ");
  if (c.pool) s += " with a pool";
  if (c.seaView) s += (c.pool ? " and" : " with") + " sea views";
  if (c.garage) s += " with parking";
  if (c.furnished) s += ", furnished";
  for (const d of c.distance ?? []) s += ` near the ${d.label ?? labelFor(d.to)}`;
  if (c.target) s += ` in ${c.target.label.split(",")[0]}`;
  if (c.budgetMax) s += ` for up to €${c.budgetMax.toLocaleString("en-GB")}${intent === "buy" ? "" : " a month"}`;
  else if (c.budgetMin) s += ` from €${c.budgetMin.toLocaleString("en-GB")}${intent === "buy" ? "" : " a month"}`;
  return s;
}

function pluralType(t: string) {
  return t === "studio" ? "studios" : `${t}s`;
}

function labelFor(kind: string) {
  return kind === "sea" ? "coast" : kind === "center" ? "centre" : kind;
}

function listingReply(parsed: ParsedUtterance): SuzaPlan {
  const purpose = parsed.listing?.purpose ?? "rent_out";
  const duration = parsed.listing?.duration;
  if (purpose === "rent_out" && !duration) {
    return {
      reply: "Lovely — let's get your place listed. Is it a short-term holiday let, a seasonal rental, or a long-term tenancy?",
      actions: [{ type: "setIntent", intent: "list" }],
      question: {
        key: "rentalCategory",
        text: "Which rental category applies?",
        options: [
          { label: "Short-term", value: "rent it out short-term" },
          { label: "Seasonal", value: "rent it out seasonally" },
          { label: "Long-term", value: "rent it out long-term" },
        ],
      },
    };
  }
  return {
    reply: purpose === "sell"
      ? "Great — I'll open the listing builder. Add a few photos and I'll write the sales exposé for you."
      : `Great — I'll open the listing builder for a ${duration === "short" ? "short-term" : duration === "seasonal" ? "seasonal" : "long-term"} rental. Add a few photos and I'll take it from there.`,
    actions: [{ type: "setIntent", intent: "list" }, { type: "openUpload", purpose, duration }],
  };
}

export async function planLocally(message: string, ctx: BrainContext): Promise<SuzaPlan> {
  const parsed = parseUtterance(message);
  const actions: SuzaAction[] = [];
  const notes: string[] = [...parsed.notes];
  let intent = ctx.intent;

  // Owners go straight to the existing builder.
  if (parsed.intent === "list" || (intent === "list" && parsed.listing)) return listingReply(parsed);
  if (intent === "list" && /^(short|seasonal|long)/i.test(message)) return listingReply({ ...parsed, listing: { purpose: "rent_out", duration: /short/i.test(message) ? "short" : /season/i.test(message) ? "seasonal" : "long" } });

  if (parsed.intent && parsed.intent !== intent) {
    intent = parsed.intent;
    actions.push({ type: "setIntent", intent });
  }

  // "Just show me everything" drops the filters (keeping place and intent) and ends the questions.
  if (parsed.showAll && !parsed.clearFilters) parsed.clearFilters = true;
  if (parsed.clearFilters) actions.push({ type: "clearFilters" });
  if (parsed.showAll) actions.push({ type: "showAll" });
  if (parsed.showSaved) actions.push({ type: "showSaved" });
  if (parsed.saveSearch) actions.push({ type: "saveSearch" });
  if (parsed.viewMode) actions.push({ type: "setViewMode", mode: parsed.viewMode });
  if (parsed.zoom) actions.push({ type: "zoom", factor: parsed.zoom === "in" ? 0.5 : 2 });

  // Dates ("3 to 8 November", "next month", "asap")
  const dates = parseDateRange(message);
  const patch: Partial<SearchCriteria> = { ...parsed.patch, ...(dates ?? {}) };

  // Location → real geocoding. Never guess coordinates.
  let target: SearchTarget | undefined;
  let locationFailed: string | undefined;
  if (parsed.flexibleLocation) {
    actions.push({ type: "clearTarget" });
  } else if (parsed.locationQuery) {
    target = (await geocode(parsed.locationQuery)) ?? undefined;
    if (target) actions.push({ type: "setTarget", target }, { type: "moveMap", bounds: target.bounds });
    else locationFailed = parsed.locationQuery;
  }
  if (parsed.anchoredDistance) {
    const anchor = await geocode(parsed.anchoredDistance.query);
    if (anchor) {
      patch.distance = [...(patch.distance ?? []), { to: "place", maxKm: parsed.anchoredDistance.maxKm, point: anchor.point, label: anchor.label.split(",")[0] }];
      if (!target) actions.push({ type: "moveMap", point: anchor.point, halfSizeKm: Math.max(parsed.anchoredDistance.maxKm * 1.3, 2) });
      if (parsed.anchoredDistance.note) notes.push(parsed.anchoredDistance.note);
    } else notes.push(`I couldn't place "${parsed.anchoredDistance.query}" on the map.`);
  }
  if (Object.keys(patch).length) actions.push({ type: "setFilters", patch });

  // Resolve "open the first one"
  if (parsed.openFirst) {
    const id = ctx.selectedListingId ?? ctx.resultIds[0];
    if (id) actions.push({ type: "openListing", id });
  }

  // ---- compose the reply
  const merged: SearchCriteria = parsed.clearFilters
    ? { currency: "EUR", intent: ctx.criteria.intent, target: target ?? ctx.criteria.target, ...patch }
    : { ...ctx.criteria, ...patch, target: parsed.flexibleLocation ? undefined : target ?? ctx.criteria.target };
  const asked = parsed.yesNo !== undefined && ctx.asked.length ? ctx.asked : ctx.asked;
  const changedSomething = Object.keys(patch).length > 0 || !!target || parsed.clearFilters || parsed.flexibleLocation;

  let reply: string;
  if (parsed.showSaved) reply = "Here are the homes you've saved.";
  else if (parsed.saveSearch) reply = "Saved. I'll keep these preferences for next time.";
  else if (parsed.openFirst) reply = "Opening it now.";
  else if (locationFailed) reply = `I couldn't find "${locationFailed}" on the map. Could you try the city or a nearby town?`;
  else if (parsed.showAll) reply = `Sure — here's everything${intent && intent !== "list" ? ` to ${intentWord[intent]}` : ""}${merged.target ? ` around ${merged.target.label.split(",")[0]}` : ""}, no filters.`;
  else if (parsed.clearFilters) reply = "Done, I've cleared your filters." + (merged.target ? ` Still looking around ${merged.target.label.split(",")[0]}.` : "");
  else if (changedSomething && intent && intent !== "list") {
    const verb = intentWord[intent];
    reply = `Got it! I'll look for ${describe(merged, intent)} to ${verb}.`;
    if (parsed.flexibleLocation) reply = `No problem, I'll search everywhere. Looking for ${describe(merged, intent)}.`;
    reply += " Let me show you what's available.";
  } else if (parsed.intent) {
    reply = intent === "buy" ? "Buying it is." : intent === "stay" ? "A short stay, lovely." : "Renting, got it.";
  } else if (parsed.yesNo === false && ctx.asked.length) {
    reply = "No problem.";
    if (ctx.asked[ctx.asked.length - 1] === "pets") actions.push({ type: "setFilters", patch: { pets: false } });
  } else reply = "I'm here to help you find a home. Tell me a city, a budget, how many bedrooms, or anything else that matters.";

  if (notes.length) reply += ` I'll keep ${notes.join(", ")} in mind.`;

  // One follow-up question, only if we're not about to leave the map.
  const showAll = ctx.showAll || !!parsed.showAll;
  const question = parsed.openFirst || parsed.showSaved ? undefined : nextQuestion(intent, merged, asked, showAll) ?? undefined;

  return { reply, actions, question: question ?? undefined };
}

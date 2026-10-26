// Suzi, the real model, reached through zouza.ai — the app never holds a
// provider key. Every call here degrades to the deterministic layer in
// `./service.ts` on any failure (offline, timeout, rate limit, server
// error), which is the same contract the website keeps.
//
// EXPO_PUBLIC_APP_URL points at the website; it defaults to production so a
// TestFlight build works with no .env at all.
import type { AiGeneratedContent, FaqItem, Listing } from "../../types";
import { answerAgentQuestion, generateListingContent as generateLocally, type ListingDraftInput } from "./service";

const APP_URL = (process.env.EXPO_PUBLIC_APP_URL || "https://zouza.ai").replace(/\/$/, "");
const TIMEOUT_MS = 30_000;

export interface SuziTurn {
  role: "user" | "assistant";
  content: string;
}

async function post<T>(path: string, body: unknown, timeoutMs = TIMEOUT_MS): Promise<T | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${APP_URL}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** The subset of a listing Suzi is told about. Mirrors the web's listing context. */
function listingPayload(listing: Listing) {
  return {
    title: listing.title,
    description: listing.description,
    mode: listing.mode === "buy" ? "buy" : "rent",
    city: listing.city,
    country: listing.country,
    address_area: listing.address_area,
    property_type: listing.property_type,
    bedrooms: listing.bedrooms,
    bathrooms: listing.bathrooms,
    size_m2: listing.size_m2,
    price_monthly: listing.price_monthly ?? null,
    price_sale: listing.price_sale ?? null,
    utilities_monthly: listing.utilities_monthly ?? null,
    deposit: listing.deposit ?? null,
    available_from: listing.available_from ?? null,
    minimum_stay: listing.minimum_stay ?? null,
    pets_allowed: listing.pets_allowed,
    pool: listing.pool,
    sea_view: listing.sea_view,
    garage: listing.garage,
    furnished: listing.furnished,
    verified_owner: listing.verified_owner,
    verified_property: listing.verified_property,
    faq: listing.faq,
  };
}

export interface AskSuziResult {
  text: string;
  source: "model" | "fallback";
}

/**
 * Ask Suzi about a property. Falls back to the FAQ matcher when the
 * website can't be reached or declines the call.
 */
export async function askSuzi(
  question: string,
  listing: Listing,
  history: SuziTurn[] = [],
): Promise<AskSuziResult> {
  const trimmed = question.trim();
  if (!trimmed) return { text: "", source: "fallback" };

  const reply = await post<{ text?: string; source?: string }>("/api/suzi/ask", {
    message: trimmed,
    route: `/property/${listing.id}`,
    history: history.slice(-10),
    listing: listingPayload(listing),
  });

  if (reply?.text && reply.source === "model") return { text: reply.text, source: "model" };
  return { text: answerAgentQuestion(trimmed, listing.faq as FaqItem[]), source: "fallback" };
}

/** The web's `GeneratedListingContent` shape, as `/api/suzi/generate` returns it. */
interface GeneratedFromWeb {
  title: string;
  summary: string;
  description: string;
  featureBullets: string[];
  lifestyleParagraph: string;
  locationParagraph: string;
  idealProfile: string;
  priceExplanation: string;
  ownerRulesSummary: string;
  faq: FaqItem[];
  agentKnowledgeBase: string[];
  translations: Record<string, "ready" | "pending">;
}

/**
 * Generate the written listing with the real model, falling back to the
 * local template. The local result always supplies the translation map —
 * the web returns readiness flags, not translated text.
 */
export async function generateListing(input: ListingDraftInput): Promise<AiGeneratedContent> {
  const local = await generateLocally(input);

  const written = await post<GeneratedFromWeb>("/api/suzi/generate", { draft: input }, 60_000);
  if (!written?.title) return local;

  return {
    ...local,
    title: written.title.trim() || local.title,
    short_summary: written.summary || local.short_summary,
    long_description: written.description || local.long_description,
    feature_bullets: written.featureBullets?.length ? written.featureBullets : local.feature_bullets,
    lifestyle_paragraph: written.lifestyleParagraph || local.lifestyle_paragraph,
    location_paragraph: written.locationParagraph || local.location_paragraph,
    ideal_profile: written.idealProfile || local.ideal_profile,
    price_explanation: written.priceExplanation || local.price_explanation,
    faq: written.faq?.length ? written.faq : local.faq,
    agent_knowledge_base: written.agentKnowledgeBase?.length ? written.agentKnowledgeBase : local.agent_knowledge_base,
  };
}

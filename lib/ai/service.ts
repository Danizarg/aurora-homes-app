// AI service abstraction for Aurora Homes.
//
// If OPENAI_API_KEY or ANTHROPIC_API_KEY is not set, every function below
// falls back to deterministic mock generation so the app can be demoed with
// no AI backend at all. To connect a real model, implement the calls inside
// the `hasRealAiKey` branches — the function signatures are already the
// shape the rest of the app expects, so no other file needs to change.
import type { AiGeneratedContent, FaqItem } from "../../types";

export const hasRealAiKey = Boolean(
  process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY
);

export interface ListingDraftInput {
  intent: "rent_out" | "sell";
  propertyType: string;
  city: string;
  addressArea: string;
  bedrooms: number;
  bathrooms: number;
  sizeM2: number;
  pool: boolean;
  seaView: boolean;
  garage: boolean;
  petsAllowed: boolean;
  furnished: boolean;
  priceMonthly?: number;
  priceSale?: number;
  utilitiesMonthly?: number;
  deposit?: number;
  ownerRules?: string;
  notes?: string;
}

const TRANSLATION_LANGS = ["English", "German", "Spanish", "French", "Italian", "Dutch"] as const;

function featureList(input: ListingDraftInput): string[] {
  const features: string[] = [
    `${input.bedrooms} bedroom${input.bedrooms === 1 ? "" : "s"}`,
    `${input.bathrooms} bathroom${input.bathrooms === 1 ? "" : "s"}`,
    `${input.sizeM2} m² of living space`,
  ];
  if (input.pool) features.push("Private or shared pool access");
  if (input.seaView) features.push("Sea view");
  if (input.garage) features.push("Private garage");
  if (input.petsAllowed) features.push("Pets allowed");
  if (input.furnished) features.push("Fully furnished");
  return features;
}

function buildFaq(input: ListingDraftInput): FaqItem[] {
  return [
    {
      question: "Is the property still available?",
      answer: "Yes, this listing is currently active and available.",
    },
    {
      question: "Are pets allowed?",
      answer: input.petsAllowed
        ? "Yes, pets are welcome in this property."
        : "Pets are not allowed in this property.",
    },
    {
      question: "Is there a garage?",
      answer: input.garage
        ? "Yes, a private garage is included."
        : "No dedicated garage is included, but street parking is usually available.",
    },
    {
      question: "Is it suitable for remote work?",
      answer: "The property has a stable internet connection and a quiet area suited to remote work.",
    },
  ];
}

function priceExplanation(input: ListingDraftInput): string {
  if (input.intent === "sell") {
    return `The asking price is ${input.priceSale?.toLocaleString("en-GB") ?? "—"} €. Estimated purchase costs (taxes, notary, registration) are typically an additional 10–13% and vary by region.`;
  }
  const monthly = input.priceMonthly ?? 0;
  const utilities = input.utilitiesMonthly ?? 0;
  const deposit = input.deposit ?? monthly;
  const feePercent = 2;
  const fee = Math.round(monthly * (feePercent / 100));
  const total = monthly + utilities + deposit + fee;
  return `Monthly rent: ${monthly} €. Utilities: ${utilities} €. Deposit: ${deposit} €. Platform fee: ${feePercent}% (${fee} €). Total due at move-in: ${total} €.`;
}

export async function generateListingContent(
  input: ListingDraftInput
): Promise<AiGeneratedContent> {
  if (hasRealAiKey) {
    // TODO: call OpenAI / Anthropic here using the same input shape and
    // return an AiGeneratedContent object. Falling through to the mock
    // generator keeps the app functional until that call is implemented.
  }

  const locationLabel = `${input.addressArea}, ${input.city}`;
  const propertyLabel = input.propertyType.charAt(0).toUpperCase() + input.propertyType.slice(1);
  const title = `${input.seaView ? "Sea View " : ""}${propertyLabel} in ${input.city}`;
  const shortSummary = `A ${input.bedrooms}-bedroom ${input.propertyType} in ${locationLabel}, ${
    input.furnished ? "fully furnished and " : ""
  }ready for ${input.intent === "sell" ? "a new owner" : "immediate move-in"}.`;

  const longDescription = `This ${propertyLabel.toLowerCase()} in ${locationLabel} offers ${input.sizeM2} m² across ${input.bedrooms} bedroom${
    input.bedrooms === 1 ? "" : "s"
  } and ${input.bathrooms} bathroom${input.bathrooms === 1 ? "" : "s"}. ${
    input.seaView ? "Enjoy sea views from the main living area. " : ""
  }${input.pool ? "A pool is available on-site. " : ""}${
    input.notes ? input.notes + " " : ""
  }The property is presented by Aurora Homes with a dedicated AI assistant to answer questions at any time.`;

  return {
    id: `draft-${Date.now()}`,
    listing_id: "",
    title,
    short_summary: shortSummary,
    long_description: longDescription,
    feature_bullets: featureList(input),
    lifestyle_paragraph: `Living in ${input.city} means easy access to local cafés, walkable streets, and an authentic Spanish lifestyle just steps from ${locationLabel}.`,
    location_paragraph: `Located in ${locationLabel}, this property is well connected to the city centre and everyday amenities.`,
    ideal_profile:
      input.intent === "sell"
        ? "Ideal for buyers looking for a long-term home or investment in a well-connected area."
        : "Ideal for tenants seeking a comfortable, move-in-ready home with transparent pricing.",
    price_explanation: priceExplanation(input),
    faq: buildFaq(input),
    agent_knowledge_base: [
      `Location: ${locationLabel}`,
      `Bedrooms: ${input.bedrooms}, Bathrooms: ${input.bathrooms}, Size: ${input.sizeM2} m²`,
      `Pool: ${input.pool ? "yes" : "no"}, Sea view: ${input.seaView ? "yes" : "no"}, Garage: ${input.garage ? "yes" : "no"}`,
      `Pets allowed: ${input.petsAllowed ? "yes" : "no"}, Furnished: ${input.furnished ? "yes" : "no"}`,
      input.ownerRules ? `Owner rules: ${input.ownerRules}` : "No special owner rules provided.",
    ],
    translations: Object.fromEntries(
      TRANSLATION_LANGS.map((lang) => [
        lang,
        lang === "English" ? shortSummary : `[${lang} translation placeholder] ${shortSummary}`,
      ])
    ),
  };
}

/** Deterministic mock answer engine for a listing's AI property agent. */
export function answerAgentQuestion(question: string, faq: FaqItem[]): string {
  const normalized = question.toLowerCase();
  const match = faq.find((item) => {
    const keywords = item.question
      .toLowerCase()
      .replace(/[?]/g, "")
      .split(" ")
      .filter((w) => w.length > 4);
    return keywords.some((word) => normalized.includes(word));
  });
  if (match) return match.answer;
  return "I don't have a confirmed answer for that yet, but I've flagged your question for the owner to follow up on directly.";
}

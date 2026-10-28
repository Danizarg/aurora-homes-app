import type { Intent, SearchCriteria } from "../../types/search";

export interface Question {
  key: string;
  text: string;
  options?: { label: string; value: string }[];
}

/**
 * Which single question to ask next, if any. Never asks about something
 * the criteria already answer, never repeats a question, and stops once
 * the user said "just show me everything".
 */
export function nextQuestion(intent: Intent | null, c: SearchCriteria, asked: string[], showAll: boolean): Question | null {
  if (showAll) return null;
  const has = (k: string) => asked.includes(k);
  const q = (key: string, text: string, options?: Question["options"]): Question | null => (has(key) ? null : { key, text, options });

  if (!intent) {
    return q("intent", "Are you looking to buy a home, rent somewhere, find a short stay, or list your own property?", [
      { label: "Buy", value: "I want to buy a property" },
      { label: "Rent", value: "I want to rent a property" },
      { label: "Short stay", value: "I'm looking for a short stay" },
      { label: "List my property", value: "I want to list my own property" },
    ]);
  }
  if (intent === "list") return null;

  if (!c.target && !has("location")) {
    return q("location", "Which city or area are you looking in? You can also say \"anywhere\".");
  }

  if (intent === "rent") {
    if (c.budgetMax == null && c.budgetMin == null) return q("budget", "What's your monthly budget, roughly?", [
      { label: "Up to €1,000", value: "up to €1,000 a month" },
      { label: "Up to €1,500", value: "up to €1,500 a month" },
      { label: "Up to €2,500", value: "up to €2,500 a month" },
      { label: "Flexible", value: "just show me everything" },
    ]);
    if (c.bedroomsMin == null && !c.propertyTypes?.includes("studio")) return q("bedrooms", "How many bedrooms do you need?", [
      { label: "1", value: "1 bedroom" }, { label: "2", value: "2 bedrooms" }, { label: "3+", value: "3 bedrooms" },
    ]);
    if (c.pets == null) return q("pets", "Any pets coming with you?", [
      { label: "Yes, a dog", value: "yes, I have a dog" }, { label: "Yes, a cat", value: "yes, I have a cat" }, { label: "No pets", value: "no pets" },
    ]);
    if (!c.dateStart) return q("movein", "When would you like to move in?", [
      { label: "As soon as possible", value: "as soon as possible" }, { label: "Next month", value: "next month" }, { label: "Flexible", value: "flexible dates" },
    ]);
    return null;
  }

  if (intent === "buy") {
    if (c.budgetMax == null && c.budgetMin == null) return q("budget", "What's your maximum purchase budget?", [
      { label: "Up to €300k", value: "up to €300k" }, { label: "Up to €500k", value: "up to €500k" }, { label: "Up to €1M", value: "up to €1M" }, { label: "Flexible", value: "just show me everything" },
    ]);
    if (!c.propertyTypes?.length) return q("type", "Apartment, villa, townhouse, or doesn't matter?", [
      { label: "Apartment", value: "an apartment" }, { label: "Villa", value: "a villa" }, { label: "Townhouse", value: "a townhouse" }, { label: "Any", value: "doesn't matter" },
    ]);
    if (c.bedroomsMin == null) return q("bedrooms", "How many bedrooms at minimum?", [
      { label: "2", value: "2 bedrooms" }, { label: "3", value: "3 bedrooms" }, { label: "4+", value: "4 bedrooms" },
    ]);
    if (!has("purpose")) return q("purpose", "Is this to live in, a holiday home, or an investment?", [
      { label: "To live in", value: "to live in permanently" }, { label: "Holiday home", value: "a holiday home" }, { label: "Investment", value: "an investment" },
    ]);
    return null;
  }

  // stay
  if (!c.dateStart) return q("dates", "When are you planning to stay? Dates like \"3 to 8 November\" work.");
  if (c.guests == null) return q("guests", "How many guests?", [
    { label: "1", value: "1 guest" }, { label: "2", value: "2 guests" }, { label: "3", value: "3 guests" }, { label: "4+", value: "4 guests" },
  ]);
  if (c.budgetMax == null) return q("budget", "What's your budget per month for the stay?", [
    { label: "Up to €1,000", value: "up to €1,000" }, { label: "Up to €2,000", value: "up to €2,000" }, { label: "Flexible", value: "just show me everything" },
  ]);
  return null;
}

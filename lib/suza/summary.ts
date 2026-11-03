import type { Listing } from "../../types";
import type { SearchResult } from "../../types/search";

function spokenPrice(l: Listing): string | null {
  if (l.mode === "buy" && l.price_sale) return `€${l.price_sale.toLocaleString("en-GB")}`;
  if (l.price_monthly) return `€${l.price_monthly.toLocaleString("en-GB")} a month`;
  return null;
}

/**
 * What Suza says when a guided search is finished: how many homes, where,
 * the nearest one, and any caveat the list itself shows (widened area,
 * demo listings). Plain sentences, because it is spoken aloud.
 */
export function describeResults(result: SearchResult | null, placeLabel: string | undefined): { text: string; empty: boolean } {
  const where = placeLabel ? ` around ${placeLabel.split(",")[0]}` : "";
  const items = result?.items ?? [];
  if (items.length === 0) {
    return {
      text: `I couldn't find an exact match${where} yet. I can widen the area, relax a filter, or look somewhere else. What would you like?`,
      empty: true,
    };
  }
  const n = items.length;
  const first = items[0].listing;
  const price = spokenPrice(first);
  const parts = [`I found ${n === 1 ? "one home" : `${n} homes`}${where}.`];
  if (result?.widenedKm) {
    parts.push(
      n === 1
        ? `Nothing matched inside the town itself, so it's within ${result.widenedKm} kilometres.`
        : `Nothing matched inside the town itself, so these are within ${result.widenedKm} kilometres, nearest first.`
    );
  }
  parts.push(`${n === 1 ? "It's" : "The first is"} ${first.title}${price ? `, ${price}` : ""}.`);
  if (result?.includesDemo) parts.push(n === 1 ? "It's a demo listing while the catalogue grows." : "Some of these are demo listings while the catalogue grows.");
  parts.push("Tap any home to see it, or just tell me what to change.");
  return { text: parts.join(" "), empty: false };
}

/** Waits for the search the last actions triggered to settle (debounce + fetch), up to a limit. */
export async function waitForSearch(isSearching: () => boolean, maxMs = 10_000): Promise<void> {
  await new Promise((r) => setTimeout(r, 900));
  const start = Date.now();
  while (isSearching() && Date.now() - start < maxMs) {
    await new Promise((r) => setTimeout(r, 150));
  }
}

import type { Listing } from "../../types";

/** Deterministic pseudo-random in [0, 1) from a string — keeps mock ratings stable between renders. */
function hash01(input: string) {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 1000) / 1000;
}

export function ratingFor(listing: Listing) {
  const base = 4.6 + hash01(listing.id) * 0.39; // 4.60 – 4.99
  return Math.round(base * 100) / 100;
}

export function reviewCountFor(listing: Listing) {
  return 8 + Math.floor(hash01(listing.id + "reviews") * 180);
}

export function isGuestFavourite(listing: Listing) {
  return listing.verified_property && ratingFor(listing) >= 4.85;
}

export function formatRating(listing: Listing) {
  return ratingFor(listing).toFixed(2);
}

export const propertyTypeLabel: Record<Listing["property_type"], string> = {
  apartment: "Apartment",
  villa: "Villa",
  townhouse: "Townhouse",
  studio: "Studio",
  loft: "Loft",
  house: "House",
};

export const modeLabel: Record<Listing["mode"], string> = {
  rent: "Rent",
  buy: "Buy",
  stay: "Stay",
  live: "Live",
};

/** "Apartment in Marbella" — Airbnb's card headline. */
export function headlineFor(listing: Listing) {
  return `${propertyTypeLabel[listing.property_type]} in ${listing.city}`;
}

export function isSale(listing: Listing) {
  return listing.mode === "buy";
}

export function priceNumber(listing: Listing) {
  return isSale(listing) ? listing.price_sale ?? 0 : listing.price_monthly ?? 0;
}

export function formatMoney(value: number) {
  return `€${value.toLocaleString("en-GB")}`;
}

/** { amount: "€1,200", unit: "month" } — rendered bold + regular like Airbnb's "€120 night". */
export function priceParts(listing: Listing) {
  return {
    amount: formatMoney(priceNumber(listing)),
    unit: isSale(listing) ? "" : "month",
  };
}

export function priceLine(listing: Listing) {
  const { amount, unit } = priceParts(listing);
  return unit ? `${amount} ${unit}` : amount;
}

/** "2 bedrooms · 2 baths · 88 m²" */
export function specsLine(listing: Listing) {
  return [
    `${listing.bedrooms} ${listing.bedrooms === 1 ? "bedroom" : "bedrooms"}`,
    `${listing.bathrooms} ${listing.bathrooms === 1 ? "bath" : "baths"}`,
    `${listing.size_m2} m²`,
  ].join(" · ");
}

/** "2026-08-01" → "1 Aug 2026"; anything unparsable is returned as-is. */
export function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function highlightFor(listing: Listing) {
  if (listing.sea_view) return "Sea view";
  if (listing.pool) return "Pool";
  if (listing.garage) return "Garage";
  if (listing.furnished) return "Furnished";
  return listing.address_area;
}

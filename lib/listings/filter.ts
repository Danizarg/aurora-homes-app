import type { Listing, ListingMode } from "../../types";
import { priceNumber } from "./presentation";

export interface FiltersState {
  bedroomsMin: number;
  bathroomsMin: number;
  pool: boolean;
  seaView: boolean;
  garage: boolean;
  petsAllowed: boolean;
  furnished: boolean;
  verifiedOnly: boolean;
  directOwner: boolean;
  propertyType?: Listing["property_type"];
  /** Upper price bound in € (monthly for rentals, total for sales). */
  priceMax?: number;
}

export const defaultFilters: FiltersState = {
  bedroomsMin: 0,
  bathroomsMin: 0,
  pool: false,
  seaView: false,
  garage: false,
  petsAllowed: false,
  furnished: false,
  verifiedOnly: false,
  directOwner: false,
};

export type SortOrder = "recommended" | "price_asc" | "price_desc";

export const sortLabels: Record<SortOrder, string> = {
  recommended: "Recommended",
  price_asc: "Price: low to high",
  price_desc: "Price: high to low",
};

export function countActiveFilters(f: FiltersState) {
  let n = 0;
  if (f.bedroomsMin > 0) n++;
  if (f.bathroomsMin > 0) n++;
  for (const key of ["pool", "seaView", "garage", "petsAllowed", "furnished", "verifiedOnly", "directOwner"] as const) {
    if (f[key]) n++;
  }
  if (f.propertyType) n++;
  if (f.priceMax) n++;
  return n;
}

interface ApplyOptions {
  mode?: ListingMode | "all";
  query?: string;
  filters: FiltersState;
  sort?: SortOrder;
}

export function applyFilters(listings: Listing[], { mode = "all", query = "", filters, sort = "recommended" }: ApplyOptions) {
  let list = listings;
  if (mode !== "all") list = list.filter((l) => l.mode === mode);

  const q = query.trim().toLowerCase();
  if (q) {
    list = list.filter(
      (l) =>
        l.city.toLowerCase().includes(q) ||
        l.title.toLowerCase().includes(q) ||
        l.address_area.toLowerCase().includes(q) ||
        l.country.toLowerCase().includes(q)
    );
  }

  if (filters.bedroomsMin > 0) list = list.filter((l) => l.bedrooms >= filters.bedroomsMin);
  if (filters.bathroomsMin > 0) list = list.filter((l) => l.bathrooms >= filters.bathroomsMin);
  if (filters.pool) list = list.filter((l) => l.pool);
  if (filters.seaView) list = list.filter((l) => l.sea_view);
  if (filters.garage) list = list.filter((l) => l.garage);
  if (filters.petsAllowed) list = list.filter((l) => l.pets_allowed);
  if (filters.furnished) list = list.filter((l) => l.furnished);
  if (filters.verifiedOnly) list = list.filter((l) => l.verified_property);
  if (filters.directOwner) list = list.filter((l) => l.verified_owner);
  if (filters.propertyType) list = list.filter((l) => l.property_type === filters.propertyType);
  if (filters.priceMax) list = list.filter((l) => priceNumber(l) <= filters.priceMax!);

  if (sort === "price_asc") list = [...list].sort((a, b) => priceNumber(a) - priceNumber(b));
  else if (sort === "price_desc") list = [...list].sort((a, b) => priceNumber(b) - priceNumber(a));

  return list;
}

/** Price presets shown in the search modal and filters sheet. */
export function pricePresets(mode: ListingMode | "all") {
  if (mode === "buy") {
    return [
      { label: "Any price", value: undefined },
      { label: "Up to €300k", value: 300_000 },
      { label: "Up to €500k", value: 500_000 },
      { label: "Up to €1M", value: 1_000_000 },
    ];
  }
  return [
    { label: "Any price", value: undefined },
    { label: "Up to €1,000", value: 1_000 },
    { label: "Up to €1,500", value: 1_500 },
    { label: "Up to €2,500", value: 2_500 },
  ];
}

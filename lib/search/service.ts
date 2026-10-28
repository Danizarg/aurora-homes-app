import type { Listing, ListingMode } from "../../types";
import type { Distances, ProximityKind, ScoredListing, SearchCriteria, SearchResult } from "../../types/search";
import { mockListings } from "../mock/listings";
import { getStoredListings } from "../mock/storage";
import { isSupabaseConfigured } from "../supabase/client";
import { fetchPublishedListings } from "../supabase/listings";
import { coordsFor } from "../geo/cities";
import { boundsAround, boundsContain } from "../geo/bounds";

/** Radius used when a named destination has no matches at all. */
const WIDEN_KM = 80;
import { distanceTo, mapLimit } from "../geo/proximity";
import { priceNumber } from "../listings/presentation";

/**
 * The one property search. Map mode, list mode and Suza all call this with
 * the same SearchCriteria, so they can never disagree. Sources: the demo
 * catalogue (flagged `demo`), listings published on this device, and
 * Supabase when configured. Attribute filters run locally; distance
 * constraints then run against real geographic lookups (see proximity.ts).
 */

const modesForIntent: Record<NonNullable<SearchCriteria["intent"]>, ListingMode[]> = {
  buy: ["buy"],
  rent: ["rent", "live"],
  stay: ["stay"],
};

let remoteCache: { at: number; listings: Listing[] } | null = null;
const REMOTE_TTL_MS = 60_000;

async function allSources(): Promise<{ listing: Listing; demo: boolean }[]> {
  const stored = await getStoredListings();
  let remote: Listing[] = [];
  if (isSupabaseConfigured) {
    if (remoteCache && Date.now() - remoteCache.at < REMOTE_TTL_MS) remote = remoteCache.listings;
    else {
      remote = await fetchPublishedListings();
      remoteCache = { at: Date.now(), listings: remote };
    }
  }
  const seen = new Set<string>();
  const out: { listing: Listing; demo: boolean }[] = [];
  for (const l of [...remote, ...stored]) {
    if (seen.has(l.id)) continue;
    seen.add(l.id);
    out.push({ listing: l, demo: false });
  }
  for (const l of mockListings) {
    if (seen.has(l.id)) continue;
    seen.add(l.id);
    out.push({ listing: l, demo: true });
  }
  return out;
}

export function invalidateRemoteListings() {
  remoteCache = null;
}

/** Listings that have their own coordinates (never the city fallback) — the only ones the map may pin. */
export function hasOwnCoordinates(l: Listing) {
  return typeof l.lat === "number" && typeof l.lng === "number";
}

function matchesAttributes(l: Listing, c: SearchCriteria) {
  if (c.intent && !modesForIntent[c.intent].includes(l.mode)) return false;
  if (c.propertyTypes?.length && !c.propertyTypes.includes(l.property_type)) return false;
  const price = priceNumber(l);
  if (c.budgetMax != null && price > c.budgetMax) return false;
  if (c.budgetMin != null && price < c.budgetMin) return false;
  if (c.bedroomsMin != null && l.bedrooms < c.bedroomsMin) return false;
  if (c.bathroomsMin != null && l.bathrooms < c.bathroomsMin) return false;
  if (c.areaMin != null && l.size_m2 < c.areaMin) return false;
  if (c.areaMax != null && l.size_m2 > c.areaMax) return false;
  if (c.pool && !l.pool) return false;
  if (c.garage && !l.garage) return false;
  if (c.furnished && !l.furnished) return false;
  if (c.seaView && !l.sea_view) return false;
  if (c.pets && !l.pets_allowed) return false;
  if (c.verifiedOnly && !l.verified_property) return false;
  if (c.rentalDuration === "short" && l.mode !== "stay") return false;
  if (c.rentalDuration === "long" && l.mode === "stay") return false;
  if (c.queryText?.trim()) {
    const q = c.queryText.trim().toLowerCase();
    const hay = `${l.title} ${l.address_area} ${l.city} ${l.country} ${l.description}`.toLowerCase();
    if (!hay.includes(q)) return false;
  }
  return true;
}

function matchesGeography(l: Listing, c: SearchCriteria) {
  const point = coordsFor(l);
  if (c.bounds && !boundsContain(c.bounds, point)) return false;
  if (c.target && !c.bounds) {
    // A named destination without a viewport: use its box, padded a little so
    // homes just outside a tight extent still count.
    const b = c.target.bounds;
    const padLat = (b.north - b.south) * 0.25;
    const padLng = (b.east - b.west) * 0.25;
    if (!boundsContain({ north: b.north + padLat, south: b.south - padLat, east: b.east + padLng, west: b.west - padLng }, point)) {
      // Fall back to a name match so a listing whose coordinates are the city centre still appears.
      const label = c.target.label.toLowerCase();
      if (!label.includes(l.city.toLowerCase()) && !label.includes(l.address_area.toLowerCase())) return false;
    }
  }
  return true;
}

function sortItems(items: ScoredListing[], c: SearchCriteria) {
  if (c.sort === "price_asc") items.sort((a, b) => priceNumber(a.listing) - priceNumber(b.listing));
  else if (c.sort === "price_desc") items.sort((a, b) => priceNumber(b.listing) - priceNumber(a.listing));
  else if (c.target) {
    const t = c.target.point;
    items.sort((a, b) => dist2(coordsFor(a.listing), t) - dist2(coordsFor(b.listing), t));
  }
  return items;
}

function dist2(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  return (a.lat - b.lat) ** 2 + (a.lng - b.lng) ** 2;
}

export interface SearchOptions {
  signal?: AbortSignal;
  /** Called as distances resolve so the UI can show partial results early. */
  onProgress?: (partial: SearchResult) => void;
}

export async function searchListings(criteria: SearchCriteria, options: SearchOptions = {}): Promise<SearchResult> {
  const sources = await allSources();
  if (options.signal?.aborted) throw new DOMException("aborted", "AbortError");

  let matched = sources.filter(({ listing }) => matchesAttributes(listing, criteria) && matchesGeography(listing, criteria));
  let widenedKm: number | undefined;
  if (matched.length === 0 && criteria.target && !criteria.bounds) {
    // Nothing inside the named place: look around it (real distance, sorted nearest first) and say so.
    const around = boundsAround(criteria.target.point, WIDEN_KM);
    matched = sources.filter(({ listing }) => matchesAttributes(listing, criteria) && boundsContain(around, coordsFor(listing)));
    if (matched.length > 0) widenedKm = WIDEN_KM;
  }
  const base: ScoredListing[] = matched.map(({ listing, demo }) => ({ listing, demo, distances: {} }));

  const constraints = criteria.distance ?? [];
  if (constraints.length === 0) {
    const items = sortItems(base, criteria);
    return { items, matchedBeforeDistance: items.length, unknownDistance: 0, includesDemo: items.some((i) => i.demo), widenedKm };
  }

  // Distance pass: real lookups, limited concurrency, cached per coordinate.
  let unknown = 0;
  const kept: ScoredListing[] = [];
  await mapLimit(base, 3, async (item) => {
    const distances: Distances = {};
    let ok = true;
    let anyUnknown = false;
    for (const constraint of constraints) {
      if (options.signal?.aborted) return;
      const anchor = constraint.point ?? criteria.target?.point;
      const km = await distanceTo(coordsFor(item.listing), constraint.to as ProximityKind, anchor);
      distances[constraint.to] = km;
      if (km === null) anyUnknown = true;
      else if (km > constraint.maxKm) ok = false;
    }
    if (!ok) return;
    if (anyUnknown) {
      unknown++;
      return;
    }
    kept.push({ ...item, distances });
    options.onProgress?.({
      items: sortItems([...kept], criteria),
      matchedBeforeDistance: base.length,
      unknownDistance: unknown,
      includesDemo: kept.some((i) => i.demo),
    });
  });
  if (options.signal?.aborted) throw new DOMException("aborted", "AbortError");

  const items = sortItems(kept, criteria);
  return { items, matchedBeforeDistance: base.length, unknownDistance: unknown, includesDemo: items.some((i) => i.demo), widenedKm };
}

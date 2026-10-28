import type { GeoBounds, SearchTarget } from "../../types/search";
import { lookupCoords } from "./cities";
import { boundsAround } from "./bounds";

/**
 * Forward geocoding through komoot's Photon (OpenStreetMap data, no key,
 * worldwide). When the network is down the small local city table in
 * lib/geo/cities.ts answers instead and the result is marked `source:
 * "local"` so the UI can say so. Nothing here is ever invented.
 */

const PHOTON = "https://photon.komoot.io/api/";
const TIMEOUT_MS = 8_000;

interface PhotonFeature {
  geometry: { coordinates: [number, number] };
  properties: {
    name?: string;
    city?: string;
    state?: string;
    country?: string;
    countrycode?: string;
    osm_key?: string;
    osm_value?: string;
    type?: string;
    extent?: [number, number, number, number]; // minLon, maxLat, maxLon, minLat
  };
}

/** Half-size in km of the box we show when the geocoder gives no extent. */
function defaultHalfSizeKm(kind: string) {
  switch (kind) {
    case "country":
      return 400;
    case "state":
    case "region":
      return 120;
    case "city":
      return 8;
    case "district":
    case "suburb":
    case "locality":
    case "neighbourhood":
    case "village":
      return 2.5;
    case "street":
    case "house":
    case "address":
      return 0.6;
    default:
      return 3;
  }
}

function kindOf(p: PhotonFeature["properties"]) {
  if (p.type && p.type !== "other") return p.type;
  if (p.osm_key === "place" && p.osm_value) return p.osm_value;
  if (p.osm_key === "boundary") return "region";
  if (p.osm_key === "highway") return "street";
  if (p.osm_key && p.osm_key !== "place") return "poi";
  return "place";
}

function labelOf(p: PhotonFeature["properties"]) {
  const parts = [p.name, p.city && p.city !== p.name ? p.city : undefined, p.state, p.country].filter(Boolean);
  return [...new Set(parts)].slice(0, 3).join(", ");
}

function toTarget(f: PhotonFeature): SearchTarget {
  const [lng, lat] = f.geometry.coordinates;
  const kind = kindOf(f.properties);
  let bounds: GeoBounds;
  if (f.properties.extent) {
    const [minLon, maxLat, maxLon, minLat] = f.properties.extent;
    bounds = { north: maxLat, south: minLat, east: maxLon, west: minLon };
  } else {
    bounds = boundsAround({ lat, lng }, defaultHalfSizeKm(kind));
  }
  return { label: labelOf(f.properties), point: { lat, lng }, bounds, kind, source: "photon" };
}

async function fetchJson<T>(url: string): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { headers: { accept: "application/json" }, signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

/** Suggestions while typing. Empty array when nothing matched; throws only on network failure. */
export async function suggestPlaces(query: string, limit = 6, bias?: { lat: number; lng: number }): Promise<SearchTarget[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const biasParam = bias ? `&lat=${bias.lat}&lon=${bias.lng}&location_bias_scale=0.4` : "";
  const json = await fetchJson<{ features?: PhotonFeature[] }>(`${PHOTON}?q=${encodeURIComponent(q)}&limit=${limit}&lang=en${biasParam}`);
  const seen = new Set<string>();
  const out: SearchTarget[] = [];
  for (const f of json.features ?? []) {
    const t = toTarget(f);
    const key = `${t.label}|${t.point.lat.toFixed(2)},${t.point.lng.toFixed(2)}`;
    if (seen.has(key) || !t.label) continue;
    seen.add(key);
    out.push(t);
  }
  return out;
}

function localTarget(query: string): SearchTarget | null {
  const q = query.trim();
  const point = lookupCoords(q, q);
  if (!point) return null;
  return { label: q.replace(/\b\w/g, (c) => c.toUpperCase()), point, bounds: boundsAround(point, 8), kind: "city", source: "local" };
}

/**
 * Resolve a place name to one target. Tries Photon, then the local table.
 * Returns null when nothing is known, never a guess.
 */
export async function geocode(query: string): Promise<SearchTarget | null> {
  const q = query.trim();
  if (!q) return null;
  try {
    const [best] = await suggestPlaces(q, 1);
    if (best) return best;
  } catch {
    // offline: fall through to the local table
  }
  return localTarget(q);
}

/** The city/area a point is in, for labels like "near you in Marbella". */
export async function reverseGeocode(point: { lat: number; lng: number }): Promise<{ city?: string; country?: string } | null> {
  try {
    const json = await fetchJson<{ features?: PhotonFeature[] }>(`https://photon.komoot.io/reverse?lat=${point.lat}&lon=${point.lng}&lang=en&limit=1`);
    const p = json.features?.[0]?.properties;
    if (!p) return null;
    return { city: p.city ?? p.name, country: p.country };
  } catch {
    return null;
  }
}

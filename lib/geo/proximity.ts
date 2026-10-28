import AsyncStorage from "@react-native-async-storage/async-storage";
import type { GeoPoint, ProximityKind } from "../../types/search";
import { distanceKm } from "./distance";
import { nearestAirport } from "./airports";
import { fetchNearbyPlaces, type PlaceCategory } from "./places";

/**
 * Real distances from a listing to the things people ask for. Coast and
 * amenities come from OpenStreetMap through Photon (see places.ts); the
 * airport from the bundled table. Every answer is a straight-line distance
 * in km, cached for a week per rounded coordinate. `null` means "unknown"
 * (nothing mapped within the search radius, or offline) — callers must
 * never treat unknown as "far" or "near".
 */

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const memory = new Map<string, number | null>();

function keyFor(point: GeoPoint, kind: string) {
  return `zouza.prox.${kind}.${point.lat.toFixed(3)},${point.lng.toFixed(3)}`;
}

async function cached(point: GeoPoint, kind: string, compute: () => Promise<number | null>): Promise<number | null> {
  const key = keyFor(point, kind);
  if (memory.has(key)) return memory.get(key)!;
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw) as { at: number; km: number | null };
      if (Date.now() - parsed.at < CACHE_TTL_MS) {
        memory.set(key, parsed.km);
        return parsed.km;
      }
    }
  } catch {
    // ignore cache errors
  }
  const km = await compute();
  memory.set(key, km);
  AsyncStorage.setItem(key, JSON.stringify({ at: Date.now(), km })).catch(() => {});
  return km;
}

interface PhotonFeature {
  geometry: { coordinates: [number, number] };
}

/** Nearest coastline or beach node within 8 km, from OpenStreetMap via Photon. */
async function coastKm(point: GeoPoint): Promise<number | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8_000);
  try {
    const url = `https://photon.komoot.io/reverse?lat=${point.lat}&lon=${point.lng}&radius=8&limit=30&osm_tag=natural:beach&osm_tag=natural:coastline`;
    const res = await fetch(url, { headers: { accept: "application/json" }, signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = (await res.json()) as { features?: PhotonFeature[] };
    let best: number | null = null;
    for (const f of json.features ?? []) {
      const [lng, lat] = f.geometry.coordinates;
      const km = distanceKm(point, { lat, lng });
      if (best === null || km < best) best = km;
    }
    return best; // null when nothing coastal is mapped within 8 km
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

const categoryFor: Partial<Record<ProximityKind, PlaceCategory>> = {
  school: "education",
  supermarket: "supermarket",
  gym: "leisure",
  restaurants: "food",
  transport: "transport",
  hospital: "health",
  beach: "beach",
};

async function nearestPlaceKm(point: GeoPoint, category: PlaceCategory): Promise<number | null> {
  try {
    const places = await fetchNearbyPlaces(point);
    const hits = places.filter((p) => p.category === category);
    if (hits.length === 0) return null;
    return Math.min(...hits.map((p) => p.km));
  } catch {
    return null;
  }
}

export async function distanceTo(point: GeoPoint, kind: ProximityKind, anchor?: GeoPoint): Promise<number | null> {
  switch (kind) {
    case "sea":
      return cached(point, "sea", () => coastKm(point));
    case "beach":
      return cached(point, "beach", async () => (await nearestPlaceKm(point, "beach")) ?? coastKm(point));
    case "airport":
      return nearestAirport(point).km;
    case "center":
    case "place":
      return anchor ? distanceKm(point, anchor) : null;
    default: {
      const category = categoryFor[kind];
      if (!category) return null;
      return cached(point, kind, () => nearestPlaceKm(point, category));
    }
  }
}

/** Run async work with at most `limit` in flight (Photon is a shared free service). */
export async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

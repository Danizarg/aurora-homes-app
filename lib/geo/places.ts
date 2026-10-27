import AsyncStorage from "@react-native-async-storage/async-storage";
import { distanceKm, type GeoPoint } from "./distance";

export type PlaceCategory =
  | "supermarket"
  | "shopping"
  | "food"
  | "health"
  | "transport"
  | "beach"
  | "education"
  | "leisure";

export interface NearbyPlace {
  id: string;
  name: string;
  category: PlaceCategory;
  km: number;
  point: GeoPoint;
}

export const categoryLabel: Record<PlaceCategory, string> = {
  supermarket: "Supermarkets",
  shopping: "Shops",
  food: "Cafés & restaurants",
  health: "Pharmacies & health",
  transport: "Transport",
  beach: "Beaches",
  education: "Schools",
  leisure: "Parks & gyms",
};

const USER_AGENT = "Zouza/1.0 (https://zouza.ai)";
const TIMEOUT_MS = 10_000;
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const PER_CATEGORY = 4;
/** Bus stops are everywhere; cap them so transport doesn't crowd the list. */
const PER_CATEGORY_TRANSPORT = 3;

// ------------------------------------------------------------ classification

function categorise(key: string | undefined, value: string | undefined): PlaceCategory | null {
  if (key === "shop") {
    if (value === "supermarket" || value === "convenience" || value === "greengrocer") return "supermarket";
    if (value === "mall" || value === "department_store" || value === "bakery" || value === "clothes") return "shopping";
    return null;
  }
  if (key === "amenity") {
    if (value === "restaurant" || value === "cafe" || value === "bar" || value === "fast_food") return "food";
    if (value === "pharmacy" || value === "hospital" || value === "clinic" || value === "doctors") return "health";
    if (value === "school" || value === "kindergarten" || value === "university") return "education";
    if (value === "bus_station") return "transport";
    return null;
  }
  if (key === "highway" && value === "bus_stop") return "transport";
  if (key === "railway" && (value === "station" || value === "halt")) return "transport";
  if (key === "public_transport" && value === "station") return "transport";
  if (key === "natural" && value === "beach") return "beach";
  if (key === "leisure" && (value === "park" || value === "fitness_centre" || value === "sports_centre")) return "leisure";
  return null;
}

function defaultName(category: PlaceCategory, key?: string, value?: string) {
  if (key === "highway") return "Bus stop";
  if (key === "railway") return "Train station";
  if (value === "beach") return "Beach";
  if (value === "park") return "Park";
  return categoryLabel[category].replace(/s$/, "");
}

async function fetchJson<T>(url: string, init: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...init, headers: { accept: "application/json", "user-agent": USER_AGENT, ...(init.headers ?? {}) }, signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

// ------------------------------------------------------------ Photon (primary)
// komoot's Photon: OpenStreetMap data, no key, answers a radius-bounded
// reverse lookup with tag filters in ~200 ms. Three requests keep the mix
// balanced (daily needs / food / transport & leisure).

interface PhotonFeature {
  geometry: { coordinates: [number, number] };
  properties: { osm_id?: number; osm_type?: string; osm_key?: string; osm_value?: string; name?: string };
}

const photonGroups: { tags: string[]; radiusKm: number; limit: number }[] = [
  { tags: ["shop:supermarket", "shop:convenience", "shop:greengrocer", "shop:bakery", "shop:mall", "shop:department_store", "amenity:pharmacy", "amenity:hospital", "amenity:clinic", "amenity:school"], radiusKm: 1.5, limit: 30 },
  { tags: ["amenity:restaurant", "amenity:cafe", "amenity:bar"], radiusKm: 1.2, limit: 15 },
  { tags: ["highway:bus_stop", "railway:station", "amenity:bus_station", "natural:beach", "leisure:park", "leisure:fitness_centre", "leisure:sports_centre"], radiusKm: 3, limit: 30 },
];

async function fromPhoton(point: GeoPoint): Promise<NearbyPlace[]> {
  const results = await Promise.allSettled(
    photonGroups.map((g) => {
      const tags = g.tags.map((t) => `osm_tag=${encodeURIComponent(t)}`).join("&");
      const url = `https://photon.komoot.io/reverse?lat=${point.lat}&lon=${point.lng}&radius=${g.radiusKm}&limit=${g.limit}&${tags}`;
      return fetchJson<{ features?: PhotonFeature[] }>(url);
    })
  );
  const fulfilled = results.filter((r): r is PromiseFulfilledResult<{ features?: PhotonFeature[] }> => r.status === "fulfilled");
  if (fulfilled.length === 0) throw new Error("Photon unavailable");

  const places: NearbyPlace[] = [];
  for (const r of fulfilled) {
    for (const f of r.value.features ?? []) {
      const { osm_key, osm_value, name, osm_id, osm_type } = f.properties;
      const category = categorise(osm_key, osm_value);
      if (!category) continue;
      const [lng, lat] = f.geometry.coordinates;
      places.push({
        id: `${osm_type ?? "x"}/${osm_id ?? `${lat},${lng}`}`,
        name: name ?? defaultName(category, osm_key, osm_value),
        category,
        point: { lat, lng },
        km: distanceKm(point, { lat, lng }),
      });
    }
  }
  return places;
}

// ------------------------------------------------------------ Overpass (fallback)

interface OverpassElement {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://lz4.overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

function overpassQuery({ lat, lng }: GeoPoint) {
  const near = (m: number) => `(around:${m},${lat},${lng})`;
  return `[out:json][timeout:10];
(
  node["shop"~"^(supermarket|convenience|greengrocer|mall|department_store|bakery)$"]${near(1500)};
  node["amenity"~"^(restaurant|cafe|bar|pharmacy|hospital|clinic|school|university)$"]${near(1200)};
  node["highway"="bus_stop"]${near(700)};
  node["railway"~"^(station|halt)$"]${near(3000)};
  node["natural"="beach"]${near(3000)};
  way["natural"="beach"]${near(3000)};
  way["leisure"="park"]${near(1200)};
);
out center 80;`;
}

async function fromOverpass(point: GeoPoint): Promise<NearbyPlace[]> {
  const query = overpassQuery(point);
  let elements: OverpassElement[] | null = null;
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const json = await fetchJson<{ elements?: OverpassElement[] }>(endpoint, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: `data=${encodeURIComponent(query)}`,
      });
      elements = json.elements ?? [];
      break;
    } catch {
      // next mirror
    }
  }
  if (!elements) throw new Error("Overpass unavailable");

  return elements
    .map((el) => {
      const tags = el.tags ?? {};
      const entry = Object.entries(tags).find(([k, v]) => categorise(k, v));
      const lat = el.lat ?? el.center?.lat;
      const lon = el.lon ?? el.center?.lon;
      if (!entry || lat == null || lon == null) return null;
      const category = categorise(entry[0], entry[1])!;
      return {
        id: `${el.type}/${el.id}`,
        name: tags.name ?? tags["name:en"] ?? defaultName(category, entry[0], entry[1]),
        category,
        point: { lat, lng: lon },
        km: distanceKm(point, { lat, lng: lon }),
      };
    })
    .filter((p): p is NearbyPlace => !!p);
}

// ------------------------------------------------------------ merge + cache

function tidy(places: NearbyPlace[]): NearbyPlace[] {
  const perCategory = new Map<PlaceCategory, number>();
  const seen = new Set<string>();
  const out: NearbyPlace[] = [];
  for (const p of [...places].sort((a, b) => a.km - b.km)) {
    const key = `${p.category}:${p.name.toLowerCase()}`;
    if (seen.has(key)) continue;
    const cap = p.category === "transport" ? PER_CATEGORY_TRANSPORT : PER_CATEGORY;
    const count = perCategory.get(p.category) ?? 0;
    if (count >= cap) continue;
    perCategory.set(p.category, count + 1);
    seen.add(key);
    out.push(p);
  }
  return out;
}

const memory = new Map<string, NearbyPlace[]>();

function cacheKey(point: GeoPoint) {
  return `zouza.places.${point.lat.toFixed(4)},${point.lng.toFixed(4)}`;
}

async function readCache(key: string): Promise<NearbyPlace[] | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { at: number; places: NearbyPlace[] };
    return Date.now() - parsed.at < CACHE_TTL_MS ? parsed.places : null;
  } catch {
    return null;
  }
}

async function writeCache(key: string, places: NearbyPlace[]) {
  try {
    await AsyncStorage.setItem(key, JSON.stringify({ at: Date.now(), places }));
  } catch {
    // cache is best-effort
  }
}

/**
 * Places around a point: supermarkets, shops, cafés, pharmacies, schools,
 * transport, beaches, parks. Photon first, Overpass as a fallback, and a
 * week-long on-device cache so a listing opened once works instantly and
 * offline. Throws only when every source fails so the UI can offer a retry.
 */
export async function fetchNearbyPlaces(point: GeoPoint): Promise<NearbyPlace[]> {
  const key = cacheKey(point);
  const inMemory = memory.get(key);
  if (inMemory) return inMemory;

  const cached = await readCache(key);
  if (cached) {
    memory.set(key, cached);
    return cached;
  }

  let places: NearbyPlace[] | null = null;
  try {
    places = await fromPhoton(point);
  } catch {
    try {
      places = await fromOverpass(point);
    } catch {
      places = null;
    }
  }
  if (!places) throw new Error("Nearby places couldn’t be loaded right now. Check your connection and try again.");

  const result = tidy(places);
  memory.set(key, result);
  void writeCache(key, result);
  return result;
}

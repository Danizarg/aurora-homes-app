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

const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://lz4.overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
];
const TIMEOUT_MS = 12_000;

interface OverpassElement {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

function categorise(tags: Record<string, string>): PlaceCategory | null {
  const shop = tags.shop;
  const amenity = tags.amenity;
  if (shop === "supermarket" || shop === "convenience" || shop === "greengrocer") return "supermarket";
  if (shop === "mall" || shop === "department_store" || shop === "bakery" || shop === "clothes") return "shopping";
  if (amenity === "restaurant" || amenity === "cafe" || amenity === "bar" || amenity === "fast_food") return "food";
  if (amenity === "pharmacy" || amenity === "hospital" || amenity === "clinic" || amenity === "doctors") return "health";
  if (tags.highway === "bus_stop" || tags.railway === "station" || tags.railway === "halt" || tags.public_transport === "station" || tags.amenity === "bus_station") return "transport";
  if (tags.natural === "beach") return "beach";
  if (amenity === "school" || amenity === "kindergarten" || amenity === "university") return "education";
  if (tags.leisure === "park" || tags.leisure === "fitness_centre" || tags.leisure === "sports_centre") return "leisure";
  return null;
}

function buildQuery({ lat, lng }: GeoPoint) {
  const near = (m: number) => `(around:${m},${lat},${lng})`;
  return `[out:json][timeout:10];
(
  node["shop"~"^(supermarket|convenience|greengrocer|mall|department_store|bakery)$"]${near(1500)};
  node["amenity"~"^(restaurant|cafe|bar|pharmacy|hospital|clinic|school|university)$"]${near(1200)};
  node["highway"="bus_stop"]${near(700)};
  node["railway"~"^(station|halt)$"]${near(3000)};
  node["amenity"="bus_station"]${near(3000)};
  node["natural"="beach"]${near(3000)};
  way["natural"="beach"]${near(3000)};
  way["leisure"="park"]${near(1200)};
  node["leisure"~"^(fitness_centre|sports_centre)$"]${near(1500)};
);
out center 80;`;
}

async function fetchOverpass(endpoint: string, query: string): Promise<OverpassElement[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
      body: `data=${encodeURIComponent(query)}`,
      signal: controller.signal,
    });
    // 429/502/504 mean the mirror is busy — a failure, not "nothing nearby".
    if (!res.ok) throw new Error(`Overpass ${res.status}`);
    const json = (await res.json()) as { elements?: OverpassElement[] };
    return json.elements ?? [];
  } finally {
    clearTimeout(timer);
  }
}

const cache = new Map<string, NearbyPlace[]>();

/**
 * Places around a point from OpenStreetMap (Overpass API — free, no key).
 * Returns a de-duplicated list sorted by distance, at most `limitPerCategory`
 * per category. Throws when every endpoint fails so the UI can show a retry.
 */
export async function fetchNearbyPlaces(point: GeoPoint, limitPerCategory = 4): Promise<NearbyPlace[]> {
  const key = `${point.lat.toFixed(4)},${point.lng.toFixed(4)}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const query = buildQuery(point);
  // A mirror that answers (even with an empty list) is the truth; one that
  // errors or times out is skipped. Only when all of them fail do we give up.
  let elements: OverpassElement[] | null = null;
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      elements = await fetchOverpass(endpoint, query);
      break;
    } catch {
      // try the next mirror
    }
  }
  if (!elements) throw new Error("Nearby places couldn’t be loaded — the map service is busy.");

  const perCategory = new Map<PlaceCategory, number>();
  const seenNames = new Set<string>();
  const places: NearbyPlace[] = [];

  const candidates = elements
    .map((el) => {
      const tags = el.tags ?? {};
      const category = categorise(tags);
      const lat = el.lat ?? el.center?.lat;
      const lon = el.lon ?? el.center?.lon;
      if (!category || lat == null || lon == null) return null;
      const name = tags.name ?? tags["name:en"] ?? defaultName(category, tags);
      return { id: `${el.type}/${el.id}`, name, category, point: { lat, lng: lon }, km: distanceKm(point, { lat, lng: lon }) };
    })
    .filter((p): p is NearbyPlace => !!p)
    .sort((a, b) => a.km - b.km);

  for (const p of candidates) {
    const nameKey = `${p.category}:${p.name.toLowerCase()}`;
    if (seenNames.has(nameKey)) continue;
    const count = perCategory.get(p.category) ?? 0;
    if (count >= limitPerCategory) continue;
    perCategory.set(p.category, count + 1);
    seenNames.add(nameKey);
    places.push(p);
  }

  cache.set(key, places);
  return places;
}

function defaultName(category: PlaceCategory, tags: Record<string, string>) {
  if (tags.highway === "bus_stop") return "Bus stop";
  if (tags.railway) return "Train station";
  if (tags.natural === "beach") return "Beach";
  if (tags.leisure === "park") return "Park";
  return categoryLabel[category].replace(/s$/, "");
}

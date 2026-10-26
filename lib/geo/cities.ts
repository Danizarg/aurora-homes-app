import type { Listing } from "../../types";
import type { GeoPoint } from "./distance";

/**
 * Approximate centre points for the cities and areas the catalogue uses.
 * Listings carry their own `lat`/`lng`; this is the fallback for rows that
 * predate those columns and for listings created in the app (which only
 * know the area and city the owner typed).
 */
const cities: Record<string, GeoPoint> = {
  marbella: { lat: 36.5101, lng: -4.8824 },
  sevilla: { lat: 37.3891, lng: -5.9845 },
  seville: { lat: 37.3891, lng: -5.9845 },
  valencia: { lat: 39.4699, lng: -0.3763 },
  málaga: { lat: 36.7213, lng: -4.4214 },
  malaga: { lat: 36.7213, lng: -4.4214 },
  madrid: { lat: 40.4168, lng: -3.7038 },
  barcelona: { lat: 41.3874, lng: 2.1686 },
  alicante: { lat: 38.3452, lng: -0.481 },
  granada: { lat: 37.1773, lng: -3.5986 },
  palma: { lat: 39.5696, lng: 2.6502 },
  ibiza: { lat: 38.9067, lng: 1.4206 },
  bilbao: { lat: 43.263, lng: -2.935 },
  estepona: { lat: 36.4276, lng: -5.1459 },
  benalmádena: { lat: 36.5988, lng: -4.5163 },
  fuengirola: { lat: 36.5397, lng: -4.6241 },
  torremolinos: { lat: 36.6203, lng: -4.4998 },
  nerja: { lat: 36.7447, lng: -3.8775 },
};

const areas: Record<string, GeoPoint> = {
  "golden mile": { lat: 36.5095, lng: -4.929 },
  "sierra blanca": { lat: 36.523, lng: -4.91 },
  cabopino: { lat: 36.489, lng: -4.743 },
  "santa cruz": { lat: 37.3858, lng: -5.9906 },
  malvarrosa: { lat: 39.479, lng: -0.325 },
  "cerrado de calderón": { lat: 36.715, lng: -4.365 },
  pedregalejo: { lat: 36.723, lng: -4.37 },
  chamberí: { lat: 40.435, lng: -3.704 },
  malasaña: { lat: 40.426, lng: -3.704 },
  eixample: { lat: 41.395, lng: 2.162 },
};

function norm(value: string) {
  return value.trim().toLowerCase();
}

/** Coordinates for a typed area/city pair, or null when neither is known. */
export function lookupCoords(addressArea: string, city: string): GeoPoint | null {
  return areas[norm(addressArea)] ?? cities[norm(city)] ?? null;
}

/** Every listing gets a point: its own, else its area, else its city, else central Spain. */
export function coordsFor(listing: Pick<Listing, "lat" | "lng" | "address_area" | "city">): GeoPoint {
  if (typeof listing.lat === "number" && typeof listing.lng === "number") {
    return { lat: listing.lat, lng: listing.lng };
  }
  return lookupCoords(listing.address_area, listing.city) ?? { lat: 40.0, lng: -3.7 };
}

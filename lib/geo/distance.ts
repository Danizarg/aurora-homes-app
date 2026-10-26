export interface GeoPoint {
  lat: number;
  lng: number;
}

const EARTH_RADIUS_KM = 6371;

/** Great-circle distance in kilometres. */
export function distanceKm(a: GeoPoint, b: GeoPoint) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

export function formatDistance(km: number) {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${Math.round(km).toLocaleString("en-GB")} km`;
}

/** "about 12 min walk" / "about 2 h 10 min drive" — rough estimates from distance only. */
export function walkMinutes(km: number) {
  return Math.max(1, Math.round((km / 4.8) * 60));
}

export function driveMinutes(km: number) {
  // Door-to-door road distance runs ~25% over the straight line; average 70 km/h.
  return Math.max(5, Math.round(((km * 1.25) / 70) * 60));
}

export function flightMinutes(km: number) {
  // Cruise ~800 km/h plus ~40 min for taxi, climb and descent.
  return Math.round((km / 800) * 60 + 40);
}

export function formatMinutes(min: number) {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

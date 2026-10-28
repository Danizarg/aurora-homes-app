import type { GeoBounds, GeoPoint } from "../../types/search";

export function boundsContain(b: GeoBounds, p: GeoPoint) {
  return p.lat <= b.north && p.lat >= b.south && p.lng <= b.east && p.lng >= b.west;
}

export function boundsCenter(b: GeoBounds): GeoPoint {
  return { lat: (b.north + b.south) / 2, lng: (b.east + b.west) / 2 };
}

/** A square-ish box around a point; `km` is the half-size. */
export function boundsAround(p: GeoPoint, km: number): GeoBounds {
  const dLat = km / 111;
  const dLng = km / (111 * Math.max(0.2, Math.cos((p.lat * Math.PI) / 180)));
  return { north: p.lat + dLat, south: p.lat - dLat, east: p.lng + dLng, west: p.lng - dLng };
}

export function boundsFromPoints(points: GeoPoint[], paddingFactor = 1.25): GeoBounds | null {
  if (points.length === 0) return null;
  let north = -90, south = 90, east = -180, west = 180;
  for (const p of points) {
    north = Math.max(north, p.lat);
    south = Math.min(south, p.lat);
    east = Math.max(east, p.lng);
    west = Math.min(west, p.lng);
  }
  const padLat = Math.max(0.01, (north - south) * (paddingFactor - 1));
  const padLng = Math.max(0.01, (east - west) * (paddingFactor - 1));
  return { north: north + padLat, south: south - padLat, east: east + padLng, west: west - padLng };
}

export interface Region {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

export function regionFromBounds(b: GeoBounds): Region {
  return {
    latitude: (b.north + b.south) / 2,
    longitude: (b.east + b.west) / 2,
    latitudeDelta: Math.max(0.002, b.north - b.south),
    longitudeDelta: Math.max(0.002, b.east - b.west),
  };
}

export function boundsFromRegion(r: Region): GeoBounds {
  return {
    north: r.latitude + r.latitudeDelta / 2,
    south: r.latitude - r.latitudeDelta / 2,
    east: r.longitude + r.longitudeDelta / 2,
    west: r.longitude - r.longitudeDelta / 2,
  };
}

/** Rough zoom level (web-mercator style) for a region, used for clustering. */
export function zoomFromRegion(r: Region) {
  return Math.round(Math.log2(360 / Math.max(r.longitudeDelta, 0.0005)));
}

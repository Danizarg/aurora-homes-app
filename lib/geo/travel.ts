import { Linking, Platform } from "react-native";
import { nearestAirport } from "./airports";
import { distanceKm, driveMinutes, flightMinutes, type GeoPoint } from "./distance";

/**
 * Everything "How to get there" needs, computed from two points. Flight and
 * directions links open the traveller's usual apps (Google Flights,
 * Skyscanner, Apple/Google Maps); the app never books or sells anything.
 */
export interface TravelPlan {
  straightKm: number;
  drive: { minutes: number };
  flight: {
    from: ReturnType<typeof nearestAirport>;
    to: ReturnType<typeof nearestAirport>;
    minutes: number;
    /** False when both ends share an airport, so flying makes no sense. */
    sensible: boolean;
  };
}

export function planTravel(from: GeoPoint, to: GeoPoint): TravelPlan {
  const straightKm = distanceKm(from, to);
  const fromAirport = nearestAirport(from);
  const toAirport = nearestAirport(to);
  const airportKm = distanceKm(fromAirport.airport, toAirport.airport);
  return {
    straightKm,
    drive: { minutes: driveMinutes(straightKm) },
    flight: {
      from: fromAirport,
      to: toAirport,
      minutes: flightMinutes(airportKm),
      sensible: fromAirport.airport.iata !== toAirport.airport.iata && straightKm > 250,
    },
  };
}

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

/** Google Flights search, pre-filled with both airports and the date. */
export function googleFlightsUrl(fromIata: string, toIata: string, date?: Date) {
  const when = date ? ` on ${isoDate(date)}` : "";
  return `https://www.google.com/travel/flights?q=${encodeURIComponent(`Flights from ${fromIata} to ${toIata}${when}`)}`;
}

/** Skyscanner results page; the date path segment is yymmdd. */
export function skyscannerUrl(fromIata: string, toIata: string, date?: Date) {
  const d = date ?? new Date(Date.now() + 14 * 86_400_000);
  const yymmdd = isoDate(d).slice(2).replace(/-/g, "");
  return `https://www.skyscanner.net/transport/flights/${fromIata.toLowerCase()}/${toIata.toLowerCase()}/${yymmdd}/`;
}

export type TravelMode = "driving" | "transit" | "walking";

/** Turn-by-turn directions in the platform's maps app. */
export function directionsUrl(from: GeoPoint | null, to: GeoPoint, mode: TravelMode = "driving") {
  const dest = `${to.lat},${to.lng}`;
  if (Platform.OS === "ios") {
    const flag = mode === "transit" ? "r" : mode === "walking" ? "w" : "d";
    const origin = from ? `&saddr=${from.lat},${from.lng}` : "";
    return `maps://?daddr=${dest}${origin}&dirflg=${flag}`;
  }
  const origin = from ? `&origin=${from.lat},${from.lng}` : "";
  return `https://www.google.com/maps/dir/?api=1&destination=${dest}${origin}&travelmode=${mode}`;
}

/** Drop a pin on the area in the platform's maps app. */
export function showOnMapUrl(point: GeoPoint, label: string) {
  if (Platform.OS === "ios") return `maps://?ll=${point.lat},${point.lng}&q=${encodeURIComponent(label)}`;
  return `https://www.google.com/maps/search/?api=1&query=${point.lat},${point.lng}`;
}

export async function openUrl(url: string, fallback?: string) {
  try {
    const ok = await Linking.canOpenURL(url);
    if (ok) {
      await Linking.openURL(url);
      return;
    }
  } catch {
    // fall through to the web fallback
  }
  if (fallback) await Linking.openURL(fallback);
}

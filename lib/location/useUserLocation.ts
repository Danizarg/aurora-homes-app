import { useCallback, useEffect, useState } from "react";
import * as Location from "expo-location";
import type { GeoPoint } from "../geo/distance";

export type LocationStatus = "idle" | "asking" | "granted" | "denied" | "unavailable";

export interface UserLocation {
  point: GeoPoint | null;
  /** City-level label from reverse geocoding when available, e.g. "London". */
  label: string | null;
  status: LocationStatus;
  request: () => Promise<void>;
}

/**
 * The traveller's position, asked for only when `request()` is called (the
 * listing's "How to get there" section) — never on app start. Works in Expo
 * Go and on the web (browser geolocation).
 */
export function useUserLocation(autoRequest = false): UserLocation {
  const [point, setPoint] = useState<GeoPoint | null>(null);
  const [label, setLabel] = useState<string | null>(null);
  const [status, setStatus] = useState<LocationStatus>("idle");

  const request = useCallback(async () => {
    setStatus("asking");
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        setStatus("denied");
        return;
      }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const next = { lat: position.coords.latitude, lng: position.coords.longitude };
      setPoint(next);
      setStatus("granted");
      try {
        const [place] = await Location.reverseGeocodeAsync({ latitude: next.lat, longitude: next.lng });
        setLabel(place?.city ?? place?.region ?? place?.country ?? null);
      } catch {
        setLabel(null);
      }
    } catch {
      setStatus("unavailable");
    }
  }, []);

  useEffect(() => {
    if (autoRequest) void request();
  }, [autoRequest, request]);

  return { point, label, status, request };
}

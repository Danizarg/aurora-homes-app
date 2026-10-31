import { Platform } from "react-native";
import Constants from "expo-constants";

/**
 * Where Suza's server endpoints live. They are Expo API routes in this repo
 * (app/api/suza/*+api.ts), so:
 *  - on the web they are same-origin;
 *  - in development on a phone they are served by the dev server (LAN or tunnel),
 *    whose host expo-constants knows;
 *  - in production, EXPO_PUBLIC_SUZA_API_URL points at the deployed server
 *    (EAS Hosting or wherever `expo export --platform web` is served).
 * Keys never live in the app: the routes read them from the server's env.
 */
export function suzaApiBase(): string | null {
  const explicit = process.env.EXPO_PUBLIC_SUZA_API_URL?.replace(/\/$/, "");
  if (explicit) return explicit;
  if (Platform.OS === "web") return "";
  const host = Constants.expoConfig?.hostUri;
  if (host) return `${host.includes(":") ? "http" : "https"}://${host.replace(/\/$/, "")}`;
  return null;
}

const health = new Map<string, Promise<boolean>>();

/** True when the endpoint exists and reports it is configured (has its key). Cached per app run. */
export function suzaEndpointReady(path: string): Promise<boolean> {
  const base = suzaApiBase();
  if (base === null) return Promise.resolve(false);
  const url = `${base}${path}`;
  let p = health.get(url);
  if (!p) {
    p = (async () => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 6_000);
      try {
        const res = await fetch(url, { method: "GET", headers: { accept: "application/json" }, signal: controller.signal });
        if (!res.ok) return false;
        const json = (await res.json()) as { ok?: boolean };
        return json.ok === true;
      } catch {
        return false;
      } finally {
        clearTimeout(timer);
      }
    })();
    health.set(url, p);
    // Don't cache a failure forever: the server may come up a moment later.
    void p.then((ok) => { if (!ok) setTimeout(() => health.delete(url), 30_000); });
  }
  return p;
}

export function suzaUrl(path: string): string | null {
  const base = suzaApiBase();
  return base === null ? null : `${base}${path}`;
}

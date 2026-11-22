// Turns an email link into one outcome for app/auth/callback. The same link can arrive twice (the
// cold-start URL and the url event, or a re-render), and a refresh token can only be used once, so
// each URL is handled a single time. Pure module.
import { parseAuthUrl, type AuthUrlResult } from "./url.ts";

export type CallbackOutcome = { kind: "signedIn" } | { kind: "recovery" } | { kind: "error"; code: string };
type Complete = (r: AuthUrlResult) => Promise<{ ok: true; recovery: boolean } | { ok: false; code: string }>;

export function createCallbackHandler(complete: Complete): (url: string) => Promise<CallbackOutcome | null> {
  const handled = new Set<string>();
  return async (url) => {
    if (handled.has(url)) return null;
    const parsed = parseAuthUrl(url);
    if (parsed.kind === "none") return null;
    handled.add(url);
    const r = await complete(parsed);
    if (!r.ok) return { kind: "error", code: r.code };
    return r.recovery ? { kind: "recovery" } : { kind: "signedIn" };
  };
}

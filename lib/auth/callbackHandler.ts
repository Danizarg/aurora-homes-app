// Turns an email link into one outcome for app/auth/callback. A link that signed someone in is
// never used again (its refresh token is single-use), and a link already being handled isn't
// started twice. A link that failed may be handled again: every expired link redirects to the
// same address, and a link that hit a network error deserves a retry. Pure module.
import { parseAuthUrl, type AuthUrlResult } from "./url.ts";

export type CallbackOutcome = { kind: "signedIn" } | { kind: "recovery" } | { kind: "error"; code: string };
type Complete = (r: AuthUrlResult) => Promise<{ ok: true; recovery: boolean } | { ok: false; code: string }>;

export function createCallbackHandler(complete: Complete): (url: string) => Promise<CallbackOutcome | null> {
  const used = new Set<string>();
  const inFlight = new Set<string>();
  return async (url) => {
    if (used.has(url) || inFlight.has(url)) return null;
    const parsed = parseAuthUrl(url);
    if (parsed.kind === "none") return null;
    inFlight.add(url);
    try {
      const r = await complete(parsed);
      if (!r.ok) return { kind: "error", code: r.code };
      used.add(url);
      return r.recovery ? { kind: "recovery" } : { kind: "signedIn" };
    } finally {
      inFlight.delete(url);
    }
  };
}

// Reads the link Supabase sends people back to after they tap "Confirm email address" or
// "Reset password". With the implicit flow the tokens arrive in the #fragment, which
// expo-router drops when it routes, so callers pass the raw URL from expo-linking.
// Pure module: no runtime imports, so it runs under plain Node for tests.

export type AuthUrlResult =
  | { kind: "session"; accessToken: string; refreshToken: string; recovery: boolean }
  | { kind: "code"; code: string; recovery: boolean }
  | { kind: "error"; code: string }
  | { kind: "none" };

const CALLBACK_PATH = /(^|\/)auth\/callback\/?$/;

/** Turns a callback URL into what the app should do with it. Anything that isn't the callback is `none`. */
export function parseAuthUrl(url: string): AuthUrlResult {
  const hashAt = url.indexOf("#");
  const beforeHash = hashAt === -1 ? url : url.slice(0, hashAt);
  const fragment = hashAt === -1 ? "" : url.slice(hashAt + 1);
  const queryAt = beforeHash.indexOf("?");
  const base = queryAt === -1 ? beforeHash : beforeHash.slice(0, queryAt);
  const query = queryAt === -1 ? "" : beforeHash.slice(queryAt + 1);

  const path = base.replace(/^[a-z][a-z0-9+.-]*:\/\//i, "");
  if (!CALLBACK_PATH.test(path)) return { kind: "none" };

  // Fragment first, then the query on top: the query wins, as in supabase-js.
  const params = new Map<string, string>();
  for (const part of [fragment, query]) {
    new URLSearchParams(part).forEach((value, key) => params.set(key, value));
  }

  const errorCode = params.get("error_code") || params.get("error");
  if (errorCode) return { kind: "error", code: errorCode };

  const recovery = params.get("type") === "recovery";
  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");
  if (accessToken && refreshToken) return { kind: "session", accessToken, refreshToken, recovery };

  const code = params.get("code");
  if (code) return { kind: "code", code, recovery };

  return { kind: "none" };
}

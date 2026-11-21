import { test } from "node:test";
import assert from "node:assert/strict";
import { createAuthApi, type AuthClientLike } from "./core.ts";

type Call = { method: string; args: unknown[] };

/** A stand-in for supabase.auth that records each call and answers with a scripted reply. */
function fakeAuth(reply: (method: string) => unknown = () => ({ data: { session: null, user: null }, error: null })) {
  const calls: Call[] = [];
  const handler = (method: string) => async (...args: unknown[]) => {
    calls.push({ method, args });
    const r = reply(method);
    if (r instanceof Error) throw r;
    return r;
  };
  const auth = new Proxy({}, { get: (_t, method: string) => handler(method) }) as unknown as AuthClientLike;
  return { auth, calls };
}

const opts = { redirectUrl: () => "exp://x/--/auth/callback", termsVersion: "2026-11-21" };

test("signin_normalizes_email", async () => {
  const { auth, calls } = fakeAuth();
  await createAuthApi(auth, opts).signIn(" Ana@Mail.COM ", "pw");
  assert.deepEqual(calls[0], { method: "signInWithPassword", args: [{ email: "ana@mail.com", password: "pw" }] });
});

test("signup_sends_terms_and_redirect", async () => {
  const { auth, calls } = fakeAuth();
  await createAuthApi(auth, opts).signUp("  Ana ", "Ana@mail.com", "12345678");
  assert.deepEqual(calls[0], {
    method: "signUp",
    args: [{ email: "ana@mail.com", password: "12345678", options: { emailRedirectTo: "exp://x/--/auth/callback", data: { full_name: "Ana", terms_version: "2026-11-21" } } }],
  });
});

test("signup_with_session_is_signed_in", async () => {
  const { auth } = fakeAuth(() => ({ data: { session: { access_token: "a" }, user: { id: "u" } }, error: null }));
  assert.deepEqual(await createAuthApi(auth, opts).signUp("Ana", "a@b.co", "12345678"), { ok: true, needsConfirmation: false });
});

test("signup_existing_email_needs_confirmation", async () => {
  const { auth } = fakeAuth(() => ({ data: { session: null, user: { id: "u", identities: [] } }, error: null }));
  assert.deepEqual(await createAuthApi(auth, opts).signUp("Ana", "a@b.co", "12345678"), { ok: true, needsConfirmation: true });
});

test("reset_uses_redirectTo_not_emailRedirectTo", async () => {
  const { auth, calls } = fakeAuth(() => ({ data: {}, error: null }));
  assert.deepEqual(await createAuthApi(auth, opts).sendPasswordReset(" A@b.co"), { ok: true });
  assert.deepEqual(calls[0], { method: "resetPasswordForEmail", args: ["a@b.co", { redirectTo: "exp://x/--/auth/callback" }] });
});

test("resend_is_signup_type", async () => {
  const { auth, calls } = fakeAuth();
  await createAuthApi(auth, opts).resendConfirmation("A@b.co");
  assert.deepEqual(calls[0], { method: "resend", args: [{ type: "signup", email: "a@b.co", options: { emailRedirectTo: "exp://x/--/auth/callback" } }] });
});

test("update_password_calls_updateUser", async () => {
  const { auth, calls } = fakeAuth(() => ({ data: { user: {} }, error: null }));
  assert.deepEqual(await createAuthApi(auth, opts).updatePassword("newpass12"), { ok: true });
  assert.deepEqual(calls[0], { method: "updateUser", args: [{ password: "newpass12" }] });
});

test("signout_is_local", async () => {
  const { auth, calls } = fakeAuth(() => ({ error: null }));
  assert.deepEqual(await createAuthApi(auth, opts).signOut(), { ok: true });
  assert.deepEqual(calls[0], { method: "signOut", args: [{ scope: "local" }] });
});

test("api_error_code_passed_through", async () => {
  const { auth } = fakeAuth(() => ({ data: { session: null, user: null }, error: { code: "invalid_credentials", name: "AuthApiError", message: "Invalid login credentials" } }));
  assert.deepEqual(await createAuthApi(auth, opts).signIn("a@b.co", "x"), { ok: false, code: "invalid_credentials" });
});

test("retryable_fetch_error_is_network", async () => {
  const { auth } = fakeAuth(() => ({ data: { session: null, user: null }, error: { name: "AuthRetryableFetchError", message: "Failed to fetch" } }));
  assert.deepEqual(await createAuthApi(auth, opts).signIn("a@b.co", "x"), { ok: false, code: "network" });
});

test("error_without_code_is_unknown", async () => {
  const { auth } = fakeAuth(() => ({ data: {}, error: { name: "AuthApiError", message: "?" } }));
  assert.deepEqual(await createAuthApi(auth, opts).sendPasswordReset("a@b.co"), { ok: false, code: "unknown" });
});

test("thrown_exception_is_caught", async () => {
  const { auth } = fakeAuth(() => new TypeError("Network request failed"));
  assert.deepEqual(await createAuthApi(auth, opts).signIn("a@b.co", "x"), { ok: false, code: "unknown" });
});

test("complete_session_calls_setSession_and_reports_recovery", async () => {
  const { auth, calls } = fakeAuth(() => ({ data: { session: {} }, error: null }));
  const r = await createAuthApi(auth, opts).completeFromUrl({ kind: "session", accessToken: "a", refreshToken: "r", recovery: true });
  assert.deepEqual(r, { ok: true, recovery: true });
  assert.deepEqual(calls[0], { method: "setSession", args: [{ access_token: "a", refresh_token: "r" }] });
});

test("complete_code_exchanges", async () => {
  const { auth, calls } = fakeAuth(() => ({ data: { session: {} }, error: null }));
  assert.deepEqual(await createAuthApi(auth, opts).completeFromUrl({ kind: "code", code: "c", recovery: false }), { ok: true, recovery: false });
  assert.deepEqual(calls[0], { method: "exchangeCodeForSession", args: ["c"] });
});

test("complete_error_passes_code", async () => {
  const { auth, calls } = fakeAuth();
  assert.deepEqual(await createAuthApi(auth, opts).completeFromUrl({ kind: "error", code: "otp_expired" }), { ok: false, code: "otp_expired" });
  assert.equal(calls.length, 0);
});

test("complete_none_is_none", async () => {
  const { auth } = fakeAuth();
  assert.deepEqual(await createAuthApi(auth, opts).completeFromUrl({ kind: "none" }), { ok: false, code: "none" });
});

test("complete_session_failure_is_error", async () => {
  const { auth } = fakeAuth(() => ({ data: { session: null }, error: { code: "session_not_found", name: "AuthApiError", message: "x" } }));
  assert.deepEqual(await createAuthApi(auth, opts).completeFromUrl({ kind: "session", accessToken: "a", refreshToken: "r", recovery: false }), { ok: false, code: "session_not_found" });
});

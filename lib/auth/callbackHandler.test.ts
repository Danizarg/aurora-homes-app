import { test } from "node:test";
import assert from "node:assert/strict";
import { createCallbackHandler } from "./callbackHandler.ts";
import type { AuthUrlResult } from "./url.ts";

const SESSION = "exp://h:8081/--/auth/callback#access_token=a&refresh_token=r&type=signup";
const RECOVERY = "zouza:///auth/callback#access_token=a&refresh_token=r&type=recovery";
const EXPIRED = "zouza:///auth/callback#error=access_denied&error_code=otp_expired";

function counting(reply: (r: AuthUrlResult) => { ok: true; recovery: boolean } | { ok: false; code: string }) {
  const seen: AuthUrlResult[] = [];
  return { seen, complete: async (r: AuthUrlResult) => (seen.push(r), reply(r)) };
}

test("handler_ignores_repeat_url", async () => {
  const c = counting(() => ({ ok: true, recovery: false }));
  const handle = createCallbackHandler(c.complete);
  assert.deepEqual(await handle(SESSION), { kind: "signedIn" });
  assert.equal(await handle(SESSION), null);
  assert.equal(c.seen.length, 1);
});

test("recovery_outcome", async () => {
  const handle = createCallbackHandler(counting(() => ({ ok: true, recovery: true })).complete);
  assert.deepEqual(await handle(RECOVERY), { kind: "recovery" });
});

test("error_outcome_keeps_code", async () => {
  const c = counting((r) => (r.kind === "error" ? { ok: false, code: r.code } : { ok: true, recovery: false }));
  assert.deepEqual(await createCallbackHandler(c.complete)(EXPIRED), { kind: "error", code: "otp_expired" });
});

test("session_failure_is_error", async () => {
  const handle = createCallbackHandler(counting(() => ({ ok: false, code: "session_not_found" })).complete);
  assert.deepEqual(await handle(SESSION), { kind: "error", code: "session_not_found" });
});

test("non_auth_url_is_null", async () => {
  const c = counting(() => ({ ok: true, recovery: false }));
  assert.equal(await createCallbackHandler(c.complete)("zouza:///listing/1"), null);
  assert.equal(c.seen.length, 0);
});

test("concurrent_same_url_handled_once", async () => {
  const c = counting(() => ({ ok: true, recovery: false }));
  const handle = createCallbackHandler(c.complete);
  const [a, b] = await Promise.all([handle(SESSION), handle(SESSION)]);
  assert.deepEqual([a, b].filter(Boolean), [{ kind: "signedIn" }]);
  assert.equal(c.seen.length, 1);
});

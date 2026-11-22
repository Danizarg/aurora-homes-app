import { test } from "node:test";
import assert from "node:assert/strict";
import { createSessionSync, sessionStateFrom } from "./state.ts";

const user = { id: "u1", email: "ana@mail.com", user_metadata: { full_name: "Ana Meta" } };

test("null_session_is_signed_out", () => assert.deepEqual(sessionStateFrom(null, null), { status: "signedOut" }));
test("profile_name_wins", () =>
  assert.deepEqual(sessionStateFrom({ user }, "Ana Profile"), { status: "signedIn", userId: "u1", email: "ana@mail.com", fullName: "Ana Profile" }));
test("metadata_name_fallback", () => assert.equal((sessionStateFrom({ user }, null) as { fullName: string }).fullName, "Ana Meta"));
test("missing_email_is_empty", () =>
  assert.deepEqual(sessionStateFrom({ user: { id: "u2" } }, null), { status: "signedIn", userId: "u2", email: "", fullName: "" }));

test("apply_sets_state_synchronously", () => {
  const seen: string[] = [];
  const sync = createSessionSync((s) => seen.push(s.status), () => new Promise(() => {}));
  sync.apply({ user });
  assert.deepEqual(seen, ["signedIn"]);
});

test("profile_name_arrives_after", async () => {
  const states: unknown[] = [];
  const sync = createSessionSync((s) => states.push(s), async () => "Ana Profile");
  sync.apply({ user });
  await new Promise((r) => setTimeout(r, 0));
  assert.equal((states.at(-1) as { fullName: string }).fullName, "Ana Profile");
});

test("stale_name_ignored_after_sign_out", async () => {
  const states: { status: string }[] = [];
  let release: (n: string) => void = () => {};
  const sync = createSessionSync((s) => states.push(s), () => new Promise((r) => (release = r)));
  sync.apply({ user });
  sync.apply(null);
  release("Late Name");
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(states.at(-1)?.status, "signedOut");
});

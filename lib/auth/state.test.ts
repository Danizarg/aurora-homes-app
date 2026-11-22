import { test } from "node:test";
import assert from "node:assert/strict";
import { sessionStateFrom } from "./state.ts";

const user = { id: "u1", email: "ana@mail.com", user_metadata: { full_name: "Ana Meta" } };

test("null_session_is_signed_out", () => assert.deepEqual(sessionStateFrom(null, null), { status: "signedOut" }));
test("profile_name_wins", () =>
  assert.deepEqual(sessionStateFrom({ user }, "Ana Profile"), { status: "signedIn", userId: "u1", email: "ana@mail.com", fullName: "Ana Profile" }));
test("metadata_name_fallback", () => assert.equal((sessionStateFrom({ user }, null) as { fullName: string }).fullName, "Ana Meta"));
test("missing_email_is_empty", () =>
  assert.deepEqual(sessionStateFrom({ user: { id: "u2" } }, null), { status: "signedIn", userId: "u2", email: "", fullName: "" }));

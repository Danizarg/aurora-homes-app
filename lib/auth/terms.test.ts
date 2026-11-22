import { test } from "node:test";
import assert from "node:assert/strict";
import { TERMS_VERSION } from "./terms.ts";

test("terms_version_matches_database", () => {
  assert.equal(TERMS_VERSION, "2026-11-21");
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { authRoutesOnTop } from "./nav.ts";

test("no_auth_routes_is_zero", () => assert.equal(authRoutesOnTop(["(tabs)", "listing/[id]"]), 0));
test("counts_trailing_auth_routes", () => assert.equal(authRoutesOnTop(["(tabs)", "create-listing/index", "auth/login", "auth/signup"]), 2));
test("auth_route_below_others_not_counted", () => assert.equal(authRoutesOnTop(["auth/login", "(tabs)"]), 0));
test("all_auth_routes_counts_all", () => assert.equal(authRoutesOnTop(["auth/callback"]), 1));
test("empty_stack_is_zero", () => assert.equal(authRoutesOnTop([]), 0));

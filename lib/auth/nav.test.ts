import { test } from "node:test";
import assert from "node:assert/strict";
import { appStackRouteNames, authRoutesOnTop } from "./nav.ts";

test("no_auth_routes_is_zero", () => assert.equal(authRoutesOnTop(["(tabs)", "listing/[id]"]), 0));
test("counts_trailing_auth_routes", () => assert.equal(authRoutesOnTop(["(tabs)", "create-listing/index", "auth/login", "auth/signup"]), 2));
test("auth_route_below_others_not_counted", () => assert.equal(authRoutesOnTop(["auth/login", "(tabs)"]), 0));
test("all_auth_routes_counts_all", () => assert.equal(authRoutesOnTop(["auth/callback"]), 1));
test("empty_stack_is_zero", () => assert.equal(authRoutesOnTop([]), 0));

test("app_stack_names_inside_expo_router_root", () => {
  // Shape logged from expo-router 58 on 2026-11-22: the app's Stack lives inside a "__root" route.
  const root = {
    routes: [{ name: "__root", state: { routes: [{ name: "owner-dashboard" }, { name: "auth/login" }] } }],
  };
  assert.deepEqual(appStackRouteNames(root), ["owner-dashboard", "auth/login"]);
});

test("app_stack_names_without_wrapper", () => {
  assert.deepEqual(appStackRouteNames({ routes: [{ name: "(tabs)" }, { name: "auth/login" }] }), ["(tabs)", "auth/login"]);
});

test("app_stack_names_missing_state", () => {
  assert.deepEqual(appStackRouteNames(undefined), []);
  assert.deepEqual(appStackRouteNames({ routes: [{ name: "__root" }] }), []);
});

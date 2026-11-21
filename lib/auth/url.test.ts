import { test } from "node:test";
import assert from "node:assert/strict";
import { parseAuthUrl } from "./url.ts";

test("parse_expo_go_session", () => {
  assert.deepEqual(parseAuthUrl("exp://192.168.1.5:8081/--/auth/callback#access_token=a&refresh_token=r&type=signup"), {
    kind: "session", accessToken: "a", refreshToken: "r", recovery: false,
  });
});

test("parse_build_recovery", () => {
  assert.deepEqual(parseAuthUrl("zouza:///auth/callback#access_token=a&refresh_token=r&type=recovery"), {
    kind: "session", accessToken: "a", refreshToken: "r", recovery: true,
  });
});

test("parse_expired_link", () => {
  assert.deepEqual(
    parseAuthUrl("exp://192.168.1.5:8081/--/auth/callback#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid"),
    { kind: "error", code: "otp_expired" },
  );
});

test("parse_query_error_without_code", () => {
  assert.deepEqual(parseAuthUrl("zouza:///auth/callback?error=server_error"), { kind: "error", code: "server_error" });
});

test("parse_code", () => {
  assert.deepEqual(parseAuthUrl("zouza:///auth/callback?code=abc"), { kind: "code", code: "abc", recovery: false });
});

test("query_wins_over_fragment", () => {
  assert.deepEqual(parseAuthUrl("zouza:///auth/callback?type=recovery&access_token=q#access_token=f&refresh_token=r&type=signup"), {
    kind: "session", accessToken: "q", refreshToken: "r", recovery: true,
  });
});

test("other_paths_ignored", () => {
  assert.deepEqual(parseAuthUrl("zouza:///listing/123#access_token=a&refresh_token=r"), { kind: "none" });
});

test("missing_refresh_token_is_none", () => {
  assert.deepEqual(parseAuthUrl("zouza:///auth/callback#access_token=a"), { kind: "none" });
});

test("trailing_slash_and_dev_host_path", () => {
  assert.equal(parseAuthUrl("zouza://auth/callback/#access_token=a&refresh_token=r").kind, "session");
});

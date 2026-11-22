import { test } from "node:test";
import assert from "node:assert/strict";
import { authErrorMessage } from "./errors.ts";

const table: Record<string, string> = {
  invalid_credentials: "That email and password don't match. Try again or reset your password.",
  email_not_confirmed: "Confirm your email first. We sent you a link when you signed up.",
  user_already_exists: "There's already an account with that email. Log in instead.",
  weak_password: "Choose a stronger password: at least 8 characters.",
  same_password: "Choose a password you haven't used before.",
  over_email_send_rate_limit: "Too many emails just now. Try again in a few minutes.",
  over_request_rate_limit: "Too many tries just now. Wait a minute and try again.",
  otp_expired: "This link has expired or was already used. We can send you a new one.",
  email_address_invalid: "That email address doesn't look right.",
  not_configured: "Accounts aren't available in this version of the app.",
};

for (const [code, message] of Object.entries(table)) {
  test(`copy_${code}`, () => assert.equal(authErrorMessage(code), message));
}

test("network_error_copy", () => {
  assert.equal(authErrorMessage("network"), "Can't reach Zouza right now. Check your connection and try again.");
});

test("unknown_code_falls_back", () => {
  assert.equal(authErrorMessage("something_new"), "Something went wrong. Please try again.");
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { checkLogin, checkNewPassword, checkSignup, normalizeEmail } from "./validate.ts";

const ok = { fullName: "Ana", email: "ana@mail.com", password: "12345678" };

test("normalize_email", () => assert.equal(normalizeEmail(" Ana@Mail.COM "), "ana@mail.com"));

test("signup_empty_name", () => assert.equal(checkSignup({ ...ok, fullName: "   " }), "Add your name."));
test("signup_long_name", () => assert.equal(checkSignup({ ...ok, fullName: "a".repeat(81) }), "Use 80 characters or fewer for your name."));
test("signup_80_char_name_ok", () => assert.equal(checkSignup({ ...ok, fullName: "a".repeat(80) }), null));
test("signup_bad_email", () => assert.equal(checkSignup({ ...ok, email: "ana@mail" }), "That email address doesn't look right."));
test("signup_email_with_spaces_ok", () => assert.equal(checkSignup({ ...ok, email: " Ana@Mail.COM " }), null));
test("signup_short_password", () => assert.equal(checkSignup({ ...ok, password: "1234567" }), "Use at least 8 characters for your password."));
test("signup_name_checked_before_email", () => assert.equal(checkSignup({ fullName: "", email: "x", password: "" }), "Add your name."));
test("valid_signup_is_null", () => assert.equal(checkSignup(ok), null));

test("login_empty_email", () => assert.equal(checkLogin("  ", "pw"), "Enter your email and password."));
test("login_empty_password", () => assert.equal(checkLogin("a@b.co", ""), "Enter your email and password."));
test("login_ok", () => assert.equal(checkLogin("a@b.co", "pw"), null));

test("new_password_short", () => assert.equal(checkNewPassword("1234567", "1234567"), "Use at least 8 characters for your password."));
test("new_password_mismatch", () => assert.equal(checkNewPassword("12345678", "12345679"), "The two passwords don't match."));
test("new_password_ok", () => assert.equal(checkNewPassword("12345678", "12345678"), null));

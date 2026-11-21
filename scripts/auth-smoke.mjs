// Live check of the account contract against the real Supabase project, without a phone and
// without sending any email: admin-created users and admin-generated links only. Every user it
// creates is deleted at the end. Reads keys from the website's git-ignored .env.local and never
// prints them, nor any token.
//   npm run smoke:auth            (SUPABASE_ENV_FILE overrides the env file path)
import { readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { parseAuthUrl } from "../lib/auth/url.ts";
import { TERMS_VERSION } from "../lib/auth/terms.ts";

const envFile = process.env.SUPABASE_ENV_FILE || "D:/Projects/aurora-homes/.env.local";
const env = Object.fromEntries(
  readFileSync(envFile, "utf8").split(/\r?\n/).map((l) => l.match(/^([A-Z0-9_]+)=(.*)$/)).filter(Boolean).map((m) => [m[1], m[2].trim()]),
);
const url = env.NEXT_PUBLIC_SUPABASE_URL, publishable = env.NEXT_PUBLIC_SUPABASE_ANON_KEY, secret = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !publishable || !secret) {
  console.log("FAIL env: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY must be set in " + envFile);
  process.exit(1);
}

const noStore = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };
const admin = createClient(url, secret, noStore);
const fresh = () => createClient(url, publishable, noStore);

// Expo Go must be started with a hostname: Supabase refuses raw IPs (see raw_ip_links_are_refused).
const EXPO_GO = "exp://zouza-dev.local:8081/--/auth/callback";
const RAW_IP = "exp://192.168.1.5:8081/--/auth/callback";
const BUILD = "zouza:///auth/callback";
const stamp = Date.now();
const email = `smoke-${stamp}@test.zouza.ai`;
const email2 = `smoke-${stamp}-b@test.zouza.ai`;
const password = randomBytes(12).toString("hex");
const newPassword = randomBytes(12).toString("hex");
const created = [];
let failed = 0;

async function check(name, run) {
  try {
    await run();
    console.log(`PASS ${name}`);
  } catch (e) {
    failed++;
    console.log(`FAIL ${name}: ${e.message}`);
  }
}
const must = (cond, why) => { if (!cond) throw new Error(why); };

/** Follows an admin action link one hop, the way the phone's browser does, and returns where it sends people. */
async function follow(actionLink) {
  const r = await fetch(actionLink, { redirect: "manual" });
  const location = r.headers.get("location");
  must(location, `no redirect (HTTP ${r.status})`);
  return location;
}
const where = (loc) => loc.split("#")[0].split("?")[0];

try {
  let recovery; // tokens from the Expo Go recovery link
  let recoveryLink;

  await check("admin_creates_confirmed_user", async () => {
    const { data, error } = await admin.auth.admin.createUser({
      email, password, email_confirm: true, user_metadata: { full_name: "Smoke Test", terms_version: TERMS_VERSION },
    });
    must(!error, error?.message);
    created.push(data.user.id);
  });

  const client = fresh();
  await check("password_sign_in", async () => {
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    must(!error && data.session, error?.code ?? "no session");
  });

  await check("profile_records_terms", async () => {
    const { data, error } = await client.from("profiles").select("full_name, terms_version, terms_accepted_at").eq("id", created[0]).single();
    must(!error, error?.message);
    must(data.full_name === "Smoke Test", `full_name is ${JSON.stringify(data.full_name)}`);
    must(data.terms_version === "2026-11-21", `terms_version is ${JSON.stringify(data.terms_version)}`);
    must(data.terms_accepted_at, "terms_accepted_at is empty");
  });

  await check("recovery_link_returns_to_expo_go", async () => {
    const { data, error } = await admin.auth.admin.generateLink({ type: "recovery", email, options: { redirectTo: EXPO_GO } });
    must(!error, error?.message);
    recoveryLink = data.properties.action_link;
    const loc = await follow(recoveryLink);
    must(where(loc) === EXPO_GO, `redirected to ${where(loc)} (not on the allow-list?)`);
    const parsed = parseAuthUrl(loc);
    must(parsed.kind === "session" && parsed.recovery, `parsed as ${parsed.kind}${parsed.kind === "error" ? " " + parsed.code : ""}`);
    recovery = parsed;
  });

  await check("recovery_link_returns_to_build", async () => {
    const { data, error } = await admin.auth.admin.generateLink({ type: "recovery", email, options: { redirectTo: BUILD } });
    must(!error, error?.message);
    const loc = await follow(data.properties.action_link);
    must(where(loc) === BUILD, `redirected to ${where(loc)} (not on the allow-list?)`);
    const parsed = parseAuthUrl(loc);
    must(parsed.kind === "session" && parsed.recovery, `parsed as ${parsed.kind}`);
  });

  await check("raw_ip_links_are_refused", async () => {
    const { data, error } = await admin.auth.admin.generateLink({ type: "recovery", email, options: { redirectTo: RAW_IP } });
    must(!error, error?.message);
    const loc = await follow(data.properties.action_link);
    must(where(loc) !== RAW_IP, "Supabase now accepts IP links: the REACT_NATIVE_PACKAGER_HOSTNAME step is no longer needed");
  });

  await check("recovery_session_sets_new_password", async () => {
    must(recovery, "no recovery tokens from the Expo Go link");
    const phone = fresh();
    const set = await phone.auth.setSession({ access_token: recovery.accessToken, refresh_token: recovery.refreshToken });
    must(!set.error, `setSession: ${set.error?.code ?? set.error?.message}`);
    const upd = await phone.auth.updateUser({ password: newPassword });
    must(!upd.error, `updateUser: ${upd.error?.code ?? upd.error?.message}`);
    const ok = await fresh().auth.signInWithPassword({ email, password: newPassword });
    must(!ok.error, `new password rejected: ${ok.error?.code}`);
    const old = await fresh().auth.signInWithPassword({ email, password });
    must(old.error?.code === "invalid_credentials", `old password gave ${old.error?.code ?? "a session"}`);
  });

  await check("used_link_is_expired", async () => {
    must(recoveryLink, "no link");
    const parsed = parseAuthUrl(await follow(recoveryLink));
    must(parsed.kind === "error", `parsed as ${parsed.kind}`);
    console.log(`     (a used link reports error code "${parsed.code}")`);
  });

  await check("signup_link_is_not_recovery", async () => {
    const { data, error } = await admin.auth.admin.generateLink({
      type: "signup", email: email2, password, options: { redirectTo: EXPO_GO, data: { full_name: "Smoke B", terms_version: TERMS_VERSION } },
    });
    must(!error, error?.message);
    created.push(data.user.id);
    const loc = await follow(data.properties.action_link);
    must(where(loc) === EXPO_GO, `redirected to ${where(loc)}`);
    const parsed = parseAuthUrl(loc);
    must(parsed.kind === "session" && !parsed.recovery, `parsed as ${parsed.kind}`);
    const type = new URLSearchParams(loc.split("#")[1] ?? "").get("type");
    console.log(`     (a sign-up link reports type "${type}")`);
  });
} finally {
  for (const id of created) {
    const { error } = await admin.auth.admin.deleteUser(id);
    if (error) { failed++; console.log(`FAIL cleanup: could not delete test user ${id}: ${error.message}`); }
  }
  console.log(failed ? `${failed} check(s) failed` : "all checks passed; test users deleted");
  process.exit(failed ? 1 : 0);
}

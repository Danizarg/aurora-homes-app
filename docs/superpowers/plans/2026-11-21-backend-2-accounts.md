# Zouza backend 2: real accounts in the app — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the app's fake sign-in with real Supabase accounts: sign-up that records terms acceptance, email confirmation that opens the app, log-in, a working password reset, real log-out, sessions that survive restarts, and sign-in required to publish.

**Architecture:** Pure, dependency-free modules in `lib/auth/` hold every decision (URL parsing, error copy, validation, session state, navigation) and are unit-tested with Node's built-in runner. A thin `lib/auth/service.ts` wires them to the real Supabase client, a React provider exposes the session, and an `app/auth/callback` route turns email links into a session. A live smoke script proves the contract against the real project without a phone.

**Tech Stack:** Expo SDK 58 (expo-router 58.0.30, expo-linking 58.0.16), @supabase/supabase-js 2.118.0 (implicit flow), AsyncStorage, Node 24 `node:test` with built-in type stripping.

**Spec:** `D:\Projects\aurora-homes-app\docs\superpowers\specs\2026-11-21-backend-phase2-design.md` (Goals 2 and the "Accounts" and "Email" calls). Builds on plan 1 (`2026-11-21-backend-1-database-foundation.md`): the `on_auth_user_created` trigger copies `full_name` and `terms_version` from sign-up metadata into `public.profiles`, and the live auth settings are site_url `https://zouza.ai`, allow-list `zouza://**,exp://**`, confirmation on, anonymous off, minimum password 8, SMTP via info@zouza.ai.

## Global Constraints

- Work on branch `claude/app-accounts` cut from `origin/main` in `D:\Projects\aurora-homes-app` (the owner's Expo folder, so the branch can be tried on the phone with `npx expo start --go`). Commit per task; push or open a PR only when the owner says so. The spec and both plan docs (`docs/superpowers/`) are committed in Task 1.
- The app holds only `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` (publishable). The secret key and management token never enter app code, a commit, a log or chat; the smoke script reads them from `D:\Projects\aurora-homes\.env.local` at run time and prints no values.
- Terms version recorded at sign-up: exactly `"2026-11-21"` (matches plan 1's tests).
- Redirect for every email link: `Linking.createURL("/auth/callback")` (Expo Go: `exp://<LAN-IP>:8081/--/auth/callback`; builds: `zouza:///auth/callback`). `signUp` and `resend` take `options.emailRedirectTo`; `resetPasswordForEmail` takes `options.redirectTo`.
- Implicit flow, set explicitly (`flowType: "implicit"`); `detectSessionInUrl: false` stays. Tokens arrive in the URL fragment, which expo-router drops, so the callback reads the raw URL from expo-linking, never `useLocalSearchParams`.
- Log-out is `signOut({ scope: "local" })` (this phone only). Device-local saves, chats and bookings are kept on log-out (they are not per-user until plan 4).
- No mock-auth fallback: with no Supabase env, auth calls return the `not_configured` error. Signed-out browsing, the intro, Suza and the voice keep working exactly as now. Don't touch `lib/voice/*`, `lib/suza/*`, `app/api/suza/*`.
- User-facing name: Zouza. Copy stays inside the existing UI kit (`components/ui/*`, `constants/theme`).
- Pure modules (`lib/auth/url.ts`, `errors.ts`, `validate.ts`, `core.ts`, `state.ts`, `nav.ts`) import nothing at runtime except other pure modules by explicit `./x.ts` path; React Native, expo and Supabase are only imported as types. Test files live next to them as `lib/auth/*.test.ts` (never under `app/`, which expo-router would treat as routes).
- Codex's files (`app/(tabs)/profile.tsx`) are edited only in Task 8, after the `HANDOFF.md` post described there. `HANDOFF.md` (in `D:\Projects\aurora-homes`) is append-only: re-read before appending.
- Publishing still saves to the phone when the Supabase insert fails: `lib/supabase/listings.ts` writes retired column names and is fixed in plan 3. Plan 2 only changes *who* publishes.

## Review Focus

- An expired or already-used email link (`#error_code=otp_expired`) must show "This link has expired or was already used" with a way to get a new one, never a blank screen or a crash. Test: Task 2 `parse_expired_link`, Task 5 manual step.
- The same email link delivered twice (cold-start URL plus the `url` event, or a re-render) must set the session once. Test: Task 5 `handler_ignores_repeat_url`.
- An email typed with capitals or spaces (`" Ana@Mail.COM "`) must sign up and log in as `ana@mail.com`. Test: Task 2 `normalize_email`.
- Signing up with an email that already has an account must show the same "check your email" screen (Supabase hides whether it exists) and never crash or sign in. Test: Task 3 `signup_existing_email_needs_confirmation`.
- Losing the connection mid sign-in must show the connection message and re-enable the button, not spin forever. Test: Task 2 `network_error_copy`; Task 6 screens set loading false in `finally`.

---

## File structure

| File | Responsibility |
|---|---|
| `lib/auth/url.ts` | `parseAuthUrl(url)`: callback URL → session tokens, code, error or nothing |
| `lib/auth/errors.ts` | `authErrorMessage(code)`: error code → the one sentence the user sees |
| `lib/auth/validate.ts` | `normalizeEmail`, `checkSignup`, `checkLogin`, `checkNewPassword` |
| `lib/auth/core.ts` | `createAuthApi(client, opts)`: every Supabase auth call with the right options, returns `AuthResult` |
| `lib/auth/state.ts` | `sessionStateFrom(session, profileName)`: the `SessionState` the UI reads |
| `lib/auth/nav.ts` | `authRoutesOnTop(routeNames)`: how many auth screens to dismiss when leaving the auth flow |
| `lib/auth/terms.ts` | `TERMS_VERSION = "2026-11-21"` |
| `lib/auth/service.ts` | Rewritten: the real client wired into `createAuthApi`; `getCurrentUserId` kept |
| `lib/auth/session.tsx` | `AuthProvider`, `useSession()`, AppState auto-refresh |
| `lib/auth/callbackHandler.ts` | `createCallbackHandler(complete)`: one outcome per email link, repeats ignored |
| `lib/auth/useLeaveAuth.ts` | `useLeaveAuth()`: dismiss the auth screens, or go Home on a cold start |
| `app/auth/callback.tsx` | New route: handles the email link, shows progress or the error |
| `app/auth/reset-password.tsx` | New route: set a new password after a recovery link |
| `app/auth/login.tsx`, `signup.tsx`, `forgot-password.tsx` | Real flows, friendly errors, check-email state, resend |
| `app/_layout.tsx` | `AuthProvider`; auth screens presented as modals |
| `app/create-listing/index.tsx`, `app/owner-dashboard.tsx` | Sign-in gate at Publish; signed-out prompt |
| `lib/store/discovery.ts` | "Start fresh" signs out before clearing storage |
| `lib/supabase/client.ts` | `flowType: "implicit"`, typed with `Database` |
| `scripts/auth-smoke.mjs` | Live contract check against the real project |
| `app/(tabs)/profile.tsx` (Codex's) | Real name, "Log in or sign up" when signed out, real Log out |

---

### Task 1: Branch, docs and the test runner

**Files:**
- Modify: `package.json` (scripts `"test": "node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --test \"lib/**/*.test.ts\""`, `"smoke:auth": "node scripts/auth-smoke.mjs"`; devDependency `@types/node` via `npm install -D @types/node@^24`), `tsconfig.json` (`"allowImportingTsExtensions": true`)
- Create: `lib/auth/terms.ts`, `lib/auth/terms.test.ts`
- Commit: `docs/superpowers/specs/2026-11-21-backend-phase2-design.md`, `docs/superpowers/plans/2026-11-21-backend-1-database-foundation.md`, this plan

**Interfaces:**
- Produces: `npm test` (exit 0 = all pass), `export const TERMS_VERSION = "2026-11-21"`.

- [ ] **Step 1:** `git fetch origin && git switch -c claude/app-accounts origin/main` in `D:\Projects\aurora-homes-app` (the untracked `docs/` carries over).
- [ ] **Step 2: Write the failing test** `lib/auth/terms.test.ts`: `terms_version_matches_database` → `assert.equal(TERMS_VERSION, "2026-11-21")`, importing `./terms.ts`.
- [ ] **Step 3:** Run `npm test` → fails (no script / module).
- [ ] **Step 4:** Add the script, tsconfig flag, `@types/node`, and `terms.ts`.
- [ ] **Step 5:** `npm test` → 1 pass; `npm run typecheck` → 0 errors; `npm run lint` → no new problems. If it flags the explicit `./x.ts` imports, turn off `import/extensions` and `import/no-unresolved` for `lib/auth/**` in `eslint.config.js` (no inline disable comments).
- [ ] **Step 6: Commit** — `git add docs package.json package-lock.json tsconfig.json lib/auth/terms.ts lib/auth/terms.test.ts eslint.config.js && git commit -m "Add the backend design, plans, and a Node test runner for auth logic"`

---

### Task 2: Pure helpers — callback URLs, error copy, validation

**Files:**
- Create: `lib/auth/url.ts`, `lib/auth/errors.ts`, `lib/auth/validate.ts` and a `.test.ts` beside each

**Interfaces:**
- Produces:
  - `type AuthUrlResult = { kind: "session"; accessToken: string; refreshToken: string; recovery: boolean } | { kind: "code"; code: string; recovery: boolean } | { kind: "error"; code: string } | { kind: "none" }`
  - `parseAuthUrl(url: string): AuthUrlResult` — only for URLs whose path ends in `/auth/callback` (with or without `/--`), else `none`. Merges `?query` and `#fragment` params, query wins. `error_code` (or `error` when no code) → `error` with that code; `access_token` + `refresh_token` → `session`; `code` → `code`. `recovery` = `type === "recovery"`.
  - `authErrorMessage(code: string): string` — exact copy:

    | code | message |
    |---|---|
    | `invalid_credentials` | That email and password don't match. Try again or reset your password. |
    | `email_not_confirmed` | Confirm your email first. We sent you a link when you signed up. |
    | `user_already_exists` | There's already an account with that email. Log in instead. |
    | `weak_password` | Choose a stronger password: at least 8 characters. |
    | `same_password` | Choose a password you haven't used before. |
    | `over_email_send_rate_limit` | Too many emails just now. Try again in a few minutes. |
    | `over_request_rate_limit` | Too many tries just now. Wait a minute and try again. |
    | `otp_expired` | This link has expired or was already used. We can send you a new one. |
    | `email_address_invalid` | That email address doesn't look right. |
    | `network` | Can't reach Zouza right now. Check your connection and try again. |
    | `not_configured` | Accounts aren't available in this version of the app. |
    | anything else | Something went wrong. Please try again. |

  - `normalizeEmail(s: string): string` (trim, lowercase)
  - `checkSignup(v: { fullName: string; email: string; password: string }): string | null` — first problem, in this order: empty name → "Add your name."; name over 80 chars → "Use 80 characters or fewer for your name."; email not matching `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` after normalizing → "That email address doesn't look right."; password under 8 chars → "Use at least 8 characters for your password."
  - `checkLogin(email: string, password: string): string | null` — "Enter your email and password." when either is empty after trimming the email.
  - `checkNewPassword(pw: string, confirm: string): string | null` — under 8 → the 8-character message; mismatch → "The two passwords don't match."

- [ ] **Step 1: Write the failing tests**, named:
  - `url.test.ts`: `parse_expo_go_session` (`exp://192.168.1.5:8081/--/auth/callback#access_token=a&refresh_token=r&type=signup` → session, recovery false), `parse_build_recovery` (`zouza:///auth/callback#access_token=a&refresh_token=r&type=recovery` → recovery true), `parse_expired_link` (`...#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid` → `{kind:"error", code:"otp_expired"}`), `parse_query_error_without_code` (`?error=server_error` → code `server_error`), `parse_code` (`?code=abc` → code), `query_wins_over_fragment`, `other_paths_ignored` (`zouza:///listing/123#access_token=a&refresh_token=r` → none), `missing_refresh_token_is_none`.
  - `errors.test.ts`: one assertion per table row (exact strings), `network_error_copy`, `unknown_code_falls_back`.
  - `validate.test.ts`: `normalize_email` (`" Ana@Mail.COM "` → `"ana@mail.com"`), each `checkSignup` message in order, `valid_signup_is_null`, `checkLogin` empty cases, `checkNewPassword` both messages.
- [ ] **Step 2:** `npm test` → those fail.
- [ ] **Step 3:** Implement the three modules (`URL` can't parse `exp:`/`zouza:///` reliably: split on the first `#` and `?` yourself and use `URLSearchParams` on each part).
- [ ] **Step 4:** `npm test` → all pass; `npm run typecheck` → 0.
- [ ] **Step 5: Commit** — `git commit -m "Auth helpers: read email-link URLs, friendly error copy, form checks"`

---

### Task 3: The auth API and the real client

**Files:**
- Create: `lib/auth/core.ts`, `lib/auth/core.test.ts`
- Rewrite: `lib/auth/service.ts`
- Modify: `lib/supabase/client.ts` (`flowType: "implicit"`; `createClient<Database>` with `import type { Database } from "../../types/database"`; update the stale setup comment to point at the shared migrations)

**Interfaces:**
- Consumes: `normalizeEmail` (Task 2), `TERMS_VERSION` (Task 1).
- Produces:
  - `type AuthResult = { ok: true; needsConfirmation?: boolean } | { ok: false; code: string }`
  - `type AuthClientLike` = the subset of `SupabaseClient["auth"]` used below (declare it with `import type`).
  - `createAuthApi(auth: AuthClientLike, opts: { redirectUrl: () => string; termsVersion: string })` returning:
    - `signIn(email, password): Promise<AuthResult>` → `signInWithPassword({ email: normalizeEmail(email), password })`
    - `signUp(fullName, email, password): Promise<AuthResult>` → `signUp({ email, password, options: { emailRedirectTo: redirectUrl(), data: { full_name: fullName.trim(), terms_version } } })`; `needsConfirmation = !data.session`
    - `resendConfirmation(email): Promise<AuthResult>` → `resend({ type: "signup", email, options: { emailRedirectTo } })`
    - `sendPasswordReset(email): Promise<AuthResult>` → `resetPasswordForEmail(email, { redirectTo })`
    - `updatePassword(password): Promise<AuthResult>` → `updateUser({ password })`
    - `signOut(): Promise<AuthResult>` → `signOut({ scope: "local" })`
    - `completeFromUrl(r: AuthUrlResult): Promise<AuthResult & { recovery?: boolean }>` → `setSession` for `session`, `exchangeCodeForSession` for `code`, `{ ok:false, code }` for `error`, `{ ok:false, code:"none" }` for `none`
  - Error → code: `error.code` if set; else `"network"` when `error.name === "AuthRetryableFetchError"`; else `"unknown"`. A thrown exception is caught and mapped the same way (never rejects).
  - `service.ts` exports the same seven functions bound to the real client and `Linking.createURL("/auth/callback")`; when `!isSupabaseConfigured` each returns `{ ok:false, code:"not_configured" }`. Keeps `getCurrentUserId()`. Deletes `getCurrentSession` (no callers) and the mock fallback. Leaves `getOrCreateSupabaseUserId` as it is (with anonymous sign-ins off it returns null and publish keeps saving to the phone); Task 7 deletes it together with its last caller.

- [ ] **Step 1: Write `core.test.ts`** with a fake `auth` object that records calls and returns scripted `{ data, error }`: `signin_normalizes_email`, `signup_sends_terms_and_redirect` (asserts `options.data.terms_version === "2026-11-21"`, `options.data.full_name === "Ana"` from `"  Ana "`, `options.emailRedirectTo === "exp://x/--/auth/callback"`), `signup_with_session_is_signed_in` (needsConfirmation false), `signup_existing_email_needs_confirmation` (fake returns `{ user: { identities: [] }, session: null }`, no error → `{ ok:true, needsConfirmation:true }`), `reset_uses_redirectTo_not_emailRedirectTo`, `resend_is_signup_type`, `signout_is_local`, `api_error_code_passed_through` (`{ code:"invalid_credentials" }`), `retryable_fetch_error_is_network`, `thrown_exception_is_caught`, `complete_session_calls_setSession_and_reports_recovery`, `complete_error_passes_code`.
- [ ] **Step 2:** `npm test` → fail. **Step 3:** implement `core.ts`, rewrite `service.ts`, update `client.ts`. **Step 4:** `npm test` → pass; `npm run typecheck` → 0.
- [ ] **Step 5: Commit** — `git commit -m "Real auth API: terms on sign-up, email links back to the app, local log-out"`

---

### Task 4: Live contract check against the real project

**Files:**
- Create: `scripts/auth-smoke.mjs`

**Interfaces:**
- Consumes: `parseAuthUrl` (imported from `../lib/auth/url.ts`), `TERMS_VERSION`.
- Produces: `npm run smoke:auth` → one `PASS <check>` line per check and exit 0, or `FAIL <check>: <reason>` and exit 1. Env file path from `SUPABASE_ENV_FILE`, default `D:/Projects/aurora-homes/.env.local`; uses `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`; prints no keys or tokens.

Checks, in order (always deleting the test user in `finally`):
1. `admin_creates_confirmed_user` — `auth.admin.createUser({ email: "smoke-<timestamp>@test.zouza.ai", password, email_confirm: true, user_metadata: { full_name: "Smoke Test", terms_version: TERMS_VERSION } })` (no email is sent).
2. `password_sign_in` — a publishable-key client `signInWithPassword` returns a session.
3. `profile_records_terms` — that client selects its own `profiles` row: `full_name = "Smoke Test"`, `terms_version = "2026-11-21"`, `terms_accepted_at` not null.
4. `recovery_link_returns_to_expo_go` — `auth.admin.generateLink({ type: "recovery", email, options: { redirectTo: "exp://192.168.1.5:8081/--/auth/callback" } })`; `fetch(action_link, { redirect: "manual" })`; the `location` header starts with `exp://192.168.1.5:8081/--/auth/callback` (if it starts with `https://zouza.ai` the allow-list rejected it) and `parseAuthUrl(location)` is `session` with `recovery: true`.
5. `recovery_link_returns_to_build` — same with `zouza:///auth/callback`.
6. `recovery_session_sets_new_password` — a fresh client `setSession` with those tokens, `updateUser({ password: newPassword })`, then `signInWithPassword` with the new password succeeds and the old one fails with code `invalid_credentials`.
7. `used_link_is_expired` — fetching the step-4 `action_link` again yields a location whose `parseAuthUrl` is `error` (record the exact code it gives; the app's copy must cover it — if it is not `otp_expired`, add it to Task 2's table).
8. `signup_link_is_not_recovery` — `generateLink({ type: "signup", email: <second address>, password, options: { redirectTo: exp URL } })` → parsed `session` with `recovery: false`; delete that user too.

- [ ] **Step 1:** Write the script. **Step 2:** `npm run smoke:auth` → 8 PASS. If check 4 or 5 fails on the allow-list, stop and report: changing Supabase settings needs the owner's OK.
- [ ] **Step 3: Commit** — `git commit -m "Live check of sign-up metadata, password reset links and the redirect allow-list"`

---

### Task 5: Session provider, callback and new-password screens

**Files:**
- Create: `lib/auth/state.ts`, `lib/auth/state.test.ts`, `lib/auth/nav.ts`, `lib/auth/nav.test.ts`, `lib/auth/session.tsx`, `lib/auth/useLeaveAuth.ts`, `lib/auth/callbackHandler.ts`, `lib/auth/callbackHandler.test.ts`, `app/auth/callback.tsx`, `app/auth/reset-password.tsx`
- Modify: `app/_layout.tsx`

**Interfaces:**
- Consumes: `parseAuthUrl`, `createAuthApi().completeFromUrl`, `authErrorMessage`, `checkNewPassword`, service `updatePassword`/`resendConfirmation`/`sendPasswordReset`.
- Produces:
  - `type SessionState = { status: "loading" } | { status: "signedOut" } | { status: "signedIn"; userId: string; email: string; fullName: string }`
  - `sessionStateFrom(session: { user: { id: string; email?: string; user_metadata?: { full_name?: string } } } | null, profileName: string | null): SessionState` — `fullName` = profileName ?? metadata full_name ?? `""`.
  - `AuthProvider` (wraps the app; `getSession()` on mount, then `onAuthStateChange`; loads `profiles.full_name` for the signed-in user; calls `supabase.auth.startAutoRefresh()` while `AppState` is `active` and `stopAutoRefresh()` otherwise) and `useSession(): SessionState`. With no Supabase env: `signedOut` immediately.
  - `authRoutesOnTop(routeNames: string[]): number` — count of trailing names starting with `auth/`; `useLeaveAuth(): () => void` — reads the root stack's route names from `useRootNavigationState()`; if `0 < n < length` → `router.dismiss(n)`, else `router.replace("/(tabs)")`.
  - `createCallbackHandler(complete: (r: AuthUrlResult) => Promise<AuthResult & { recovery?: boolean }>): (url: string) => Promise<CallbackOutcome | null>` where `type CallbackOutcome = { kind: "signedIn" } | { kind: "recovery" } | { kind: "error"; code: string }`; returns `null` for a URL already handled or for `none`.
- `app/auth/callback.tsx`: reads `Linking.useLinkingURL()` (and `Linking.getLinkingURL()` once on mount), passes it through `Linking.unwrapDevLaunchURL`, then the handler. Outcome `signedIn` → `useLeaveAuth()()`; `recovery` → `router.replace("/auth/reset-password")`; `error` → shows `authErrorMessage(code)` with, for `otp_expired`, an email field and two buttons "Send a new confirmation link" (resend) and "Send a new reset link" (reset) plus "Back to Zouza" (leave). While working: a spinner and "Signing you in…".
- `app/auth/reset-password.tsx`: two password fields, `checkNewPassword`, `updatePassword`; success → "Your password is changed." then leave auth; errors via `authErrorMessage`. Opened without a session → "Open the reset link from your email again." with a "Back to Zouza" button.
- `app/_layout.tsx`: wrap in `AuthProvider`; add `Stack.Screen`s for `auth/login`, `auth/signup`, `auth/forgot-password`, `auth/reset-password`, `auth/callback` with `presentation: "modal"` so they appear above the full-screen create-listing modal on iOS.

- [ ] **Step 1: Write tests**: `state.test.ts` — `null_session_is_signed_out`, `profile_name_wins`, `metadata_name_fallback`, `missing_email_is_empty`; `nav.test.ts` — `no_auth_routes_is_zero`, `counts_trailing_auth_routes` (`["(tabs)","create-listing/index","auth/login","auth/signup"]` → 2), `auth_route_below_others_not_counted`, `all_auth_routes_counts_all` (`["auth/callback"]` → 1, so the hook replaces); `callbackHandler.test.ts` — `handler_ignores_repeat_url` (same URL twice → second returns null, `complete` called once), `recovery_outcome`, `error_outcome_keeps_code`, `non_auth_url_is_null`.
- [ ] **Step 2:** `npm test` → fail. **Step 3:** implement. **Step 4:** `npm test` → pass; `npm run typecheck` → 0.
- [ ] **Step 5: Commit** — `git commit -m "Session provider, email-link callback and set-a-new-password screen"`

---

### Task 6: Log-in, sign-up and forgot-password screens

**Files:**
- Modify: `app/auth/login.tsx`, `app/auth/signup.tsx`, `app/auth/forgot-password.tsx`

**Interfaces:**
- Consumes: service functions (Task 3), `checkSignup`/`checkLogin`/`normalizeEmail` (Task 2), `authErrorMessage`, `useLeaveAuth` (Task 5).

Behaviour (layout and styling stay as they are):
- **Login:** `checkLogin` first; `signIn`; success → leave auth. `email_not_confirmed` → message plus a "Resend confirmation email" link that calls `resendConfirmation` and then says "Sent. Check your inbox." The close (×) and "Continue without an account" call leave auth (no longer always `replace("/(tabs)")`, so an open create-listing wizard survives). `loading` is set false in `finally`.
- **Sign-up:** `checkSignup` first; password field helper "At least 8 characters"; `signUp`. `needsConfirmation` → the form is replaced by a "Check your email" state: "We sent a link to {email}. Open it on this iPhone to finish signing up." with "Resend email" (`resendConfirmation`, shows "Sent." or the error copy) and "Back to log in". No confirmation needed → leave auth. The existing terms sentence and links stay above the button.
- **Forgot password:** normalizes the email; empty → "Enter your email."; `sendPasswordReset`; shows the existing "If an account exists…" success copy only on `ok`, else `authErrorMessage`. Adds "Open the link on this iPhone." to the success line.

- [ ] **Step 1:** Implement. **Step 2:** `npm run typecheck` → 0; `npm test` → pass; `npm run lint` → no new problems.
- [ ] **Step 3:** Headless bundle check (memory: Metro on port 8087 with `CI=1`, fetch the manifest's `launchAsset.url` with `expo-platform: ios`) → HTTP 200, multi-MB body, and the body contains `Check your email` and `Signing you in`.
- [ ] **Step 4:** Web smoke at 375×667 in the browser pane: `/auth/login` with wrong credentials shows the `invalid_credentials` copy; `/auth/signup` with a 5-character password shows the 8-character message; `/auth/callback` (no URL) shows "Back to Zouza" without crashing.
- [ ] **Step 5: Commit** — `git commit -m "Log-in, sign-up and reset screens: real errors, check-your-email, resend"`

---

### Task 7: Sign-in to publish, owner dashboard, Start fresh

**Files:**
- Modify: `app/create-listing/index.tsx:39-40,313-343`, `app/owner-dashboard.tsx:18,36-37`, `lib/store/discovery.ts:113-119`, `lib/auth/service.ts` (delete `getOrCreateSupabaseUserId`)

**Interfaces:**
- Consumes: `useSession` (Task 5), service `signOut`.

Behaviour:
- **Publish:** `publish()` reads `useSession()`. Signed out → `router.push("/auth/login")` with no state change, and the Publish button's caption above it reads "Log in or create an account to publish. Your listing stays here." After signing in the user lands back on the same step (Task 5's leave-auth), and taps Publish again. Signed in → `ownerId = session.userId`, rest unchanged (falls back to the phone when the insert fails, until plan 3). Wrap the body in `try/finally` so `publishing` always resets.
- **Owner dashboard:** signed out → in place of the listings, "Log in to see and manage your listings." with a "Log in" button (`router.push("/auth/login")`); signed in → as now with `session.userId`.
- **Start fresh (`resetAll`):** `await signOut()` (ignore its result) before `AsyncStorage.clear()`.

- [ ] **Step 1:** Implement. **Step 2:** `npm run typecheck` → 0 (no remaining import of `getOrCreateSupabaseUserId`: `grep -r getOrCreateSupabaseUserId app lib` → nothing); `npm test` → pass.
- [ ] **Step 3:** Web smoke: signed out, open `/create-listing`, reach Publish, tap it → the login modal appears; close it → still on the Publish step with the content intact.
- [ ] **Step 4: Commit** — `git commit -m "Require an account to publish; dashboard and Start fresh respect the session"`

---

### Task 8: Profile shows the real account (Codex's file)

**Files:**
- Append: `D:\Projects\aurora-homes\HANDOFF.md` (re-read first)
- Modify: `app/(tabs)/profile.tsx` (identity card and the Log out block, lines ~124-136 only), `lib/mock/storage.ts:58-73` (remove `MockSession`, `getMockSession`, `setMockSession`, `KEYS.session`)

**Gate:** the owner's approval of this plan covers this edit (precedent: PR #35). Before editing, append to `HANDOFF.md` under Updates: date, "Claude is changing `app/(tabs)/profile.tsx` (identity card and Log out only) for real accounts, on branch `claude/app-accounts`; nothing else in Codex's files", and the new API Codex can use: `useSession()` from `lib/auth/session`, `signOut()` from `lib/auth/service`.

Behaviour:
- Signed in: the card shows `fullName` (or the email's part before `@` if empty) and the email; "Log out" calls `signOut()` then `router.replace("/(tabs)")`.
- Signed out: the card reads "Not logged in" with a "Log in or sign up" button (`router.push("/auth/login")`); no Log out row.
- Loading: the card shows the existing placeholder text without a button.

- [ ] **Step 1:** Append to HANDOFF.md, then implement. **Step 2:** `npm run typecheck` → 0; `grep -rn "MockSession\|setMockSession\|getMockSession" app lib` → nothing; `npm test` → pass; bundle check → 200.
- [ ] **Step 3: Commit** — `git commit -m "Profile shows the signed-in account and logs out for real"` (HANDOFF.md is committed in the website repo only if the owner asks; leave it modified there otherwise).

---

### Task 9: Finish

- [ ] **Step 1:** `npm test`, `npm run typecheck`, `npm run lint`, `npm run smoke:auth` → all pass; bundle check → 200.
- [ ] **Step 2:** Whole-branch review (superpowers:requesting-code-review) against this plan and the Global Constraints; fix what it confirms.
- [ ] **Step 3:** Hand the owner the phone walkthrough (Expo Go, `npx expo start --go` in `D:\Projects\aurora-homes-app` on this branch), one line each:
  1. Profile → Log in or sign up → Create an account with a real address you can read on the phone → "Check your email".
  2. Open the email on the iPhone, tap "Confirm email address" → Zouza opens signed in; Profile shows your name.
  3. Swipe the app away, reopen → still signed in.
  4. Log out → Profile shows "Not logged in".
  5. Log in → Forgot password? → email → tap the link → set a new password → log in with it.
  6. Tap the same reset link again → "This link has expired or was already used".
  7. Signed out, start a listing, tap Publish → log in → you're back on Publish with your listing intact.
  If the confirmation email is in spam, that is the missing DKIM/DMARC (owner action), not the app.

## Done when

All automated checks pass, the whole-branch review's confirmed findings are fixed, the branch is committed locally, and the owner has the walkthrough. Push and PR only on the owner's word.

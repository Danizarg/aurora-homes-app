# Zouza backend 1: database foundation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the empty Supabase project into the single shared database for the app and zouza.ai, with every access rule, guard and setting from the design, proven by SQL tests that act as real signed-in users.

**Architecture:** Numbered SQL migrations in the website repo (`aurora-homes/supabase/migrations/`) are the one source of truth. A small Node runner applies them and runs SQL tests through the Supabase Management API, reading the token from the git-ignored `.env.local`. Tests run inside a transaction that is always rolled back, impersonating users by setting `role` and `request.jwt.claims`.

**Tech Stack:** Supabase (Postgres 17, Auth, Storage, Realtime), Supabase Management API, Node 24 (built-in `fetch`, no new packages).

**Spec:** `D:\Projects\aurora-homes-app\docs\superpowers\specs\2026-11-21-backend-phase2-design.md` (approved 2026-11-21 with defaults: the owner reads report emails daily and Claude does takedowns on request; listing is free at launch).

**This is plan 1 of 7.** Later plans, each written when this one lands: 2 Accounts in the app (sign-up with terms acceptance, email callback, reset, log-out); 3 Listings and photos (publish, edit, delete, real ratings, remove the €20/month copy); 4 Saved homes, messages (realtime) and viewing requests, incl. busy dates in the calendar; 5 Safety (moderation Edge Function, report/block UI, email alerts); 6 Account deletion (Edge Function + screen); 7 AI consent sheet and "Example" labels on demo homes.

## Global Constraints

- Project ref `nltrwifcwxrsyabyxswi`; all scripts read `SUPABASE_ACCESS_TOKEN`, `NEXT_PUBLIC_SUPABASE_URL` and `EMAIL_SMTP_*` from `D:\Projects\aurora-homes\.env.local` and never print, log or commit a value (print lengths or "set/empty" only).
- No secret key, management token or SMTP password in any committed file, test output or chat message.
- `aurora-homes` is a PUBLIC GitHub repo: scan staged files for `sb_secret_`, `sbp_`, `eyJ` before every commit.
- Work on branch `claude/supabase-foundation` cut from `origin/main` in `D:\Projects\aurora-homes` (its checkout is on `app-api-v1`; use a worktree, never switch that checkout's branch), and `claude/retire-app-schema` in `D:\Projects\aurora-homes-app`. Commit on those branches; push or open PRs only when the owner says so.
- The website keeps running on demo data: no Supabase variables go to Vercel in this plan.
- Photo bucket name is `listing-images`; object path `<user id>/<listing id>/<n>.jpg`; max 15 photos per listing.
- Listing statuses: `draft`, `published`, `archived` (client-settable), `pending_review`, `removed` (server only).
- Name in any user-facing text: Zouza. Don't touch voice files (`lib/voice/*`, `lib/suza/*`, `app/api/suza/*`).
- `HANDOFF.md` is append-only: re-read it before appending, never overwrite.

## Review Focus

- An owner re-publishing a listing Zouza set to `removed` (removed → published) must be rejected. Test: Task 4 `owner_cannot_unremove`.
- A 16th photo row for one listing must be rejected. Test: Task 4 `sixteenth_photo_rejected`.
- A user who blocked or was blocked must not be able to send into an existing conversation. Test: Task 7 `blocked_cannot_send_in_existing_thread`.
- A banned word in different case or with accents (`BADWORD`, `bádword`) must be rejected like the plain one. Test: Task 7 `filter_ignores_case_and_accents`.
- A second review by the same user on the same listing must be rejected. Test: Task 6 `second_review_rejected`.

---

## File structure

`D:\Projects\aurora-homes` (website repo, branch `claude/supabase-foundation`):

| File | Responsibility |
|---|---|
| `scripts/supabase/run.mjs` | CLI: `migrate` (apply unapplied migrations in order), `test [file]` (run tests), `types <out>` (write TS types), `auth-config` (apply auth settings), `status` |
| `supabase/migrations/0001_baseline.sql` … `0008_safety.sql` | Schema, one concern per file |
| `supabase/tests/_helpers.sql` | Test helpers, prepended to every test file |
| `supabase/tests/<area>.test.sql` | One file per migration area |
| `supabase/schema.sql` | Replaced by a 3-line pointer to `migrations/` |

`D:\Projects\aurora-homes-app` (branch `claude/retire-app-schema`): `supabase/schema.sql` and `supabase/migrations/20261028_geo_search.sql` removed, `supabase/README.md` pointer added, `README.md:207-210` updated, `types/database.ts` generated.

---

### Task 1: Runner and test harness

**Files:**
- Create: `scripts/supabase/run.mjs`, `supabase/tests/_helpers.sql`, `supabase/tests/harness.test.sql`

**Interfaces:**
- Produces: `node scripts/supabase/run.mjs migrate | test [path] | types <outfile> | auth-config | status`. Exit code 0 on success, 1 on any failure. `test` prints one line per file: `PASS <file>` or `FAIL <file>: <postgres error message>`.
- Produces (SQL, schema `tests`, exists only inside a test transaction):
  - `tests.new_user(email text, full_name text default 'Test User') returns uuid` — inserts into `auth.users` (`aud`/`role` = `'authenticated'`, `email_confirmed_at = now()`, `raw_user_meta_data = {"full_name": …, "terms_version": "2026-11-21"}`) and returns the id.
  - `tests.as_user(uid uuid)`, `tests.as_anon()`, `tests.as_admin()` — switch `role` and `request.jwt.claims` with `set_config(..., true)`.
  - `tests.expect_error(stmt text, sqlstate text)` — runs `stmt` in a subtransaction; raises `'expected % from: %'` if it succeeds or fails with another state.
  - `tests.expect_count(query text, n int)` — raises unless `select count(*) from (query)` = n.

- [ ] **Step 1: Write `supabase/tests/harness.test.sql`**

```sql
-- harness_switches_roles
select tests.as_anon();
select tests.expect_count($$select 1 where current_user = 'anon'$$, 1);
select tests.as_admin();
do $$ declare u uuid := tests.new_user('a@test.zouza'); begin
  perform tests.as_user(u);
  perform tests.expect_count(format($q$select 1 where auth.uid() = %L$q$, u), 1);
end $$;
-- harness_expect_error_catches
select tests.as_admin();
select tests.expect_error($$select 1/0$$, '22012');
```

- [ ] **Step 2: Run it, expect failure**

Run: `node scripts/supabase/run.mjs test supabase/tests/harness.test.sql` → fails (runner does not exist).

- [ ] **Step 3: Implement `run.mjs` and `_helpers.sql`**

`test` sends, per file, one query: `begin;` + `_helpers.sql` + file + `rollback;` to `POST https://api.supabase.com/v1/projects/{ref}/database/query`. `migrate` keeps applied names in `private.applied_migrations(name text primary key, applied_at timestamptz default now())` (schema `private` is not exposed to the API) and applies each new file with `begin; <file>; insert into private.applied_migrations …; commit;`. `types` calls `GET /v1/projects/{ref}/types/typescript?included_schemas=public`. `auth-config` is filled in Task 9; `status` prints applied migrations and whether each env var is set.

- [ ] **Step 4: Run it, expect `PASS supabase/tests/harness.test.sql`**
- [ ] **Step 5: Commit** — `git add scripts/supabase supabase/tests && git commit -m "Add a Supabase migration and SQL test runner"`

---

### Task 2: Baseline schema and profiles

**Files:**
- Create: `supabase/migrations/0001_baseline.sql` (copy of `origin/main:supabase/schema.sql` with the `listing-photos` bucket insert deleted), `supabase/migrations/0002_profiles.sql`, `supabase/tests/profiles.test.sql`
- Modify: `supabase/schema.sql` → pointer: `-- The schema lives in supabase/migrations/. Apply with: node scripts/supabase/run.mjs migrate`

**Interfaces:**
- Produces: `public.profiles(id, full_name, avatar_url, role, verified, terms_version text, terms_accepted_at timestamptz, created_at)` — no `email` column. Trigger `on_auth_user_created` → `public.handle_new_user()` (security definer, `set search_path = ''`) copying `full_name` (default `'Zouza user'`), `terms_version`, and `terms_accepted_at = now()` when `terms_version` is present, from `raw_user_meta_data`.
- Rules: anyone (anon included) selects profiles; a user updates only their own row and only `full_name`, `avatar_url`, `role` (column grants: `revoke insert, update, delete on public.profiles from anon, authenticated; grant update (full_name, avatar_url, role) on public.profiles to authenticated`). Drop policy "Users manage own profile".

- [ ] **Step 1: Write `profiles.test.sql`**

```sql
-- signup_creates_profile
do $$ declare u uuid := tests.new_user('a@test.zouza', 'Ana'); begin
  perform tests.expect_count(format($q$select 1 from public.profiles where id=%L and full_name='Ana' and terms_version='2026-11-21' and terms_accepted_at is not null$q$, u), 1);
end $$;
-- profiles_public_but_no_email_column
select tests.expect_count($$select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='email'$$, 0);
-- user_cannot_verify_self / cannot_edit_others
do $$ declare a uuid := tests.new_user('a2@test.zouza'); b uuid := tests.new_user('b2@test.zouza'); begin
  perform tests.as_user(a);
  perform tests.expect_error(format($q$update public.profiles set verified=true where id=%L$q$, a), '42501');
  update public.profiles set full_name = 'Ana B' where id = a;
  update public.profiles set full_name = 'Hacked' where id = b;  -- silently matches 0 rows
  perform tests.as_anon();
  perform tests.expect_count(format($q$select 1 from public.profiles where id=%L and full_name='Ana B'$q$, a), 1);
  perform tests.expect_count(format($q$select 1 from public.profiles where id=%L and full_name='Hacked'$q$, b), 0);
end $$;
```

- [ ] **Step 2: Run** `node scripts/supabase/run.mjs test supabase/tests/profiles.test.sql` → FAIL (no tables yet).
- [ ] **Step 3: Write `0001_baseline.sql` and `0002_profiles.sql`; run `node scripts/supabase/run.mjs migrate`** → prints `applied 0001_baseline.sql`, `applied 0002_profiles.sql`.
- [ ] **Step 4: Run the test** → `PASS`.
- [ ] **Step 5: Commit** — `git commit -m "Baseline schema from the website, profiles without email and with terms acceptance"`

---

### Task 3: Listings fields, defaults and guards

**Files:**
- Create: `supabase/migrations/0003_listings.sql`, `supabase/tests/listings.test.sql`

**Interfaces:**
- Produces on `public.listings`: `mode in ('rent','buy','stay','live')`; `property_type` adds `'loft'`; `status in ('draft','published','archived','pending_review','removed')`; new `faq jsonb not null default '[]'`, `location_approximate boolean not null default true`; `slug` nullable, filled by trigger.
- Produces trigger `listings_defaults` (before insert/update, `public.listing_defaults()`, security definer, `set search_path = ''`): fills `slug` = lowercase title with non-alphanumerics → `-`, plus `-` + first 8 hex chars of the id; fills `owner_name` from `profiles.full_name`; sets `updated_at = now()`.
- Produces trigger `listings_guard` (before update/insert, `public.listing_guard()`): when `current_setting('role') <> 'service_role'` and caller is not superuser, rejects with `errcode '42501'` any new status of `pending_review`/`removed`, and any change to a row whose old status is `removed`.
- Column grants: `revoke insert, update on public.listings from anon, authenticated;` then grant insert and update to `authenticated` on every column except `verified_owner, verified_property, last_verified_at, rating, review_count, owner_name, slug, created_at, updated_at`.
- Read rule unchanged in this task (`status = 'published' or owner_id = auth.uid()`); Task 7 adds blocks.

- [ ] **Step 1: Write `listings.test.sql`** with tests `owner_publishes_stay_loft` (insert with `mode='stay'`, `property_type='loft'`, `status='published'`, no slug → row has a non-null slug ending in the id prefix and `owner_name` = profile name), `anon_reads_published_not_draft` (expect_count 1 then 0), `other_user_cannot_edit` (update by B matches 0 rows), `owner_cannot_self_verify` (update `verified_property=true` → `42501`), `owner_cannot_set_rating` (`42501`), `owner_cannot_set_removed` (`42501`), `owner_cannot_unremove` (admin sets `removed`; owner sets `published` → `42501`), `insert_for_other_owner_rejected` (insert with `owner_id` = B as A → `42501`).
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Write `0003_listings.sql`; `migrate`.**
- [ ] **Step 4: Run** → PASS (and re-run `profiles.test.sql` → PASS).
- [ ] **Step 5: Commit** — `git commit -m "Listings: stays, lofts, FAQ, approximate location, slug and server-only trust fields"`

---

### Task 4: Photos, features and the storage bucket

**Files:**
- Create: `supabase/migrations/0004_photos.sql`, `supabase/tests/photos.test.sql`

**Interfaces:**
- Produces bucket `listing-images`: public, `file_size_limit = 5242880`, `allowed_mime_types = '{image/jpeg,image/png,image/webp}'`. `storage.objects` policies: select where `bucket_id = 'listing-images'`; insert/update/delete only where `bucket_id = 'listing-images' and (storage.foldername(name))[1] = auth.uid()::text` and the caller is not anonymous (`coalesce((auth.jwt()->>'is_anonymous')::boolean, false) = false`).
- `listing_images` and `listing_features`: replace `using (true)` select with "listing is visible" (`exists (select 1 from public.listings l where l.id = listing_id)`, which inherits the listings read rule); insert/update/delete only when that listing's `owner_id = auth.uid()`.
- Trigger `listing_images_cap` (before insert): rejects with errcode `'23514'` and message `'photo_limit'` when the listing already has 15 rows.

- [ ] **Step 1: Write `photos.test.sql`**: `owner_adds_photo`, `other_user_cannot_add_photo` (`42501`), `draft_photos_hidden_from_anon` (count 0), `sixteenth_photo_rejected` (insert 15 rows, 16th → `23514`), `upload_outside_own_folder_rejected` (as A, `insert into storage.objects(bucket_id, name, owner_id) values ('listing-images', '<B id>/x/0.jpg', A)` → `42501`), `upload_inside_own_folder_allowed`.
- [ ] **Step 2: Run** → FAIL. **Step 3:** write migration, `migrate`. **Step 4:** run all tests → PASS.
- [ ] **Step 5: Commit** — `git commit -m "Listing photos: owner-only writes, 15-photo cap, listing-images bucket"`

---

### Task 5: Conversations and messages

**Files:**
- Create: `supabase/migrations/0005_messages.sql`, `supabase/tests/messages.test.sql`

**Interfaces:**
- `conversations` gains `seeker_last_read_at timestamptz`, `owner_last_read_at timestamptz`; unique `(listing_id, seeker_id)`; indexes on `seeker_id`, `owner_id`, `messages(conversation_id, created_at)`.
- Insert rule on `conversations` (replaces "Seekers start conversations"): `seeker_id = auth.uid()`, the listing is `published`, `owner_id` equals that listing's `owner_id`, and `seeker_id <> owner_id`. No client update/delete (`revoke update, delete`).
- Insert rule on `messages` (replaces "Participants send messages"): caller is a participant, `sender_id = auth.uid()`, `sender_kind = 'user'`. No client update/delete.
- Trigger `messages_touch` (after insert): sets the conversation's `last_message_at = new.created_at`.
- Function `public.mark_conversation_read(conversation_id uuid) returns void` (security definer, `set search_path = ''`): sets the caller's side's `*_last_read_at = now()`; does nothing if the caller is not a participant.
- `alter publication supabase_realtime add table public.messages;`

- [ ] **Step 1: Write `messages.test.sql`**: `seeker_starts_and_both_read`, `cannot_start_on_draft` (`42501`), `cannot_start_on_own_listing` (`42501`), `cannot_name_wrong_owner` (`42501`), `cannot_send_as_other` (sender_id = other → `42501`), `outsider_reads_nothing` (count 0), `mark_read_sets_only_my_side`, `messages_in_realtime_publication` (expect_count on `pg_publication_tables` where `pubname='supabase_realtime' and tablename='messages'` = 1).
- [ ] **Step 2–4:** run → FAIL; write migration, `migrate`; run all → PASS.
- [ ] **Step 5: Commit** — `git commit -m "Conversations and messages: participants only, send as yourself, read markers, realtime"`

---

### Task 6: Viewing requests, busy dates, reviews and saved homes

**Files:**
- Create: `supabase/migrations/0006_requests_reviews.sql`, `supabase/tests/requests_reviews.test.sql`

**Interfaces:**
- `viewing_requests`: add `kind text not null default 'viewing' check (kind in ('viewing','stay','move_in'))`, `end_date date`, `guests int`, status adds `'cancelled'`; `requester_id` becomes `not null` with `on delete cascade`; `requester_name` filled from the profile by trigger. Rules: insert when `requester_id = auth.uid()`, listing published, listing owner ≠ caller; select by requester or the listing's owner. Trigger `viewing_requests_transition` (before update): the listing owner may only move `pending → confirmed|declined`; the requester may only move `pending|confirmed → cancelled`; any other change by a client → `42501`.
- `public.listing_busy_ranges(p_listing_id uuid) returns table(start_date date, end_date date)` (security definer, stable): confirmed rows of kind `stay` or `move_in` only; no names. Granted to anon and authenticated.
- `reviews`: `author_id` not null, `on delete cascade`; unique `(listing_id, author_id)`; `author_name` from profile by trigger. Insert when `author_id = auth.uid()`, listing published, not own. Trigger `reviews_rollup` (after insert/update/delete, security definer): recomputes `listings.rating` (avg, 2 decimals) and `review_count`.
- `saved_listings`: unchanged rule; test only.

- [ ] **Step 1: Write the tests**: `seeker_requests_owner_confirms`, `requester_cannot_confirm` (`42501`), `owner_cannot_cancel_for_requester` (`42501`), `requester_cancels`, `busy_ranges_show_dates_not_names` (anon sees one range; the function's result has exactly two columns), `outsider_sees_no_requests`, `review_updates_rating` (ratings 4 and 5 → listing rating 4.50, count 2), `second_review_rejected` (`23505`), `cannot_review_own_listing` (`42501`), `saved_is_private` (B counts 0 of A's saves).
- [ ] **Step 2–4:** FAIL → migrate → PASS.
- [ ] **Step 5: Commit** — `git commit -m "Viewing requests with transitions and busy dates; reviews with rollup; saved homes"`

---

### Task 7: Safety — filter, reports, blocks

**Files:**
- Create: `supabase/migrations/0007_safety.sql`, `supabase/migrations/0008_banned_terms.sql` (generated seed), `scripts/supabase/banned-terms.mjs`, `supabase/tests/safety.test.sql`

**Interfaces:**
- `create extension if not exists unaccent;` table `private.banned_terms(term text primary key)`; function `public.contains_banned_term(t text) returns boolean` (immutable-ish, security definer): true when any term matches `lower(unaccent(t))` on word boundaries (`~* ('\m' || term || '\M')`).
- Triggers rejecting with errcode `'23514'` and message `'content_rejected'` on insert/update of: `listings` (title, summary, description, faq::text), `messages.body`, `reviews.comment`, `profiles.full_name`.
- `0008_banned_terms.sql` is generated by `node scripts/supabase/banned-terms.mjs > supabase/migrations/0008_banned_terms.sql` from the English and Spanish lists of LDNOOBW (github.com/LDNOOBW/List-of-Dirty-Naughty-Obscene-and-Otherwise-Bad-Words, CC BY 4.0; credit it in a comment), lowercased and unaccented. Drop entries that are ordinary property words (review the diff for `ass` in `class`-style false hits: word boundaries handle substrings; remove standalone terms that are normal Spanish, e.g. `coño` stays, `pollo`-type food words go).
- `public.reports(id uuid pk, reporter_id uuid references profiles on delete set null, target_type text check in ('listing','user','message','review'), target_id uuid not null, reason text not null check in ('spam','scam','offensive','inappropriate_photos','wrong_info','other'), details text, status text not null default 'open' check in ('open','actioned','dismissed'), created_at)`. Rule: insert by signed-in, non-anonymous callers with `reporter_id = auth.uid()`; no client select/update/delete.
- `public.blocks(blocker_id uuid references profiles on delete cascade, blocked_id uuid references profiles on delete cascade, created_at, primary key (blocker_id, blocked_id), check (blocker_id <> blocked_id))`. Rule: the blocker selects/inserts/deletes own rows.
- `public.is_blocked_between(a uuid, b uuid) returns boolean` (security definer, stable): a block exists in either direction.
- Read and write rules extended: listings select hides rows whose owner is blocked either way with the caller; messages insert also requires `not is_blocked_between(seeker, owner)`; messages and reviews select hide rows from blocked users; conversations insert requires no block.

- [ ] **Step 1: Write `safety.test.sql`** (insert a known term, e.g. `'testbadword'`, into `private.banned_terms` inside the test so assertions don't depend on the seed): `filter_rejects_listing_title` (`23514`), `filter_ignores_case_and_accents` (`'TESTBADWORD'` and `'testbádword'` → `23514`), `filter_allows_substring` (`'xtestbadwordx'` passes — whole words only), `filter_rejects_message_review_name`, `report_insert_only` (insert ok; select count 0; anon insert → `42501`), `block_hides_listings` (A blocks B → A counts 0 of B's published listings), `blocked_cannot_send_in_existing_thread` (thread exists, then A blocks B → B's message insert `42501`), `blocked_cannot_start_thread`.
- [ ] **Step 2–4:** FAIL → generate seed, migrate → PASS (whole suite).
- [ ] **Step 5: Commit** — `git commit -m "Safety: word filter, reports, blocks hidden both ways"`

---

### Task 8: Database advisors clean

**Files:** whichever migration a fix belongs to, via a new `supabase/migrations/0009_advisor_fixes.sql` if needed.

- [ ] **Step 1:** Run `GET /v1/projects/{ref}/advisors/security` and `/advisors/performance` (add `node scripts/supabase/run.mjs advisors` to the runner, printing name, level and table).
- [ ] **Step 2:** Fix every `ERROR`- and `WARN`-level security item (e.g. mutable `search_path`, RLS without policies on `verification_records`, `ai_generated_content` and `waitlist_signups` is intended: leave them policy-less and note it) and the unindexed-foreign-key performance items.
- [ ] **Step 3:** `migrate`, rerun `advisors` → no ERROR/WARN except the noted ones; rerun all tests → PASS.
- [ ] **Step 4: Commit** — `git commit -m "Clear Supabase advisor warnings"`

---

### Task 9: Auth settings

**Files:**
- Modify: `scripts/supabase/run.mjs` (`auth-config` command)

**Interfaces:**
- `auth-config` sends `PATCH /v1/projects/{ref}/config/auth` with: `site_url: "https://zouza.ai"`, `uri_allow_list: "zouza://**,exp://**"`, `mailer_autoconfirm: false`, `external_anonymous_users_enabled: false`, `password_min_length: 8`, `smtp_host`/`smtp_port`/`smtp_user`/`smtp_pass` from `EMAIL_SMTP_HOST|PORT|USER|PASS`, `smtp_admin_email: "info@zouza.ai"`, `smtp_sender_name: "Zouza"`. Then `GET` the config and print each of those keys as its value, except `smtp_pass`, printed as `set`/`empty`.

- [ ] **Step 1:** Implement; run `node scripts/supabase/run.mjs auth-config`.
- [ ] **Step 2:** Expected printout: the values above, `smtp_pass: set`.
- [ ] **Step 3:** Check zouza.ai's DNS for SPF and DKIM (`nslookup -type=TXT zouza.ai`, `nslookup -type=TXT default._domainkey.zouza.ai`); report to the owner whether Namecheap's `include:spf.privateemail.com` and a DKIM record are present. Do not change DNS.
- [ ] **Step 4: Commit** — `git commit -m "Apply Zouza auth settings: confirmation email via info@zouza.ai, app redirects"`

---

### Task 10: Retire the app's schema and generate types

**Files (app repo, branch `claude/retire-app-schema`):**
- Delete: `supabase/schema.sql`, `supabase/migrations/20261028_geo_search.sql`
- Create: `supabase/README.md` — "The database schema is shared with zouza.ai and lives in the aurora-homes repo: `supabase/migrations/`. Do not add SQL here."
- Modify: `README.md:207-210` — same pointer instead of "run schema.sql".
- Create: `types/database.ts` via `node D:/Projects/aurora-homes/scripts/supabase/run.mjs types D:/Projects/aurora-homes-app/types/database.ts`

**Interfaces:**
- Produces: `types/database.ts` exporting `Database` (Supabase generated types) — plans 2–7 type their queries with it.

- [ ] **Step 1:** Make the changes; run `npx tsc --noEmit` in the app → no new errors (existing code doesn't import `Database` yet).
- [ ] **Step 2: Commit** — `git commit -m "Point the app at the shared schema and add generated database types"`
- [ ] **Step 3:** Append to `D:\Projects\aurora-homes\HANDOFF.md` (re-read first): the database is live, schema lives in `aurora-homes/supabase/migrations`, column names the app must use (`latitude/longitude`, `term`, `url/sort_order`), bucket `listing-images`, and that plans 2–7 will touch Codex's screens only after confirming in HANDOFF.

---

## Done when

`node scripts/supabase/run.mjs test` prints PASS for all 8 test files, `advisors` shows no unexplained warnings, `auth-config` prints the settings above, and both branches are committed locally, ready for the owner's push go-ahead.

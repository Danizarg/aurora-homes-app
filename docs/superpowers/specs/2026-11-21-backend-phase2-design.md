# Zouza phase 2: the real backend — design

Date: 2026-11-21. Status: approved by the owner on 2026-11-21 with the suggested defaults: the owner reads
report emails at info@zouza.ai daily and Claude carries out takedowns on request; listing is free at launch
and the €20/month copy is removed. Plan 1: `docs/superpowers/plans/2026-11-21-backend-1-database-foundation.md`.

## Why

The app (Expo, iPhone first) and the website zouza.ai look finished but run on demo data: sign-in accepts any
password, published homes live only on the phone, chats and viewing requests never reach the other person.
Phase 2 makes them real so the app can go to TestFlight and then the App Store. Phase 3 (Apple Developer
enrolment, store listing) comes after. The owner's budget is €100 a month in total.

**Success:** on two iPhones, person A signs up, confirms their email, publishes a home with photos; person B
signs up, finds that home, saves it, messages A and asks for a viewing; A sees both and confirms the viewing;
either can delete their account from inside the app and their data is gone.

## Goals

1. **One Supabase project shared by the app and the website** (same users, same listings). It exists:
   ref `nltrwifcwxrsyabyxswi`, region eu-west-1, Free plan, empty database. Keys are in
   `aurora-homes/.env.local` (URL, publishable, secret, management token) and `aurora-homes-app/.env`
   (URL and publishable only).
2. **Real accounts in the app:** email + password sign-up, log-in, log-out, forgot password with a working
   reset, sessions that survive app restarts, and in-app account deletion (App Store rule 5.1.1(v)).
3. **Real listings:** a signed-in owner publishes a home with up to 15 photos; it appears for everyone; the
   owner can edit, unpublish and delete it from the owner dashboard.
4. **Real interactions:** saved homes, conversations and messages between seeker and owner, viewing requests
   that the owner can confirm or decline, all stored per user and private to the people involved.
5. **Safety for user content (App Store rule 1.2):** automatic filtering before content goes live; report a
   listing, user, message or review; block a user (blocked users cannot message you, and their listings,
   messages and reviews are hidden from you); every report and block emails info@zouza.ai; Zouza can take
   down content and ban users.
6. **Honest content:** real listings show only real ratings and review counts ("New" when there are none);
   invented ratings stay on the demo homes only, and the demo homes leave before the first external
   TestFlight build.
7. **Consent for AI:** before voice, Suza's planner or the AI listing writer first sends anything to an AI
   provider, a one-time sheet names the providers and asks permission (App Store 5.1.2(i)); without it the
   app uses its on-device fallbacks. Withdrawable in Profile.

## Non-goals (this phase)

- Payments, subscriptions, in-app purchase, deposits.
- Push notifications (messages show when the app is opened; push comes with the Apple account in phase 3).
- Sign in with Apple and Google (Apple's needs the Apple Developer account; added in phase 3).
- An admin panel (reports arrive by email; takedowns and bans are done from the Supabase dashboard or by
  Claude on request, following a written procedure).
- Moving the website onto the real database. The website keeps running on its demo data until a later
  phase; its broken publish flow (non-UUID ids) is not fixed here.
- Hosting the app's AI and voice routes (`/api/suza/plan|speak|transcribe`) for production. That is its own
  follow-up (phase 2b): the voice clip cache assumes one long-running server and needs redesign for
  serverless. The voice itself must not change (owner's instruction: keep the current voice).
- Android, iPad.

## Anti-goals (a failure even if it works)

- The secret key or management token anywhere in the app bundle, a commit, a log or the chat.
- Any user able to read another user's email address, messages, saved homes or viewing requests.
- Users able to mark themselves or their listings as "verified", or to set ratings.
- Breaking what works today: the voice, the demo experience when signed out, Expo Go testing.
- Monthly cost above budget: Supabase Free while building, Pro ($25) only at launch.

## Decided by the owner

- Name in all user-facing text: Zouza. iPhone only for the first release. Support email info@zouza.ai.
- Budget €100/month; one Supabase project shared with zouza.ai (owner created it, 2026-11-21).
- Claude owns the backend; Codex keeps working on UI (see Coordination).

## Claude's calls (owner may overrule)

- **Schema base:** the website's deployed schema (`aurora-homes`, `origin/main:supabase/schema.sql`, 13
  tables) is the superset and becomes the single source of truth, kept as numbered migrations in
  `aurora-homes/supabase/migrations/`. The app's `supabase/schema.sql` and its geo migration are retired
  and replaced by a pointer. The website's column names win (`latitude/longitude`, `term`, `url/sort_order`);
  only the app's data layer (`lib/supabase/*`) is renamed to match. One exception: the photo bucket is
  `listing-images` (the app's name); the website's `listing-photos` is dropped from the baseline and the
  website's wizard and image allow-list move to `listing-images` when it joins.
- **Additions to that schema:** `listings.mode` also allows `stay` and `live`; `property_type` also allows
  `loft`; `listings.faq jsonb` and `location_approximate boolean` (default true); `slug` filled by a
  trigger; a profile row created automatically for every new account, recording `terms_version` and
  `terms_accepted_at`; `profiles.email` dropped (the login email stays in Supabase Auth only); storage
  bucket `listing-images` (public read, writes only inside the uploader's own `<user id>/` folder);
  viewing requests get the app's booking fields (kind stay/move-in/viewing, end date, guests) and a
  `cancelled` status; a `listing_busy_ranges(listing_id)` function that returns only the dates of confirmed
  stays and move-ins (no names), so calendars still grey out taken nights; polymorphic `reports`
  (listing, user, message, review) and `blocks`; a listing status `removed` that only Zouza can set; a
  per-user read marker for conversations; `messages` added to the realtime publication.
- **Location privacy:** the public map pin is the geocoded point offset by roughly 200–300 m; no exact
  coordinates are stored in this phase.
- **Who may write what (row-level security):** everyone reads published listings, their photos and features,
  and owners' public name/avatar/verified badge (never email). Owners write only their own listings, photos
  and features. Trust fields (verified flags, rating, review count, `last_verified_at`, status `removed`)
  are writable by no client, only by the server: enforced with column-level grants, since row rules alone
  cannot protect single columns. Messages: only the two participants read; a sender can only send as
  themselves. Conversations can only be started by a signed-in seeker about a published listing, naming that
  listing's real owner. Viewing requests: requester and listing owner read; only the owner changes status; the
  requester may cancel. Reviews: one per user per listing, never on your own. Contact form: insert only.
  Saved homes: private to the user.
- **Accounts:** sign-in is required to publish, message, save to the cloud or request a viewing. The app's
  anonymous "publish without an account" path is removed and anonymous sign-ins stay disabled in Supabase.
  Signed out, the app stays browsable (demo homes plus real ones, saves kept on the device and uploaded on
  sign-in).
- **Email:** confirmation required on sign-up. Supabase sends auth emails through the existing
  info@zouza.ai mailbox (Namecheap Private Email, `mail.privateemail.com:587`, credentials already in the
  website's `.env.local`), because Supabase's own sender only delivers to the project team, 2 emails/hour.
  Sender exactly info@zouza.ai, port 587. Checked 2026-11-21: SPF is set (`include:spf.privateemail.com`),
  but there is no DKIM record and no DMARC record, so confirmation mail is likely to land in spam until the
  owner adds them (see Owner actions). Supabase caps custom-SMTP auth mail at 30/hour by default.
  Links go straight to the app, no web page in between: redirect allow-list `zouza://**` and `exp://**`
  (the latter removed at launch), `emailRedirectTo`/`redirectTo` = `Linking.createURL('/auth/callback')`,
  and a new `app/auth/callback` route that reads the tokens and calls `setSession` (implicit flow, the
  supabase-js default). Recovery links open a "set a new password" screen. The app gets a "check your
  email" state.
- **Listing ids and photos:** the app creates the listing's UUID before uploading (`expo-crypto`), stores
  photos at `listing-images/<user id>/<listing id>/<n>.jpg` (resized to ≤ 1600 px, JPEG ~0.8, with
  `expo-image-manipulator`; both work in Expo Go), max 15. Deleting a listing removes its photo folder
  through the Storage API first, then the row.
- **Filtering before going live:** listing text, messages, reviews and display names pass a word-list check
  in the database; listing text and each photo also go through OpenAI's free moderation endpoint (via a
  Supabase Edge Function). Clean listings publish at once; flagged ones wait as `pending_review` and email
  info@zouza.ai.
- **Catalogue reads:** the app talks to Supabase directly with the publishable key and the rules above (no
  extra server). The website's `/api/v1` branch (`app-api-v1`) is not used by the app in this phase.
- **Demo homes:** the 10 demo homes stay in the app, labelled "Example" with messaging and booking turned
  off, until the first external TestFlight build, which removes them. Real listings show alongside them.
- **Account deletion:** a Supabase Edge Function `delete-account` (free on the current plan; holds the
  secret key server side, never in the app). It checks who is calling, removes every photo under
  `listing-images/<user id>/` through the Storage API (Supabase blocks deleting photos from SQL and refuses
  to delete a user who still owns files), deletes their reviews, viewing requests, blocks, read markers and
  reports they filed (reports *about* them are kept, anonymised, for safety), then deletes the account so
  profile, listings, saved homes and conversations cascade (the other person's copy of the thread goes too).
  Confirmed in-app with a typed confirmation; signs out and clears the device's data afterwards.
- **Alerts:** each new report or block, and each flagged listing, emails info@zouza.ai through the same
  mailbox (database webhook → Edge Function).
- **Messages in real time:** Supabase Realtime on `messages` for an open thread; inbox refreshes on focus.
  Suza (the AI assistant) chats stay on the device and are not stored in the database.
- **Applying changes:** Claude applies migrations to the project through the Supabase Management API with
  the owner's token, after the owner approves this design; each migration is also committed to git.
  Supabase settings Claude will change through the same API (each listed for the owner first): custom SMTP,
  site URL and redirect URLs, email confirmation on, anonymous sign-ins off, minimum password length 8.
- **Vercel:** no Supabase variables are pushed to Vercel in this phase (the website would switch from demo
  data to the still-empty real database). Done when the website joins in.

## Before external TestFlight (not backend code, but blocking review)

- Real Terms (zero tolerance for objectionable content and abusive users, 18+, owners' right to list and to
  the photos, takedown and ban rights with the 24-hour commitment) and a full Privacy Policy (controller,
  purposes, processors incl. AI providers, EU hosting, retention, rights), hosted on zouza.ai and linked in
  the app. They need the legal answers still open in `LEGAL-DRAFT-app.md`.
- A data inventory for the App Store privacy label (contact info, user content, audio, user ID, support).
- A pre-confirmed reviewer account with a listing, a conversation and a viewing request, plus a second
  account to chat with; Supabase on Pro (no pausing) before the first review.

- The €20/month owner subscription the app advertises (`app/pricing.tsx`, `app/(tabs)/profile.tsx:84`,
  `app/create-listing/index.tsx:643`) does not exist; owner's decision: listing is free at launch and that
  copy is removed (plan 3). Charging inside the app later must use in-app purchase (3.1.1).

## Owner actions outside the code

- Namecheap (zouza.ai's Private Email): turn on DKIM and add a DMARC record; confirm the mailbox is a paid
  plan (trial plans send 20 emails/hour).
- Supabase: accept the Data Processing Agreement (organization settings → Legal) before real users sign up.
- Commit to reading report alerts at info@zouza.ai daily and acting within 24 hours (App Store 1.2).

## Coordination with Codex

The data layer (`lib/supabase/*`, `lib/auth/*`, new `lib/data/*`), auth screens, `create-listing`,
`owner-dashboard`, account deletion and the database are Claude's. Screens in Codex's half that must switch
from local data to the new data layer (`(tabs)/messages`, `messages/[id]`, `(tabs)/wishlists`,
`wishlists/saved`, `bookings`, `listing/[id]`, `(tabs)/profile`, `components/booking/*`) are changed by
Claude only after posting the exact files in `HANDOFF.md` and Codex confirming they are free; otherwise
Claude exposes hooks and Codex wires them.

## Left to the builder

Migration file split and naming; TypeScript types generated from the database; how the data layer caches
(e.g. a small query hook vs a library); exact screen copy within the existing UI kit; test approach (SQL
checks of every rule with two test users, plus the two-iPhone walkthrough above).

## Costs

Supabase Free until launch (watch: pauses after 7 days of no activity; 500 MB database, 1 GB photo storage).
Pro $25/month from launch. Email: existing mailbox, no extra cost. Edge Functions and OpenAI moderation: free.
No other new paid service.

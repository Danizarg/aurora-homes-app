# Zouza — iOS / Android app

**Just tell Suzi what you need. She'll do the rest.**

The Zouza mobile app: an Expo / React Native (TypeScript) app for the
Spain-first AI real-estate platform at [zouza.ai](https://zouza.ai). Buyers
and tenants search homes and ask Suzi about any property; owners photograph
their place and let Suzi write the listing.

Zouza is a pure intermediary: no payments, escrow, rent collection, deposits
or legal/tax/financial advice, in code or copy. Tenants and buyers pay
nothing; owners pay a flat €20/month while a listing is live; there are no
transaction fees of any kind.

The web product and its development context live in the
[zouza-ai](https://github.com/Danizarg/zouza-ai) repository (`CLAUDE.md`
there is the source of truth for product, pricing and design decisions).

## Running locally

```bash
npm install
npx expo start
```

Scan the QR code with **Expo Go** on an iPhone (App Store). The phone and
the PC must be on the same Wi-Fi; if they aren't, start with
`npx expo start --tunnel` instead. No backend or keys are needed: the app
runs on demo listings and local storage until Supabase is configured
(below), and Suzi answers through zouza.ai.

Expo Go only runs projects on the current SDK, so keep `expo` on the
version Expo Go supports (SDK 58 as of 2026-10-16).

## Suzi

Suzi runs on a real model. The app holds **no provider key**: it calls two
endpoints on the website, which hold the key, the prompts and the
per-visitor budget:

| App surface | Calls | Falls back to |
|---|---|---|
| Ask Suzi on a listing (`PropertyAgentPanel`) | `POST https://zouza.ai/api/suzi/ask` | the listing's FAQ matcher |
| List with Suzi — generation step | `POST https://zouza.ai/api/suzi/generate` | the local listing template |

`lib/ai/suzi.ts` is the bridge; `lib/ai/service.ts` is the deterministic
layer it falls back to when offline or rate-limited. `EXPO_PUBLIC_APP_URL`
overrides the website origin (defaults to production, so a TestFlight build
needs no `.env`).

## Design system

The UI follows the Airbnb mobile app's layout and visual language: white
canvas, near-black text, hairline dividers, 8/12px radii, pill search bar,
category tabs, square photo cards with hearts and "Guest favourite" badges,
sticky price/CTA bars and a gradient primary button. The accent is Zouza's
violet brand scale (brand-500 `#7255F0`, from `design/tokens.json` in
zouza-ai); `constants/theme.ts` holds it in one `brand` block, so changing
those values re-skins the accent across the app. The brand mark is
`components/brand/ZMark.tsx` — the same Z mark as the website. Never a
sparkles icon for Zouza or Suzi.

## Suza AI and the map-first experience

Opening the app feels like exploring the planet with a personal agent:

- **Earth intro** (`app/intro.tsx`, `components/globe/Globe.tsx`) — a real 3D
  globe rendered with raw WebGL through `expo-gl` (NASA Blue Marble texture,
  sun, atmosphere, stars). It spins, turns to the visitor's city (with
  location permission; otherwise Marbella, clearly labelled as a demo
  destination) and dollies in; the native map then continues the fly-in from
  country to city. Skip is always available, reduced-motion settings shorten
  the sequence, and Profile → *Replay the Earth intro* runs it again.
- **Suza greets and asks** what you're here for — buy, rent, short stay, or
  list your own property — spoken aloud (device speech synthesis via
  `expo-speech`) and answerable by tap, text, or voice where available.
- **The map is home** (`app/(tabs)/index.tsx`, `components/discovery/*`):
  every published listing with real coordinates is a price pill; dense areas
  cluster (`supercluster`) and split as you zoom; tapping a pin slides up a
  preview card; panning updates the search viewport. Listings without their
  own coordinates stay in list mode and are flagged for location completion.
  The **Map / List** toggle switches to the Airbnb-style list over the same
  results. Web shows list mode (react-native-maps has no web renderer).
- **One search** (`lib/search/service.ts`, `types/search.ts`): typed
  `SearchCriteria` (intent, bounds, destination, budget, rooms, amenities,
  pets, dates, distance constraints…) drive the map, the list, the filters and
  Suza alike. Geographic constraints are real: distance to the coast and to
  beaches, supermarkets, schools, transport, gyms and restaurants comes from
  OpenStreetMap via Photon (`lib/geo/proximity.ts`), the airport from a
  bundled table; "within 15 minutes of X" is converted to a straight-line
  radius and Suza says so (no routing API). Unknown distances are never
  treated as near or far. Demo listings are flagged in results.
- **Geocoding** (`lib/geo/geocode.ts`): worldwide place search via Photon
  (OpenStreetMap, no key) with a small offline city table marked `source:
  "local"`. Searching "Marbella" flies the map there; "Puerto Banús" zooms
  further in.
- **Suza's brain** (`lib/suza/*`): a deterministic parser turns sentences
  like *"two-bedroom apartment near the ocean in Marbella under €2,000 a
  month, I have a dog"* into criteria, geocodes the place, and emits typed,
  validated actions (`setTarget`, `setFilters`, `moveMap`, `openListing`,
  `openUpload`…) that the executor applies to the store, the map and
  navigation. She asks one relevant question at a time, never repeats one,
  and stops when you say "just show me everything". An optional server
  planner (`POST /api/suza/plan`, enabled with
  `EXPO_PUBLIC_SUZA_REMOTE_PLANNER=true`) can replace the parser; its output
  is validated the same way and any failure falls back to the local planner.
- **Voice** (`lib/voice/*`): replies are spoken with `expo-speech`
  (mute/stop in the panel). Voice input uses the browser's speech recognition
  on the web, and on iOS/Android records with `expo-audio` and posts the clip
  to `POST /api/suza/transcribe` (enable with `EXPO_PUBLIC_SUZA_TRANSCRIBE=true`
  once the endpoint exists). Without it the mic is disabled with an
  explanation and typing works fully. No prerecorded audio is ever used.
- **Owners**: "sell" / "rent out" (from Suza, the intro or the intent chip)
  opens the existing List with Suzi builder with the purpose pre-set; the
  typed area is geocoded for real coordinates (flagged approximate when only
  the city is known) and the published listing appears on the map and list.

### Server endpoints the app can use (all optional)

| Endpoint | Enabled by | Request | Response |
|---|---|---|---|
| `POST /api/suza/plan` | `EXPO_PUBLIC_SUZA_REMOTE_PLANNER=true` | `{ message, context: BrainContext }` | `{ reply, actions: SuzaAction[], question? }` |
| `POST /api/suza/transcribe` | `EXPO_PUBLIC_SUZA_TRANSCRIBE=true` | multipart `audio`, `language` | `{ text }` |

Keys stay on the server; the app bundle holds none.

### Database

`supabase/migrations/20261028_geo_search.sql` adds `lat`/`lng` (for
projects created before they existed), a `(lat, lng)` index on published
listings, `rental_duration` and `location_approximate`.

## Project structure

```
app/                    Expo Router screens
  intro.tsx               Earth intro + Suza's first question
  (tabs)/                Discovery map (home), Wishlists, Suzi, Messages, Profile
  search-modal.tsx        "Where to?" — worldwide geocoding, intent, budget
  wishlists/saved.tsx     Saved homes list
  listing/[id].tsx        Listing detail + Ask Suzi
  create-listing/          List with Suzi (photos → address → price → chat → publish)
  messages/[id].tsx, auth/, legal/, pricing, trust, contact, rent-out, sell
components/
  brand/ZMark             The brand mark
  globe/                  WebGL Earth (expo-gl)
  discovery/              Map, clusters, preview card, bar, list, filters, intent
  suza/                   Orb + conversation sheet
  ui/                     Button, Card, Chip, Badge, TextField, ScreenHeader, Divider…
  search/                 SearchPill, CategoryTabs, FiltersSheet
  listings/ListingCard    Feed card + CompactListingCard for carousels
  host/HostLanding        Rent out / Sell landing pages
  ai/PropertyAgentPanel   Per-listing Suzi chat
lib/
  suza/                   Parser, question policy, planner, typed actions, executor
  voice/                  Text-to-speech, speech-to-text (web + native)
  search/                 Shared search service + sync hook
  store/discovery.ts      Unified state (intent, criteria, camera, results, chat)
  globe/                  Sphere geometry, shaders, matrices
  ai/suzi.ts              Real Suzi via zouza.ai (with fallback)
  ai/service.ts           Deterministic layer
  geo/                    Geocoding, proximity, bounds, places, airports, travel
  listings/               Presentation helpers (price, rating, headline) + filtering
  supabase/, auth/, mock/
constants/theme.ts        Airbnb-style tokens with the Zouza brand accent
supabase/schema.sql       Postgres schema + RLS
```

## What's real vs. demo

- **Real**: navigation, Suzi answers and listing generation (through
  zouza.ai), the full List-with-Suzi flow, filters and search, saved
  listings and locally published listings (AsyncStorage).
- **Demo until Supabase is configured**: the Spain-first sample listings,
  conversations/messages, photo feature detection, and accounts (sign-in
  works against Supabase only when configured; otherwise it is a demo
  session).

## Connecting Supabase

Copy `.env.example` to `.env`, fill `EXPO_PUBLIC_SUPABASE_URL` and
`EXPO_PUBLIC_SUPABASE_ANON_KEY`, run `supabase/schema.sql` in the project's
SQL editor, enable **Anonymous sign-ins** under Authentication → Providers,
and restart `npx expo start`. Use the same Supabase project as the website
so listings published in the app appear on zouza.ai.

## TestFlight (from Windows, macOS or Linux — no Xcode needed)

Builds run in the cloud on EAS. You need an Apple Developer Program
membership and an Expo account.

```bash
npm install -g eas-cli
eas login
eas build:configure            # links this repo to an EAS project (one-time)
eas build --platform ios --profile production
eas submit --platform ios --latest
```

`eas build` asks you to sign in with your Apple ID the first time and
creates the signing certificate and provisioning profile for you. `eas
submit` uploads the build to App Store Connect; it appears under TestFlight
within a few minutes of processing.

Then in App Store Connect → TestFlight:

1. **Internal testing**: add team members; they get the build immediately.
2. **External testing**: create a group, add tester emails (up to 10,000),
   and submit the build for Beta App Review. The first build of an app is
   reviewed by Apple (usually within a day); later builds are usually
   automatic.

Bundle identifier: `ai.zouza.app`. App name: Zouza. Version is managed by
EAS (`appVersionSource: remote`, build number auto-increments).

## Before App Store review

- Terms, privacy and disclaimer screens still carry placeholder legal
  copy; Apple needs a public privacy-policy URL in App Store Connect.
- The app offers account creation, so Apple requires in-app account
  deletion (guideline 5.1.1(v)) — not built yet.
- Demo listings are labelled as examples on the website; label them in the
  app too, or connect Supabase so real inventory shows.
- App Store screenshots and the app privacy questionnaire (data collected:
  email, listing content, photos, messages).
- Push notifications for messages and viewing requests.
- Moderation/reporting for fake listings.

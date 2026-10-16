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

Scan the QR code with **Expo Go** on an iPhone. No backend or keys are
needed: the app runs on demo listings and local storage until Supabase is
configured (below).

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

`constants/theme.ts` mirrors `design/tokens.json` in zouza-ai hex for hex
(design system v2, violet). The brand mark is `components/brand/ZMark.tsx`
— the same Z mark as the website. Never a sparkles icon for Zouza or Suzi.

## Project structure

```
app/                    Expo Router screens
  (tabs)/                Home, Search, Suzi, Messages, Profile
  listing/[id].tsx        Listing detail + Ask Suzi
  create-listing/          List with Suzi (photos → address → price → chat → publish)
  messages/[id].tsx, auth/, legal/, pricing, trust, contact, rent-out, sell
components/
  brand/ZMark             The brand mark
  ui/                     Button, Card, Chip, Badge, EmptyState…
  listings/ListingCard
  ai/PropertyAgentPanel   Per-listing Suzi chat
lib/
  ai/suzi.ts              Real Suzi via zouza.ai (with fallback)
  ai/service.ts           Deterministic layer
  supabase/, auth/, mock/
constants/theme.ts        v2 tokens
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

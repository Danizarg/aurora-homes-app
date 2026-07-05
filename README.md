# Aurora Homes

Find your next home. Powered by AI.

Aurora Homes is an AI-first home discovery and marketplace app, built as an
Expo / React Native (TypeScript) app. Renters and buyers search verified
homes with transparent pricing and a 24/7 AI property assistant on every
listing. Owners upload photos and chat with Aurora, which builds the
professional listing, exposé, FAQ, and translations for them.

Aurora Homes is a pure intermediary marketplace in this MVP: no payments,
escrow, rent collection, or legal/tax advice.

## Running locally

```bash
npm install
npx expo start
```

Scan the QR code with the **Expo Go** app on your iPhone (App Store) to run
it on-device. No backend or API keys are required — the app runs entirely on
mock data and local storage until you configure Supabase / AI keys (see
below).

## Project structure

```
app/                    Expo Router screens (file-based routing)
  (tabs)/                Bottom tab screens: Home, Search, AI, Messages, Profile
  listing/[id].tsx        Listing detail + AI property agent
  create-listing/          AI Listing Builder (photos → address → price → AI chat → publish)
  messages/[id].tsx        Conversation detail
  auth/                    Login, signup, forgot password
  legal/                   Terms, privacy, disclaimer
components/
  ui/                      Buttons, cards, chips, badges, empty states
  listings/                ListingCard
  ai/                      PropertyAgentPanel (per-listing AI chat)
lib/
  supabase/                Supabase client + SQL schema
  ai/                      AI service abstraction (mock + real-key ready)
  mock/                    Mock listings, messages, AsyncStorage-backed storage
  auth/                    Auth abstraction (Supabase or mock session)
types/                    Shared TypeScript domain types
constants/theme.ts        Design system (colors, spacing, type scale)
supabase/schema.sql        Postgres schema + RLS policies
```

## Screens built

Home (discovery-first hero, search bar, visual carousel, quick paths, AI
explainer, owner CTA), Search (Rent/Buy/Stay/Live modes + filters), Listing
detail with AI agent chat, AI tab hub, AI Listing Builder (photos → address →
price → AI chat → generation → review → preview → publish), Rent Out, Sell,
Messages inbox + conversation, Profile, Owner dashboard, Login/Signup/Forgot
password, Contact, Trust & verification, Pricing, Terms/Privacy/Disclaimer.

## The AI Listing Builder

Instead of a long form, owners go through three quick steps — upload photos,
enter an address, optionally enter a price — then Aurora takes over in a
chat interface:

1. Aurora states what it can already see in the photos (mock computer-vision
   detection: pool, sea view, terrace, garden, kitchen style, furnishing,
   modernisation level — see `detectFeaturesFromPhotos` in `lib/ai/service.ts`).
2. Aurora asks only for what it can't detect from photos: property type,
   bedrooms, bathrooms, size, pets allowed, parking, and whether to position
   the listing as a long-term rental, holiday stay, or sale.
3. Aurora generates the full listing (title, exposé, FAQ, translations, price
   breakdown, and the property's own AI assistant knowledge base) and the
   owner reviews and publishes it.

## What's real vs. mock

- **Real**: navigation, the full AI Listing Builder flow (image picking via
  Expo Image Picker, chat-style question flow, generated content
  review/edit), filters and search logic, saved listings (persisted via
  AsyncStorage), local listing publishing (persisted via AsyncStorage).
- **Mock (by design, until you connect a backend)**: Spain-first sample
  listings, conversations/messages, AI photo feature detection, AI
  exposé/FAQ/translation generation, and the per-listing AI agent's answers.
  All mock logic lives under `lib/mock` and `lib/ai` so it can be swapped for
  real services without touching the UI.

## Connecting Supabase

1. Create a project at supabase.com.
2. Run `supabase/schema.sql` in the Supabase SQL editor.
3. Copy `.env.example` to `.env` and fill in:
   ```
   EXPO_PUBLIC_SUPABASE_URL=...
   EXPO_PUBLIC_SUPABASE_ANON_KEY=...
   ```
4. Restart `npx expo start`. `lib/supabase/client.ts` will detect the env
   vars and `isSupabaseConfigured` becomes `true` — wire up the listing
   publish/read calls in `app/create-listing/index.tsx` and `lib/mock/*` to
   use `supabase` instead of AsyncStorage where you want persistence.

Without these env vars, the app keeps working via local mock storage — no
code changes required.

## Connecting a real AI model

Add `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` to `.env`. `lib/ai/service.ts`
exposes `generateListingContent()` and `answerAgentQuestion()` with the exact
input/output shapes the UI already expects — implement the real API call
inside the `hasRealAiKey` branch and the rest of the app needs no changes.

## Building with EAS / TestFlight

```bash
npm install -g eas-cli
eas login
eas build:configure
eas build --platform ios --profile preview
```

Once the build finishes, submit it to TestFlight:

```bash
eas submit --platform ios --latest
```

`app.json` already sets the bundle identifier (`com.aurorahomes.app`) and app
name ("Aurora Homes"). Replace the placeholder icon/splash assets in
`assets/` with final branding before submitting.

## Before public App Store release

- Replace mock AI generation with a real model call (OpenAI/Anthropic).
- Connect Supabase for persistent listings, auth, messaging, and storage.
- Replace placeholder icon, splash screen, and screenshots with final assets.
- Replace Terms/Privacy/Disclaimer placeholder text with reviewed legal copy.
- Add real push notifications for messages and viewing requests.
- Add moderation/reporting workflow for fake listings.
- Perform an App Store review of permissions text (photo library usage).

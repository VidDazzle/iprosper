# Evolve Life — personal AI concierge (handoff for Codex)

A personal-life layer on the Evolve suite: it interviews the person about what
they like (movies, TV, entertainment, sports, food, favorite places, dietary,
fitness goals, outdoor activities), then acts on casual requests — "I want to
see a movie", "where's the closest Sprouts", "I feel like biking this weekend" —
by checking **when they're actually free**, matching options to their tastes,
pulling **locations, reviews, and showtimes**, and offering to **remind them by
text, email, notification, or voice — their choice**. The desktop and phone PWAs
share one profile, so both stay in sync automatically.

## What's built (all verified end-to-end)

- **Onboarding interview** driven by a catalog of option lists the person picks
  from (`/life` shows chips; favorite places are free-text).
- **Concierge**: routes a request → category, computes free-time slots from the
  calendar (broad personal hours, evenings/weekends included), pulls suggestions
  from provider adapters, explains *why* each matched, returns showtimes.
- **Cross-domain reminders** (health, workouts, work, entertainment, errands…)
  dispatched on the cron over the person's chosen channel, with recurrence and
  quiet-hours support.
- **Multi-channel notify**: email (live via Resend), SMS (Twilio), push (Web
  Push/VAPID), voice (handed to the voice agent) — each degrades to a clear
  queued state when its keys aren't set.

## Files

| Area | Path |
|---|---|
| Schema | `src/db/schema.ts` (lifeProfiles, lifePreferences, lifeIntents, lifeReminders) · migration `drizzle/0010_life.sql` |
| Catalog | `src/lib/life-catalog.ts` — questions + option lists |
| Providers | `src/lib/life-providers.ts` — `findPlaces` (Google Places), `findMovies` (TMDB), `findRecreation` (curated + Maps links) |
| Concierge | `src/lib/concierge.ts` — intent → availability → ranked suggestions |
| AI | `src/lib/ai.ts` → `parseLifeIntent` (structured output + heuristic fallback) |
| Notify | `src/lib/notify.ts` — email/sms/push/voice dispatch |
| Reminders | `src/lib/life-reminders.ts` — `runLifeReminders()` (cron) |
| Helpers | `src/lib/life.ts` — profile resolution |
| API | `src/app/api/life/{catalog,profile,preferences,concierge,reminders,reminders/run}/route.ts` |
| UI | `src/app/life/page.tsx` — onboarding + concierge + reminders (in the PWA) |
| Cron | wired into `src/app/api/maintenance/cron/route.ts` (daily) + dedicated `GET /api/life/reminders/run` |

## API quick reference

- `GET  /api/life/catalog` → onboarding questions + option lists.
- `GET/PUT /api/life/profile` → profile (city, home lat/lng, timezone, reminder
  channel, phone, quiet hours, onboarded).
- `GET/POST /api/life/preferences` → get grouped / replace one category's picks.
- `POST /api/life/concierge` `{ text }` → `{ category, freeSlots, suggestions, message }`.
- `GET/POST/PATCH /api/life/reminders` → list / create / mark done|cancel|reschedule.
- `GET /api/life/reminders/run` (cron secret or agent auth) → dispatch due reminders.

## What Codex wires (all optional — works without them via fallbacks)

| Capability | Env |
|---|---|
| Places + reviews ("closest Sprouts", restaurants, gyms) | `GOOGLE_PLACES_API_KEY` |
| Movies now-playing | `TMDB_API_KEY` (v4 read token) |
| Text reminders | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER` |
| Push notifications | `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (+ register a subscription) |
| Voice reminders | `VOICE_AGENT_API_KEY` (existing — the agent places the call) |
| Owner identity | `LIFE_OWNER_EMAIL` (defaults to `MAILBOX_ADDRESS`) |

**Provider notes for Codex**
- Real **movie showtimes** by theater/location and **live TV air-times** need a
  showtimes/EPG provider (e.g. a cinema API or streaming-guide); `findMovies`
  returns now-playing + placeholder times until then. The UI already renders a
  `showtimes[]` array per pick — just populate it.
- **Trails/parks/campgrounds/fishing** currently return curated spots + a live
  Google Maps search link; swap `findRecreation` for Overpass/AllTrails/
  Recreation.gov when ready (the shape stays the same).
- **Home location**: set `homeLat/homeLng` on the profile for distance sorting;
  otherwise suggestions still work, just without "km away".
- Metering: Life is not metered yet. To meter it, add a `life` product to
  `src/lib/pricing.ts` (respecting the margin floor) and call `meter()` in the
  concierge route.

## Build & run
```
node scripts/migrate.mjs          # applies 0010_life.sql (idempotent)
npm run dev                       # /life is live
```
Single daily cron already dispatches Life reminders; point an hourly cron at
`/api/life/reminders/run` for tighter timing.

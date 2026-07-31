# Evolve Discover + Seasonal Outdoors (handoff for Codex)

Two additions to Evolve Life:

## 1) Seasonal outdoors intelligence (fishing / hunting)

"Is fishing/hunting season in, and what can I catch or hunt right now near me?"
— answered from the person's location (home, or wherever they are while
traveling / out of state) and the current month.

- **Files**: `src/lib/outdoors.ts` (seasonal dataset + `outdoorsReport`),
  `reverseGeocode()` in `src/lib/life-providers.ts` (free OSM Nominatim — no
  key), route `src/app/api/life/outdoors/route.ts`, and a season branch in the
  Life concierge (`src/lib/concierge.ts` → `seasonQuery`/`seasonResult`).
- **API**: `GET /api/life/outdoors?activity=fishing|hunting&lat=&lng=` →
  `{ region, monthName, inSeasonNow[], comingSoon[], disclaimer, traveling }`.
  Also answered conversationally: the Life concierge routes "what fish can I
  catch now", "is deer season open", etc.
- **LEGAL — must keep**: every response carries `DISCLAIMER`. Seasons, bag
  limits, and licenses are **state-specific and change yearly**. The bundled
  tables are a general guide. **Codex should replace them with the person's
  state wildlife-agency data/API (state DNR / Fish & Wildlife)** and link to the
  official regulations + license purchase. The UI shows the disclaimer.
- Reverse geocoding resolves the state (verified live: a TX lat/lng → "Texas"),
  so it adapts when someone is on vacation out of state.

## 2) Evolve Discover — opt-in, interest-matched, radius-based

Meet people nearby who share your interests (sports like fishing/hunting/
football/baseball/basketball, plus activities/entertainment/food). Built
**privacy-first**.

- **Files**: schema `taps` + profile columns (`discoverable`,
  `discovery_radius_miles`, `discovery_photo_url`, `display_name`) in
  `src/db/schema.ts` · migration `drizzle/0012_discovery.sql`; engine
  `src/lib/discovery.ts`; routes `src/app/api/discovery/{settings,nearby,tap,matches}`;
  UI `src/app/discover/page.tsx`.
- **Rules (as specified, all verified)**:
  - Being discoverable is **opt-in** and requires **identity verification** (the
    same KYC gate as photos) + a discovery photo + a shared location.
  - `nearby` returns people within your radius (default 5 mi) who share ≥1
    interest — with **coarse distance only** ("~2 mi"), never coordinates.
  - **Tapping someone reveals YOUR photo to them** (you must reveal to see).
  - A person's photo is shown to you **only if they tapped you** — reveal is
    scoped to that one person, not public.
  - **Mutual taps = a match**; both people are **notified** ("the person is also
    interested in you") over their chosen channel (`notify`). Interest is only
    ever revealed to the two people, and only when BOTH have tapped.
  - **After a match**, each person may OPT IN to **share their phone number**
    (independently — a number is visible to the other only once shared) and
    **request a specific time to meet** (accept / decline, both notified).
- **API**:
  - `GET/PUT /api/discovery/settings` — discoverable toggle, radius, photo,
    display name (PUT enforces verify + photo + location before ON).
  - `GET /api/discovery/nearby` — coarse, interest-matched list.
  - `POST /api/discovery/tap { toProfileId }` — tap (reveals your photo; matches
    + notifies on mutual).
  - `GET /api/discovery/matches` — matches, each with `partnerPhone` (only if
    they shared), `iSharedPhone`, and `meetups[]`.
  - `POST /api/discovery/share-phone { toProfileId }` — share your number (match only).
  - `POST /api/discovery/meetup { toProfileId, whenAt, note? }` + `PATCH { id, action }`
    — request a time / accept | decline (match only).

## Privacy & safety (by design — keep these)

- Exact location is **never** exposed to other users; only bucketed distance.
- Discovery is opt-in; photos are per-person reveals; identity verification
  gates both being discoverable and tapping (anti-catfishing + age assurance).
- **Recommended before public launch (not yet built)**: block/report + unmatch,
  a minimum-age (18+) gate enforced via the KYC result, rate-limiting on taps,
  and abuse monitoring. I'd wire these next.

## Free mapping

Geocoding uses **OpenStreetMap Nominatim** (no key). For an interactive map,
add Leaflet + OSM tiles (both free) in the app — the data layer already returns
coarse distances; don't plot other users' precise points.

## Build & run
```
node scripts/migrate.mjs   # applies 0012_discovery.sql (idempotent)
npm run dev                # /discover is live; outdoors under /life + /api/life/outdoors
```

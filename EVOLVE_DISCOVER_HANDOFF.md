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

## Background screening (anti-trafficking / offender gate) — built + verified

To keep felons — especially anyone with sex offenses or trafficking history —
off the platform, being discoverable / tapping now requires a **background
screening pass** on top of the 18+ identity check.

- Flow: `POST /api/discovery/screening/start` (must be identity-verified first —
  the check uses the verified legal name + DOB) → provider runs the report →
  `POST /api/discovery/screening/webhook` returns the outcome. `src/lib/screening.ts`
  evaluates flagged categories; any disqualifying one → `flagged` and the person
  is immediately set non-discoverable.
- Gate: `isEligibleForDiscovery = isAdultVerified AND isScreenedClear`
  (`src/lib/safety.ts`). Enforced on going discoverable and on tapping.
- Disqualifying categories (env `SCREENING_DISQUALIFIERS`, default):
  `sex_offense, human_trafficking, violent_felony, kidnapping, child_abuse`.
- We store **only** the outcome + flagged category names — never the records.
- Verified: unscreened → blocked; clean → allowed; `sex_offense` flag → barred.

**⚖️ Codex must handle before launch (documented in `src/lib/screening.ts`):**
- Use a real **FCRA-compliant CRA** (Checkr / Sterling) or an identity provider's
  watchlist product; wire `CHECKR_API_KEY` (or `STERLING_API_KEY`). The package
  must include the **national sex-offender registry + criminal search**.
- FCRA requires consent, permissible purpose, and **adverse-action notices** when
  denying someone. Some jurisdictions restrict blanket criminal bans
  ("ban-the-box"/fair-chance) — sex-offender-registry denials for a dating/
  meetup context are broadly defensible; confirm per market with counsel.
- No screen is perfect (incomplete records, name-match false positives/negatives)
  — keep block/report + human moderation as backstops.

## Privacy & safety (built + verified)

- Exact location is **never** exposed to other users; only bucketed distance.
- Discovery is opt-in; photos are per-person reveals.
- **18+ gate**: being discoverable, tapping, and sharing photos all require
  `isAdultVerified` — the KYC provider's verified **date of birth** must be 18+.
  We store only the boolean `adult` (never the DOB). Under-18 is recorded as a
  failed verification. (`src/lib/safety.ts`, `identity/webhook` derives age.)
- **Block / report / unmatch** (`src/lib/safety.ts`, routes
  `/api/discovery/{block,report,unmatch}`, buttons on every Discover card):
  - Block hides the pair from each other **both ways** and unmatches them;
    further taps/requests are refused.
  - Report files an abuse `report` row **and** blocks the person.
  - Unmatch severs taps + pending meetup requests without blocking.
- **Rate limits** (anti-spam/harassment, in `src/lib/discovery.ts`): taps
  capped at 8/min and 100/day; meetup requests at 5/day per match and 20/day
  overall.
- **Reports queue for Codex**: the `reports` table is written on every report
  (status `open`). Wire an admin/moderation view + actioning (suspend, ban) and
  connect to your trust-and-safety workflow.

## Free mapping

Geocoding uses **OpenStreetMap Nominatim** (no key). For an interactive map,
add Leaflet + OSM tiles (both free) in the app — the data layer already returns
coarse distances; don't plot other users' precise points.

## Build & run
```
node scripts/migrate.mjs   # applies 0012_discovery.sql (idempotent)
npm run dev                # /discover is live; outdoors under /life + /api/life/outdoors
```

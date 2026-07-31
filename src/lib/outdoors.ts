/**
 * Seasonal outdoors intelligence for Evolve Life.
 *
 * "Is hunting/fishing season in, and what can I catch or hunt this time of year
 * near me?" — answered from the person's location (home, or wherever they are
 * on vacation / out of state) and the current month.
 *
 * IMPORTANT — LEGAL: seasons, bag limits, and licensing are set per state and
 * change every year. This dataset is a general guide only. Every response
 * includes DISCLAIMER; the UI must show it. Codex should replace the seasonal
 * tables with the person's state wildlife-agency data/API (e.g. state DNR) for
 * authoritative dates, and always link to the official regulations + license.
 */

export const DISCLAIMER =
  'General guidance only. Seasons, limits, and licenses vary by state and year — ' +
  'always confirm with your state wildlife agency and buy the required license before you go.';

export type Region = 'northeast' | 'southeast' | 'midwest' | 'south' | 'west' | 'pacific' | 'mountain' | 'general';

interface SpeciesWindow {
  name: string;
  months: number[]; // 1-12 when it's typically in season / best
  note?: string;
}

// Broad, region-agnostic "what's biting / what's open" guidance by month. These
// are intentionally general; swap for state-specific regs in production.
const FISH: SpeciesWindow[] = [
  { name: 'Largemouth bass', months: [3, 4, 5, 6, 9, 10], note: 'Best in spring pre-spawn and fall.' },
  { name: 'Smallmouth bass', months: [5, 6, 7, 9, 10] },
  { name: 'Crappie', months: [3, 4, 5, 10, 11], note: 'Spring spawn is prime.' },
  { name: 'Bluegill / panfish', months: [5, 6, 7, 8] },
  { name: 'Trout', months: [3, 4, 5, 9, 10, 11], note: 'Cool water; many states open spring.' },
  { name: 'Walleye', months: [4, 5, 6, 9, 10] },
  { name: 'Catfish', months: [5, 6, 7, 8, 9] },
  { name: 'Striped bass', months: [4, 5, 6, 10, 11] },
  { name: 'Salmon', months: [8, 9, 10], note: 'Fall runs.' },
  { name: 'Ice fishing (perch, pike)', months: [12, 1, 2], note: 'Where safe ice forms.' },
];

const GAME: SpeciesWindow[] = [
  { name: 'White-tailed deer (archery)', months: [9, 10, 11, 12, 1] },
  { name: 'White-tailed deer (firearm)', months: [11, 12] },
  { name: 'Wild turkey (spring)', months: [4, 5] },
  { name: 'Wild turkey (fall)', months: [10, 11] },
  { name: 'Duck / waterfowl', months: [10, 11, 12, 1] },
  { name: 'Dove', months: [9, 10] },
  { name: 'Pheasant / upland birds', months: [10, 11, 12] },
  { name: 'Elk', months: [9, 10, 11], note: 'Western states; tags often drawn.' },
  { name: 'Squirrel / small game', months: [9, 10, 11, 12, 1, 2] },
  { name: 'Spring bear', months: [4, 5, 6], note: 'Select western states.' },
];

export interface SeasonItem {
  name: string;
  inSeason: boolean;
  note?: string;
}

export interface OutdoorsReport {
  activity: 'fishing' | 'hunting';
  region: string; // human label (state or area)
  month: number;
  monthName: string;
  inSeasonNow: SeasonItem[];
  comingSoon: SeasonItem[];
  disclaimer: string;
}

function monthName(m: number): string {
  return ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][m];
}

export function outdoorsReport(activity: 'fishing' | 'hunting', region: string, date = new Date()): OutdoorsReport {
  const month = date.getMonth() + 1;
  const next = (month % 12) + 1;
  const table = activity === 'fishing' ? FISH : GAME;
  const inSeasonNow: SeasonItem[] = table
    .filter((s) => s.months.includes(month))
    .map((s) => ({ name: s.name, inSeason: true, note: s.note }));
  const comingSoon: SeasonItem[] = table
    .filter((s) => !s.months.includes(month) && s.months.includes(next))
    .map((s) => ({ name: s.name, inSeason: false, note: `Opens around ${monthName(next)}` }));
  return { activity, region: region || 'your area', month, monthName: monthName(month), inSeasonNow, comingSoon, disclaimer: DISCLAIMER };
}

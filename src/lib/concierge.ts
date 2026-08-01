/**
 * Evolve Life concierge.
 *
 * The brain behind "I want to see a movie" → it checks when you're actually
 * free, finds options that match what you told us you like, pulls locations,
 * reviews, and showtimes, and offers to remind you on your channel.
 */

import { db } from '@/db';
import { calendarEvents, lifePreferences } from '@/db/schema';
import { and, eq, gte, lte } from 'drizzle-orm';
import { findFreeSlots, type AvailabilityRule, type BusyEvent } from '@/lib/scheduling';
import { parseLifeIntent, type ParsedLifeIntent, type LifeIntentCategory } from '@/lib/ai';
import { findPlaces, findMovies, findRecreation, reverseGeocode, type GeoPoint } from '@/lib/life-providers';
import { outdoorsReport } from '@/lib/outdoors';
import { getWorkoutPlan, workoutGoalFromText } from '@/lib/workouts';
import { busyFor } from '@/lib/orbit';

export interface ConciergeProfile {
  id: number;
  timezone: string;
  homeLat: number | null;
  homeLng: number | null;
  city: string | null;
}

export interface Suggestion {
  kind: 'movie' | 'place' | 'recreation' | 'tv' | 'generic';
  title: string;
  subtitle: string | null;
  rating: number | null;
  reviewCount: number | null;
  distanceKm: number | null;
  url: string | null;
  detail: string | null;
  showtimes?: string[];
  why: string | null; // why this matched their tastes
}

export interface ConciergeResult {
  category: LifeIntentCategory;
  intent: ParsedLifeIntent;
  freeSlots: { start: string; end: string; label: string }[];
  suggestions: Suggestion[];
  message: string;
}

/** Minutes a given category typically needs, for free-slot sizing. */
function durationFor(category: LifeIntentCategory): number {
  switch (category) {
    case 'movie': return 150;
    case 'dining': return 90;
    case 'recreation': return 120;
    case 'fitness': return 60;
    case 'entertainment': return 150;
    default: return 60;
  }
}

/**
 * A person's *free-time* availability is broad (mornings through late evening,
 * every day) — unlike work booking hours — so movies at 9pm and weekend hikes
 * both surface. Real busy events still block slots.
 */
function personalRules(timezone: string): AvailabilityRule[] {
  return [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
    dayOfWeek,
    startTime: '07:00',
    endTime: '22:00',
    timezone,
    slotMinutes: 30,
    enabled: true,
  }));
}

function windowFor(timeframe: ParsedLifeIntent['timeframe']): { from: Date; to: Date } {
  const from = new Date();
  const to = new Date(from);
  switch (timeframe) {
    case 'today':
    case 'tonight': to.setHours(23, 59, 59); break;
    case 'tomorrow': to.setDate(to.getDate() + 2); break;
    case 'weekend': to.setDate(to.getDate() + 7); break;
    case 'this_week': to.setDate(to.getDate() + 7); break;
    default: to.setDate(to.getDate() + 5); break;
  }
  return { from, to };
}

async function freeSlots(profile: ConciergeProfile, intent: ParsedLifeIntent): Promise<ConciergeResult['freeSlots']> {
  const { from, to } = windowFor(intent.timeframe);
  // Personal availability comes from the Orbit calendar (not the business one),
  // including the Evolve business calendar only when the owner has sync on.
  const busy: BusyEvent[] = await busyFor(profile.id, from, to);
  const slots = findFreeSlots(personalRules(profile.timezone), busy, from, to, durationFor(intent.category));

  // For evening activities (movies, entertainment, dining out), prefer slots
  // after 5pm so we don't suggest a 9am movie.
  const eveningish = intent.category === 'movie' || intent.category === 'entertainment' ||
    (intent.category === 'dining' && intent.timeframe === 'tonight');
  const picked = slots
    .filter((s) => {
      if (!eveningish) return true;
      const hr = Number(new Date(s.start).toLocaleString('en-US', { timeZone: profile.timezone, hour: '2-digit', hour12: false }));
      return hr >= 17;
    })
    .slice(0, 5);

  return picked.map((s) => ({
    start: s.start,
    end: s.end,
    label: new Date(s.start).toLocaleString('en-US', {
      timeZone: profile.timezone, weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
    }),
  }));
}

async function prefsByCategory(profileId: number): Promise<Record<string, string[]>> {
  const rows = await db.select().from(lifePreferences).where(eq(lifePreferences.profileId, profileId));
  const out: Record<string, string[]> = {};
  for (const r of rows) (out[r.category] ||= []).push(r.value);
  return out;
}

/** Detect "what's in season / can I catch / is deer season open" style asks. */
function seasonQuery(text: string): 'fishing' | 'hunting' | null {
  const t = text.toLowerCase();
  const season = /\bseason\b|in season|what.*(catch|bit(e|ing)|hunt)|whats? biting/.test(t);
  const hunt = /hunt|deer|turkey|duck|waterfowl|elk|pheasant|dove|bear|game\b/.test(t);
  const fish = /fish|catch|bass|trout|walleye|crappie|catfish|salmon|bite|biting/.test(t);
  if (!season && !hunt && !fish) return null;
  if (hunt && !fish) return 'hunting';
  if (fish) return 'fishing';
  return season ? 'fishing' : null;
}

async function seasonResult(profile: ConciergeProfile, activity: 'fishing' | 'hunting', text: string): Promise<ConciergeResult> {
  let region = profile.city || 'your area';
  if (profile.homeLat != null && profile.homeLng != null) {
    const geo = await reverseGeocode(profile.homeLat, profile.homeLng);
    if (geo.state) region = geo.state;
  }
  const report = outdoorsReport(activity, region);
  const suggestions: Suggestion[] = report.inSeasonNow.map((s) => ({
    kind: 'recreation', title: s.name, subtitle: `In season now · ${report.region}`, rating: null, reviewCount: null,
    distanceKm: null, url: null, detail: s.note || null, why: null,
  }));
  for (const s of report.comingSoon.slice(0, 3)) {
    suggestions.push({ kind: 'recreation', title: s.name, subtitle: 'Coming soon', rating: null, reviewCount: null, distanceKm: null, url: null, detail: s.note || null, why: null });
  }
  const verb = activity === 'fishing' ? 'catch' : 'hunt';
  const msg = report.inSeasonNow.length
    ? `${report.monthName} in ${report.region}: you can ${verb} ${report.inSeasonNow.slice(0, 4).map((s) => s.name).join(', ')}. ${report.disclaimer}`
    : `Not much ${activity} is open in ${report.region} right now. ${report.disclaimer}`;
  return { category: activity === 'fishing' ? 'recreation' : 'recreation', intent: { category: 'recreation', query: null, activity, keywords: [], wantsReminder: false, timeframe: 'unspecified' }, freeSlots: [], suggestions, message: msg };
}

function workoutResult(text: string): ConciergeResult {
  const goal = workoutGoalFromText(text)!;
  const plan = getWorkoutPlan(goal, 'beginner');
  const suggestions: Suggestion[] = plan.days.map((d) => ({
    kind: 'generic', title: `${d.day} — ${d.focus}`, subtitle: d.exercises.map((e) => e.name).join(' · '),
    rating: null, reviewCount: null, distanceKm: null, url: null,
    detail: d.exercises.map((e) => `${e.name}: ${e.detail}`).join('  •  '), why: null,
  }));
  suggestions.push({ kind: 'generic', title: 'Tips', subtitle: null, rating: null, reviewCount: null, distanceKm: null, url: null, detail: plan.tips.join('  •  '), why: null });
  return {
    category: 'fitness',
    intent: { category: 'fitness', query: null, activity: goal, keywords: [], wantsReminder: false, timeframe: 'this_week' },
    freeSlots: [],
    suggestions,
    message: `${plan.goalLabel} — ${plan.daysPerWeek} days/week (${plan.level}). ${plan.summary} ${plan.safety}`,
  };
}

export async function runConcierge(profile: ConciergeProfile, text: string): Promise<ConciergeResult> {
  if (workoutGoalFromText(text)) return workoutResult(text);

  const season = seasonQuery(text);
  if (season) return seasonResult(profile, season, text);

  const intent = await parseLifeIntent(text);
  const prefs = await prefsByCategory(profile.id);
  const near: GeoPoint | null = profile.homeLat != null && profile.homeLng != null
    ? { lat: profile.homeLat, lng: profile.homeLng } : null;

  const [slots, suggestions] = await Promise.all([
    freeSlots(profile, intent),
    buildSuggestions(intent, prefs, near),
  ]);

  return { category: intent.category, intent, freeSlots: slots, suggestions, message: composeMessage(intent, slots, suggestions, profile) };
}

async function buildSuggestions(
  intent: ParsedLifeIntent,
  prefs: Record<string, string[]>,
  near: GeoPoint | null,
): Promise<Suggestion[]> {
  switch (intent.category) {
    case 'movie': {
      const genres = prefs.movie_genre || [];
      const movies = await findMovies(genres);
      return movies.map((m) => ({
        kind: 'movie', title: m.title, subtitle: m.genre, rating: m.rating, reviewCount: null,
        distanceKm: null, url: null, detail: m.synopsis, showtimes: m.showtimes,
        why: genres.includes(m.genre) ? `Matches your taste for ${m.genre.toLowerCase()}` : null,
      }));
    }
    case 'dining': {
      const cuisines = prefs.cuisine || [];
      const favorites = prefs.favorite_place || [];
      const query = intent.query || cuisines[0] || 'restaurants';
      const places = await findPlaces(`${query} restaurant`, near);
      const suggestions = places.map((p) => ({
        kind: 'place' as const, title: p.name, subtitle: p.address, rating: p.rating, reviewCount: p.reviewCount,
        distanceKm: p.distanceKm, url: p.url, detail: null,
        why: cuisines.some((c) => query.toLowerCase().includes(c.toLowerCase())) ? `Your kind of food (${query})` : null,
      }));
      // Prioritize their own favorite spots if they named one that matches.
      if (favorites.length) {
        suggestions.unshift({
          kind: 'place', title: favorites[0], subtitle: 'Your favorite spot', rating: null, reviewCount: null,
          distanceKm: null, url: `https://www.google.com/maps/search/${encodeURIComponent(favorites[0])}`,
          detail: null, why: 'One of your go-to places',
        });
      }
      return suggestions.slice(0, 4);
    }
    case 'errand': {
      const query = intent.query || 'store';
      const places = await findPlaces(query, near);
      return places.map((p) => ({
        kind: 'place', title: p.name, subtitle: p.address, rating: p.rating, reviewCount: p.reviewCount,
        distanceKm: p.distanceKm, url: p.url, detail: null,
        why: p.distanceKm != null ? `${p.distanceKm} km away` : null,
      }));
    }
    case 'recreation':
    case 'fitness': {
      const activity = intent.activity || (prefs.activity || [])[0] || 'Hiking';
      const spots = await findRecreation(activity, near);
      return spots.map((s) => ({
        kind: 'recreation', title: s.name, subtitle: s.activity, rating: null, reviewCount: null,
        distanceKm: s.distanceKm, url: s.url, detail: s.note,
        why: (prefs.activity || []).some((a) => a.toLowerCase().includes(s.activity.toLowerCase())) ? `You like ${s.activity.toLowerCase()}` : null,
      }));
    }
    case 'entertainment': {
      const likes = prefs.entertainment || [];
      const query = intent.query || likes[0] || 'live music';
      const places = await findPlaces(query, near);
      return places.map((p) => ({
        kind: 'place', title: p.name, subtitle: p.address, rating: p.rating, reviewCount: p.reviewCount,
        distanceKm: p.distanceKm, url: p.url, detail: null, why: likes.length ? `For your love of ${query}` : null,
      }));
    }
    case 'tv': {
      const genres = prefs.tv_genre || [];
      return [{
        kind: 'tv', title: 'Tonight’s watchlist', subtitle: genres.slice(0, 3).join(' · ') || 'Your shows',
        rating: null, reviewCount: null, distanceKm: null, url: null,
        detail: 'New episodes and picks based on your genres. Connect a streaming provider to pull exact air times.',
        why: genres.length ? `Built from your genres` : null,
      }];
    }
    default: {
      const query = intent.query || 'things to do near me';
      const places = await findPlaces(query, near);
      return places.map((p) => ({
        kind: 'generic', title: p.name, subtitle: p.address, rating: p.rating, reviewCount: p.reviewCount,
        distanceKm: p.distanceKm, url: p.url, detail: null, why: null,
      }));
    }
  }
}

function composeMessage(
  intent: ParsedLifeIntent,
  slots: ConciergeResult['freeSlots'],
  suggestions: Suggestion[],
  profile: ConciergeProfile,
): string {
  const when = slots.length ? `You're free ${slots[0].label}` : `I couldn't find an open slot in that window`;
  const where = profile.city ? ` near ${profile.city}` : '';
  const count = suggestions.length;
  switch (intent.category) {
    case 'movie': return `${when}. Here ${count === 1 ? 'is a pick' : `are ${count} picks`} that fit your taste, with showtimes${where}.`;
    case 'dining': return `${when}. ${count} spots${where} matched to what you like to eat.`;
    case 'errand': return `Closest options${where}, sorted by distance. ${when.toLowerCase()} if you want to go now.`;
    case 'recreation':
    case 'fitness': return `${when}. ${count} places${where} for ${intent.activity || 'your activity'} — want a reminder?`;
    default: return `${when}. ${count} ideas${where} based on what you're into.`;
  }
}

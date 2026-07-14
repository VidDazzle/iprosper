/**
 * Geo lookups for the local-SEO location tree. Slugs are derived here so the
 * seed data stays simple, and counties are unioned from both the county seed
 * list and every county referenced by a city — so every city's county resolves
 * to a real page.
 */

import { US_STATES, STATE_BY_SLUG, STATE_BY_ABBR, type UsState } from "./states";
import { COUNTIES, CITIES, type CitySeed } from "./places";

export type { UsState } from "./states";

export interface County {
  name: string;
  slug: string;
  stateAbbr: string;
  seat?: string;
}

export interface City {
  name: string;
  slug: string;
  stateAbbr: string;
  county: string;
  countySlug: string;
  population?: number;
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "") // strip accents (e.g. Doña -> dona)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// --- build indexes once at module load -------------------------------------

const countyMap = new Map<string, County>(); // key: `${abbr}:${slug}`
for (const c of COUNTIES) {
  const slug = slugify(c.name);
  countyMap.set(`${c.stateAbbr}:${slug}`, { name: c.name, slug, stateAbbr: c.stateAbbr, seat: c.seat });
}

const cities: City[] = CITIES.map((c: CitySeed) => ({
  name: c.name,
  slug: slugify(c.name),
  stateAbbr: c.stateAbbr,
  county: c.county,
  countySlug: slugify(c.county),
  population: c.population,
}));

// Ensure every county referenced by a city exists as a page.
for (const c of cities) {
  const key = `${c.stateAbbr}:${c.countySlug}`;
  if (!countyMap.has(key)) {
    countyMap.set(key, { name: c.county, slug: c.countySlug, stateAbbr: c.stateAbbr });
  }
}

const counties = [...countyMap.values()];

// --- lookups ----------------------------------------------------------------

export function getState(slug: string): UsState | undefined {
  return STATE_BY_SLUG[slug];
}

export function allStates(): UsState[] {
  return US_STATES;
}

export function countiesInState(abbr: string): County[] {
  return counties.filter((c) => c.stateAbbr === abbr).sort((a, b) => a.name.localeCompare(b.name));
}

export function citiesInState(abbr: string): City[] {
  return cities
    .filter((c) => c.stateAbbr === abbr)
    .sort((a, b) => (b.population ?? 0) - (a.population ?? 0) || a.name.localeCompare(b.name));
}

export function getCounty(stateSlug: string, countySlug: string): County | undefined {
  const st = getState(stateSlug);
  if (!st) return undefined;
  return countyMap.get(`${st.abbr}:${countySlug}`);
}

export function citiesInCounty(abbr: string, countySlug: string): City[] {
  return cities
    .filter((c) => c.stateAbbr === abbr && c.countySlug === countySlug)
    .sort((a, b) => (b.population ?? 0) - (a.population ?? 0) || a.name.localeCompare(b.name));
}

export function getCity(stateSlug: string, citySlug: string): City | undefined {
  const st = getState(stateSlug);
  if (!st) return undefined;
  return cities.find((c) => c.stateAbbr === st.abbr && c.slug === citySlug);
}

/** Other cities near a given city — same county first, then same state. */
export function nearbyCities(city: City, limit = 8): City[] {
  const sameCounty = cities.filter((c) => c.stateAbbr === city.stateAbbr && c.countySlug === city.countySlug && c.slug !== city.slug);
  const sameState = cities.filter((c) => c.stateAbbr === city.stateAbbr && c.countySlug !== city.countySlug);
  const ordered = [...sameCounty, ...sameState.sort((a, b) => (b.population ?? 0) - (a.population ?? 0))];
  return ordered.slice(0, limit);
}

export function stateForAbbr(abbr: string): UsState | undefined {
  return STATE_BY_ABBR[abbr];
}

// --- params + sitemap generators -------------------------------------------

export function allStateParams(): { state: string }[] {
  return US_STATES.map((s) => ({ state: s.slug }));
}

export function allCityParams(): { state: string; city: string }[] {
  return cities.map((c) => ({ state: stateForAbbr(c.stateAbbr)!.slug, city: c.slug }));
}

export function allCountyParams(): { state: string; county: string }[] {
  return counties.map((c) => ({ state: stateForAbbr(c.stateAbbr)!.slug, county: c.slug }));
}

/** High-priority params to statically prerender at build (launch market + all
 *  state hubs). The long tail renders on-demand and is cached. */
export function priorityCityParams(): { state: string; city: string }[] {
  return cities
    .filter((c) => c.stateAbbr === "FL" || (c.population ?? 0) >= 400000)
    .map((c) => ({ state: stateForAbbr(c.stateAbbr)!.slug, city: c.slug }));
}

export interface LocationUrl { path: string; priority: number }

/** All location URLs for the sitemap (states, counties, cities). */
export function locationSitemapUrls(): LocationUrl[] {
  const urls: LocationUrl[] = [{ path: "/locations", priority: 0.7 }];
  for (const s of US_STATES) urls.push({ path: `/locations/${s.slug}`, priority: 0.6 });
  for (const c of counties) {
    const st = stateForAbbr(c.stateAbbr);
    if (st) urls.push({ path: `/locations/${st.slug}/county/${c.slug}`, priority: 0.5 });
  }
  for (const c of cities) {
    const st = stateForAbbr(c.stateAbbr);
    if (st) urls.push({ path: `/locations/${st.slug}/${c.slug}`, priority: c.stateAbbr === "FL" ? 0.8 : 0.6 });
  }
  return urls;
}

export function geoCounts() {
  return { states: US_STATES.length, counties: counties.length, cities: cities.length };
}

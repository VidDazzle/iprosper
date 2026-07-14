import { describe, it, expect } from "vitest";
import { slugify, getState, getCity, getCounty, citiesInState, nearbyCities, locationSitemapUrls, geoCounts } from "./index";

describe("geo lookups", () => {
  it("slugifies names and strips accents", () => {
    expect(slugify("Escambia County")).toBe("escambia-county");
    expect(slugify("Doña Ana County")).toBe("dona-ana-county");
    expect(slugify("St. Louis")).toBe("st-louis");
  });

  it("resolves the launch market (Pensacola, Escambia County, FL)", () => {
    const fl = getState("florida");
    expect(fl?.abbr).toBe("FL");
    const city = getCity("florida", "pensacola");
    expect(city?.name).toBe("Pensacola");
    expect(city?.county).toBe("Escambia County");
    const county = getCounty("florida", "escambia-county");
    expect(county?.seat).toBe("Pensacola");
  });

  it("returns undefined for unknown slugs", () => {
    expect(getState("atlantis")).toBeUndefined();
    expect(getCity("florida", "nowhereville")).toBeUndefined();
  });

  it("orders cities in a state by population and finds nearby cities", () => {
    const cities = citiesInState("FL");
    expect(cities.length).toBeGreaterThan(1);
    expect((cities[0].population ?? 0)).toBeGreaterThanOrEqual(cities[1].population ?? 0);
    const pensacola = getCity("florida", "pensacola")!;
    const near = nearbyCities(pensacola, 5);
    expect(near.find((c) => c.slug === pensacola.slug)).toBeUndefined(); // excludes self
    expect(near.length).toBeGreaterThan(0);
  });

  it("emits sitemap URLs covering states, counties, and cities", () => {
    const urls = locationSitemapUrls();
    const counts = geoCounts();
    expect(counts.states).toBe(51); // 50 + DC
    expect(urls.some((u) => u.path === "/locations/florida/pensacola")).toBe(true);
    expect(urls.some((u) => u.path === "/locations/florida/county/escambia-county")).toBe(true);
    expect(urls.length).toBeGreaterThan(counts.states + counts.counties);
  });
});

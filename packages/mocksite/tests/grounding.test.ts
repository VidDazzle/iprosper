import { describe, it, expect } from "vitest";
import { checkGrounding } from "../src/index.js";
import type { BrandKit } from "@apex/contracts";

const brandKit: BrandKit = {
  name: "Coastal Roofing Co",
  palette: ["#1e6b3d"],
  fonts: ["Poppins"],
  services: ["Roof Repair", "Solar Panel Installation"],
  reviews: [],
};

describe("checkGrounding", () => {
  it("returns no warnings when the business name and every service are present", () => {
    const html = `<h1>Coastal Roofing Co</h1><p>We offer Roof Repair and Solar Panel Installation.</p>`;
    expect(checkGrounding(html, brandKit)).toHaveLength(0);
  });

  it("flags a missing business name", () => {
    const html = `<h1>Your New Website</h1><p>We offer Roof Repair and Solar Panel Installation.</p>`;
    const warnings = checkGrounding(html, brandKit);
    expect(warnings.some((w) => w.includes("business name"))).toBe(true);
  });

  it("flags each missing service individually", () => {
    const html = `<h1>Coastal Roofing Co</h1><p>We offer Roof Repair.</p>`;
    const warnings = checkGrounding(html, brandKit);
    expect(warnings.some((w) => w.includes("Solar Panel Installation"))).toBe(true);
    expect(warnings.some((w) => w.includes("Roof Repair"))).toBe(false);
  });

  it("is case-insensitive", () => {
    const html = `<h1>COASTAL ROOFING CO</h1><p>roof repair and solar panel installation</p>`;
    expect(checkGrounding(html, brandKit)).toHaveLength(0);
  });
});

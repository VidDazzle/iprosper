import { describe, it, expect } from "vitest";
import { brandKitToThemeVars } from "../src/theme.js";
import type { BrandKit } from "@apex/contracts";

describe("brandKitToThemeVars", () => {
  it("maps palette entries to numbered CSS variables plus semantic fallbacks", () => {
    const brandKit: BrandKit = {
      name: "Test",
      palette: ["#111111", "#222222", "#333333"],
      fonts: ["Playfair Display", "Inter"],
      services: [],
      reviews: [],
    };
    const vars = brandKitToThemeVars(brandKit);
    expect(vars["--brand-color-1"]).toBe("#111111");
    expect(vars["--brand-color-primary"]).toBe("#111111");
    expect(vars["--brand-color-secondary"]).toBe("#222222");
    expect(vars["--brand-color-accent"]).toBe("#333333");
    expect(vars["--brand-font-heading"]).toBe("Playfair Display");
    expect(vars["--brand-font-body"]).toBe("Inter");
  });

  it("never leaves an undefined var when the scrape came back thin", () => {
    const brandKit: BrandKit = { name: "Thin", palette: [], fonts: [], services: [], reviews: [] };
    const vars = brandKitToThemeVars(brandKit);
    expect(vars["--brand-color-primary"]).toBeDefined();
    expect(vars["--brand-font-heading"]).toBeDefined();
  });
});

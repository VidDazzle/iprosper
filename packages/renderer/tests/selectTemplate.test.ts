import { describe, it, expect } from "vitest";
import { selectTemplate, UnknownVerticalError } from "../src/selectTemplate.js";
import type { BrandKit } from "@apex/contracts";

function brandKit(overrides: Partial<BrandKit>): BrandKit {
  return {
    name: "Test Business",
    palette: ["#000"],
    fonts: ["Inter"],
    services: [],
    reviews: [],
    ...overrides,
  };
}

describe("selectTemplate", () => {
  it("always honors an explicit vertical", () => {
    expect(selectTemplate(brandKit({ name: "Anything" }), "destination")).toBe("destination");
  });

  it("infers luxe from services", () => {
    expect(selectTemplate(brandKit({ services: ["Botox", "Med Spa treatments"] }))).toBe("luxe");
  });

  it("infers built from services", () => {
    expect(selectTemplate(brandKit({ services: ["Roofing repair", "Solar installs"] }))).toBe("built");
  });

  it("infers destination from services", () => {
    expect(selectTemplate(brandKit({ name: "Coastal Realty", services: ["Real estate listings"] }))).toBe(
      "destination",
    );
  });

  it("fails closed (throws) rather than guessing when nothing matches", () => {
    expect(() => selectTemplate(brandKit({ name: "Generic Co", services: ["Consulting"] }))).toThrow(
      UnknownVerticalError,
    );
  });
});

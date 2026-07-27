import type { CSSProperties } from "react";
import type { BrandKit } from "@apex/contracts";

/**
 * Shared rule (spec Section 5): "BrandKit palette always via CSS
 * variables (never hardcoded hex)." Templates read colors/fonts through
 * these custom properties, never inline literals.
 */
export function brandKitToThemeVars(brandKit: BrandKit): Record<string, string> {
  const vars: Record<string, string> = {};

  brandKit.palette.forEach((color, i) => {
    vars[`--brand-color-${i + 1}`] = color;
  });
  // Always guarantee at least a primary/secondary/accent fallback chain
  // so templates never hit an undefined CSS var if a scrape came back thin.
  vars["--brand-color-primary"] = brandKit.palette[0] ?? "var(--brand-color-1, #111111)";
  vars["--brand-color-secondary"] = brandKit.palette[1] ?? vars["--brand-color-primary"];
  vars["--brand-color-accent"] = brandKit.palette[2] ?? vars["--brand-color-secondary"];

  vars["--brand-font-heading"] = brandKit.fonts[0] ?? "system-ui, sans-serif";
  vars["--brand-font-body"] = brandKit.fonts[1] ?? brandKit.fonts[0] ?? "system-ui, sans-serif";

  return vars;
}

export function themeVarsToStyle(vars: Record<string, string>): CSSProperties {
  return vars as CSSProperties;
}

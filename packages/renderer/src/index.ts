export * from "./selectTemplate.js";
export * from "./theme.js";
export * from "./Watermark.js";
export * from "./useReducedMotionValues.js";
export * from "./templates/Luxe.js";
export * from "./templates/Built.js";
export * from "./templates/Destination.js";

import type { ReactElement } from "react";
import type { BrandKit } from "@apex/contracts";
import type { TemplateKey } from "./selectTemplate.js";
import { LuxeTemplate } from "./templates/Luxe.js";
import { BuiltTemplate } from "./templates/Built.js";
import { DestinationTemplate } from "./templates/Destination.js";

const TEMPLATE_COMPONENTS: Record<TemplateKey, (props: { brandKit: BrandKit }) => ReactElement> = {
  luxe: LuxeTemplate,
  built: BuiltTemplate,
  destination: DestinationTemplate,
};

export function getTemplateComponent(key: TemplateKey) {
  return TEMPLATE_COMPONENTS[key];
}

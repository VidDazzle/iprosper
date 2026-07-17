/**
 * Evolve AI OS — public API surface.
 *
 * Import the kernel and subsystems from here when embedding the OS in another
 * host (e.g. the Evolve Next.js app or a serverless function).
 */
export * from "./crypto/index.js";
export * from "./identity/index.js";
export * from "./audit/index.js";
export * from "./policy/index.js";
export * from "./agents/index.js";
export * from "./orchestrator/index.js";
export * from "./connectors/index.js";
export * from "./config/index.js";
export * from "./gateway/index.js";
export { Kernel } from "./kernel/kernel.js";

import { z } from "zod";

export const ENGINES = ["client-acquisition", "affiliate", "evolve"] as const;
export const engineSchema = z.enum(ENGINES);
export type Engine = z.infer<typeof engineSchema>;

export const engineStatusSchema = z.enum(["balanced", "concentrated", "heartbeat"]);
export type EngineStatus = z.infer<typeof engineStatusSchema>;

export const dispatchStageSchema = z.enum([
  "scrape",
  "extract",
  "render",
  "voice",
  "notify",
  "closed",
]);

export const dispatchStatusSchema = z.enum([
  "queued",
  "running",
  "completed",
  "failed",
  "killed",
]);

// ---- apex.dispatch ----------------------------------------------------

export const dispatchTaskInputSchema = z.object({
  agentId: z.string().min(1),
  engine: engineSchema,
  source: z.string().min(1),
  task: z.record(z.string(), z.unknown()),
  budgetCap: z.number().positive(),
});
export type DispatchTaskInput = z.infer<typeof dispatchTaskInputSchema>;

// ---- apex.ledger --------------------------------------------------------

export const ledgerEntrySchema = z.object({
  key: z.string(), // engine name, or `${engine}:${agentId}` for per-agent rows
  engine: engineSchema,
  agentId: z.string().optional(),
  spend: z.number(),
  revenue: z.number(),
  pnl: z.number(),
  jobCount: z.number().int(),
  // "Credit" = the sum of budgetCap across this row's jobs — the hard
  // ceiling recordCost() enforces per job, not a business-model
  // guarantee of profit. budgetAllocated - spend = what's left before
  // every job in this row hits its own hard cap.
  budgetAllocated: z.number(),
  creditRemaining: z.number(),
});
export type LedgerEntry = z.infer<typeof ledgerEntrySchema>;

export const portfolioSummarySchema = z.object({
  spend: z.number(),
  revenue: z.number(),
  pnl: z.number(),
  jobCount: z.number().int(),
  budgetAllocated: z.number(),
  creditRemaining: z.number(),
});
export type PortfolioSummary = z.infer<typeof portfolioSummarySchema>;

export const ledgerSnapshotSchema = z.object({
  generatedAt: z.string().datetime(),
  portfolio: portfolioSummarySchema,
  byEngine: z.array(ledgerEntrySchema),
  byAgent: z.array(ledgerEntrySchema),
});
export type LedgerSnapshot = z.infer<typeof ledgerSnapshotSchema>;

// ---- apex.kill ------------------------------------------------------------

export const killResultSchema = z.object({
  agentId: z.string(),
  status: z.literal("killed"),
  reason: z.string(),
  killedAt: z.string().datetime(),
});
export type KillResult = z.infer<typeof killResultSchema>;

// ---- apex.rebalance ---------------------------------------------------

export const rebalanceAllocationSchema = z.object({
  engine: engineSchema,
  weight: z.number().min(0).max(1),
  status: engineStatusSchema,
});

export const rebalanceResultSchema = z.object({
  weekStart: z.string().datetime(),
  allocations: z.array(rebalanceAllocationSchema),
});
export type RebalanceResult = z.infer<typeof rebalanceResultSchema>;

// ---- apex.scan / Scout --------------------------------------------------

export const opportunityCategorySchema = z.enum([
  "new-vertical",
  "new-app",
  "new-affiliate-program",
]);

export const confidenceSchema = z.enum(["low", "med", "high"]);

export const opportunityCandidateSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: opportunityCategorySchema,
  estRevenueMonthly: z.number().nonnegative(),
  confidence: confidenceSchema,
  confidenceBasis: z.string().min(1),
  estBuildHours: z.number().nonnegative(),
  infraReuse: z.array(z.string()),
  score: z.number(),
  complianceFlags: z.array(z.string()),
  status: z.literal("pending_review"),
});
export type OpportunityCandidate = z.infer<typeof opportunityCandidateSchema>;

// ---- Rebrand Engine pipeline (Phase 2, defined now for shared use) -----

export const jobRequestSchema = z.object({
  url: z.string().url(),
  vertical: z.enum(["luxe", "built", "destination"]).optional(),
  ip: z.string(),
  ts: z.string().datetime(),
});
export type JobRequest = z.infer<typeof jobRequestSchema>;

export const brandKitSchema = z.object({
  name: z.string(),
  palette: z.array(z.string()),
  fonts: z.array(z.string()),
  logoUrl: z.string().url().optional(),
  services: z.array(z.string()),
  reviews: z.array(z.record(z.string(), z.unknown())),
});
export type BrandKit = z.infer<typeof brandKitSchema>;

export const previewResultSchema = z.object({
  previewUrl: z.string().url(),
  expiresAt: z.string().datetime(),
  voiceAgentId: z.string().optional(),
});
export type PreviewResult = z.infer<typeof previewResultSchema>;

export const leadSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  consentTimestamp: z.string().datetime(),
  consentText: z.string().min(1),
  source: z.string().min(1),
});
export type Lead = z.infer<typeof leadSchema>;

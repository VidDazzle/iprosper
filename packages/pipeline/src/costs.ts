/**
 * Per-stage cost estimates. NOT sourced from real API pricing — these
 * are placeholders sized to fit comfortably under the default
 * MAX_COST_PER_PREVIEW ($5, packages/config), flagged here the same way
 * the rebalance thresholds are flagged in .env.example. Replace with
 * real numbers once actual scraping/LLM/voice provider costs are known.
 */
export const STAGE_COST = {
  scrape: Number(process.env.STAGE_COST_SCRAPE ?? 0.05),
  extract: Number(process.env.STAGE_COST_EXTRACT ?? 0.3),
  render: Number(process.env.STAGE_COST_RENDER ?? 0.05),
  geminiSite: Number(process.env.STAGE_COST_GEMINI_SITE ?? 0.1),
  netlifyDeploy: Number(process.env.STAGE_COST_NETLIFY_DEPLOY ?? 0.01),
  voice: Number(process.env.STAGE_COST_VOICE ?? 0.5),
};

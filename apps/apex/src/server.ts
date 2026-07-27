import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { engineSchema } from "@apex/contracts";
import { loadEnv } from "@apex/config";
import { scan } from "./scan.js";
import { dispatch } from "./dispatch.js";
import { computeLedgerWithZeroFill } from "./ledger.js";
import { runWeeklyRebalance } from "./rebalance.js";
import { kill } from "./killSwitch.js";
import { startKillSwitchCron } from "./cron/killSwitchCron.js";
import { startRebalanceCron } from "./cron/rebalanceCron.js";
import { startScoutCron } from "./cron/scoutCron.js";
import { startSweeperCron } from "./cron/sweeperCron.js";
import { startDigestCron } from "./cron/digestCron.js";
import { startHeartbeatCron } from "./cron/heartbeatCron.js";
import { startAutonomousApprovalCron } from "./cron/autonomousApprovalCron.js";
import { generateAndDeliverWeeklyDigest } from "@apex/digest";
import { approveOpportunity, rejectOpportunity, runAutonomousApprovalSweep } from "@apex/scout";
import { runHeartbeat, getLatestHeartbeat, isHeartbeatStale, heartbeatStaleAfterMs } from "@apex/health";

const env = loadEnv();

const server = new McpServer({
  name: "apex",
  version: "0.1.0",
});

server.tool(
  "apex.scan",
  "Scout runs across all engines, returns ranked opportunities by expected-value-per-credit.",
  {},
  async () => {
    const candidates = await scan();
    return { content: [{ type: "text", text: JSON.stringify(candidates, null, 2) }] };
  },
);

server.tool(
  "apex.dispatch",
  "Queues a sub-agent job with a hard credit cap.",
  {
    agentId: z.string().min(1),
    engine: engineSchema,
    source: z.string().min(1),
    task: z.record(z.string(), z.unknown()),
    budgetCap: z.number().positive(),
  },
  async (input) => {
    const job = await dispatch(input);
    return { content: [{ type: "text", text: JSON.stringify(job, null, 2) }] };
  },
);

server.tool(
  "apex.ledger",
  "Real-time P&L per engine and per agent.",
  {
    engineId: engineSchema.optional(),
  },
  async ({ engineId }) => {
    const snapshot = await computeLedgerWithZeroFill();
    const filtered = engineId
      ? {
          ...snapshot,
          byEngine: snapshot.byEngine.filter((e) => e.engine === engineId),
          byAgent: snapshot.byAgent.filter((e) => e.engine === engineId),
        }
      : snapshot;
    return { content: [{ type: "text", text: JSON.stringify(filtered, null, 2) }] };
  },
);

server.tool(
  "apex.rebalance",
  "Weekly rebalance across the three engines, per the 2-consecutive-cycle concentration rule.",
  {},
  async () => {
    const result = await runWeeklyRebalance();
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  },
);

server.tool(
  "apex.kill",
  "Instant halt for one agent. Auto-fires hourly when 7-day rolling spend exceeds revenue.",
  {
    agentId: z.string().min(1),
    reason: z.string().min(1),
  },
  async ({ agentId, reason }) => {
    const result = await kill(agentId, reason, "apex.kill:manual");
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  },
);

server.tool(
  "apex.digest",
  "Generates (and attempts delivery of) the Auditor weekly report for the most recently completed week.",
  {},
  async () => {
    const digest = await generateAndDeliverWeeklyDigest();
    return { content: [{ type: "text", text: JSON.stringify(digest, null, 2) }] };
  },
);

server.tool(
  "apex.approveOpportunity",
  "The only sanctioned path from a Scout candidate to a real dispatch — human-gated, never automatic.",
  {
    candidateId: z.string().min(1),
    approvedBy: z.string().min(1),
    agentId: z.string().min(1),
    budgetCap: z.number().positive(),
  },
  async ({ candidateId, approvedBy, agentId, budgetCap }) => {
    const job = await approveOpportunity(candidateId, approvedBy, agentId, budgetCap);
    return { content: [{ type: "text", text: JSON.stringify(job, null, 2) }] };
  },
);

server.tool(
  "apex.health",
  "Self-check heartbeat: runs a live DB/Redis check and reports whether the background cron scheduler has been ticking recently.",
  {},
  async () => {
    const current = await runHeartbeat();
    const latest = await getLatestHeartbeat();
    const stale = isHeartbeatStale(latest, new Date(), heartbeatStaleAfterMs());
    return { content: [{ type: "text", text: JSON.stringify({ ...current, schedulerStale: stale }, null, 2) }] };
  },
);

server.tool(
  "apex.autonomousApprovalSweep",
  "Manually runs the autonomous-approval sweep: auto-dispatches eligible Scout candidates under the hard caps, sends SMS/email approval requests for the rest. No-ops unless LIVE_MODE + AUTONOMOUS_APPROVAL_ENABLED are both true.",
  {},
  async () => {
    const result = await runAutonomousApprovalSweep();
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  },
);

server.tool(
  "apex.rejectOpportunity",
  "Marks a Scout candidate rejected.",
  {
    candidateId: z.string().min(1),
    rejectedBy: z.string().min(1),
    reason: z.string().min(1),
  },
  async ({ candidateId, rejectedBy, reason }) => {
    await rejectOpportunity(candidateId, rejectedBy, reason);
    return { content: [{ type: "text", text: "ok" }] };
  },
);

async function main() {
  console.info(`[apex] starting — LIVE_MODE=${env.LIVE_MODE}`);
  if (!env.LIVE_MODE) {
    console.info("[apex] dry-run: no real spend or outbound contact will occur.");
  }

  startKillSwitchCron();
  startRebalanceCron();
  startScoutCron();
  startSweeperCron();
  startDigestCron();
  startHeartbeatCron();
  startAutonomousApprovalCron();

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("[apex] fatal error during startup:", err);
  process.exit(1);
});

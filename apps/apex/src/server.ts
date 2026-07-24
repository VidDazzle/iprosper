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

async function main() {
  console.info(`[apex] starting — LIVE_MODE=${env.LIVE_MODE}`);
  if (!env.LIVE_MODE) {
    console.info("[apex] dry-run: no real spend or outbound contact will occur.");
  }

  startKillSwitchCron();
  startRebalanceCron();

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("[apex] fatal error during startup:", err);
  process.exit(1);
});

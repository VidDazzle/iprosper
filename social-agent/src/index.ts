#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "./config/config.js";
import { StateStore } from "./core/state.js";
import { Orchestrator } from "./core/orchestrator.js";
import { Scheduler } from "./core/scheduler.js";
import { registerTools } from "./tools/index.js";
import { childLogger } from "./core/logger.js";

const log = childLogger("mcp-server");

async function main() {
  const config = loadConfig();
  const state = new StateStore(config.dbPath);
  const orchestrator = new Orchestrator(config, state);

  // The scheduler runs in-process alongside the MCP server so autopilot
  // campaigns keep firing on schedule even while an MCP client is attached
  // and idle between tool calls.
  const scheduler = new Scheduler(orchestrator);
  scheduler.start();

  const server = new McpServer({
    name: "iprosper-social-agent",
    version: "0.1.0",
  });
  registerTools(server, orchestrator);

  const transport = new StdioServerTransport();
  await server.connect(transport);
  log.info("MCP server connected over stdio");

  const shutdown = () => {
    scheduler.stop();
    state.close();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  log.error({ err }, "fatal error starting MCP server");
  process.exit(1);
});

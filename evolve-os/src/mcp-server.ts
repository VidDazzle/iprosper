/**
 * Evolve OS MCP server entry point (stdio transport).
 *
 * Launch this from any MCP client to let it drive the operating system. Example
 * client config (Claude Desktop / Codex):
 *
 *   {
 *     "mcpServers": {
 *       "evolve-os": { "command": "node", "args": ["dist/src/mcp-server.js"] }
 *     }
 *   }
 *
 * The server boots a kernel, installs the reference multi-agent fleet, starts
 * the self-healing + self-optimizing loops, and exposes the OS as MCP tools.
 */
import { Kernel } from "./kernel/kernel.js";
import { installDefaultFleet } from "./bootstrap.js";
import { StdioTransport } from "./mcp/stdio.js";
import { createEvolveMcpServer } from "./mcp/evolve-tools.js";

const kernel = Kernel.boot();
installDefaultFleet(kernel);
kernel.startSelfManagement();

const transport = new StdioTransport();
const server = createEvolveMcpServer(kernel, transport);
server.start();

// stderr is safe for logs; stdout is reserved for the JSON-RPC channel.
process.stderr.write("evolve-os MCP server ready (stdio)\n");

function shutdown(): void {
  kernel.stopSelfManagement();
  transport.close();
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

import { createInterface, type Interface } from "node:readline";
import {
  JSONRPC_VERSION,
  type JsonRpcRequest,
  type JsonRpcResponse,
  type McpTransport,
} from "./protocol.js";

/**
 * MCP stdio transport: newline-delimited JSON-RPC over stdin/stdout. This is
 * the standard way an MCP client (Claude Desktop, Codex, the Claude CLI)
 * launches and talks to a server process.
 */
export class StdioTransport implements McpTransport {
  private rl: Interface | null = null;
  private handler: ((msg: JsonRpcRequest) => void) | null = null;

  onMessage(handler: (msg: JsonRpcRequest) => void): void {
    this.handler = handler;
  }

  start(): void {
    this.rl = createInterface({ input: process.stdin, terminal: false });
    this.rl.on("line", (line) => {
      const trimmed = line.trim();
      if (!trimmed) return;
      let msg: JsonRpcRequest;
      try {
        msg = JSON.parse(trimmed);
      } catch {
        this.send({
          jsonrpc: JSONRPC_VERSION,
          id: null,
          error: { code: -32700, message: "parse error" },
        });
        return;
      }
      this.handler?.(msg);
    });
  }

  send(msg: JsonRpcResponse): void {
    process.stdout.write(JSON.stringify(msg) + "\n");
  }

  close(): void {
    this.rl?.close();
    this.rl = null;
  }
}

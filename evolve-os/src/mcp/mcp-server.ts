import {
  JSONRPC_VERSION,
  MCP_PROTOCOL_VERSION,
  ErrorCodes,
  type JsonRpcRequest,
  type McpTool,
  type McpTransport,
  type ToolResult,
} from "./protocol.js";

export type ToolHandler = (args: Record<string, unknown>) => Promise<ToolResult> | ToolResult;

export interface ServerInfo {
  name: string;
  version: string;
}

/**
 * Transport-agnostic MCP server. Register tools with {@link tool}; the server
 * handles the JSON-RPC lifecycle (initialize / tools/list / tools/call / ping).
 * Tool handler exceptions are returned as `isError` tool results, not protocol
 * errors, per MCP convention.
 */
export class McpServer {
  private readonly tools = new Map<string, { def: McpTool; handler: ToolHandler }>();

  constructor(
    private readonly transport: McpTransport,
    private readonly info: ServerInfo,
  ) {}

  tool(def: McpTool, handler: ToolHandler): this {
    this.tools.set(def.name, { def, handler });
    return this;
  }

  start(): void {
    this.transport.onMessage((msg) => void this.handle(msg));
    this.transport.start();
  }

  private isNotification(msg: JsonRpcRequest): boolean {
    return msg.id === undefined || msg.id === null;
  }

  private async handle(msg: JsonRpcRequest): Promise<void> {
    if (msg.jsonrpc !== JSONRPC_VERSION) {
      if (!this.isNotification(msg)) {
        this.replyError(msg.id!, ErrorCodes.InvalidRequest, "invalid jsonrpc version");
      }
      return;
    }

    switch (msg.method) {
      case "initialize":
        return this.reply(msg.id!, {
          protocolVersion: MCP_PROTOCOL_VERSION,
          capabilities: { tools: { listChanged: false } },
          serverInfo: this.info,
        });
      case "notifications/initialized":
      case "notifications/cancelled":
        return; // notifications: no response
      case "ping":
        return this.reply(msg.id!, {});
      case "tools/list":
        return this.reply(msg.id!, {
          tools: [...this.tools.values()].map((t) => t.def),
        });
      case "tools/call":
        return this.handleToolCall(msg);
      default:
        if (!this.isNotification(msg)) {
          this.replyError(msg.id!, ErrorCodes.MethodNotFound, `method not found: ${msg.method}`);
        }
    }
  }

  private async handleToolCall(msg: JsonRpcRequest): Promise<void> {
    const params = (msg.params ?? {}) as { name?: string; arguments?: Record<string, unknown> };
    const name = params.name;
    if (!name || !this.tools.has(name)) {
      return this.replyError(msg.id!, ErrorCodes.InvalidParams, `unknown tool: ${name}`);
    }
    const { handler } = this.tools.get(name)!;
    try {
      const result = await handler(params.arguments ?? {});
      return this.reply(msg.id!, result);
    } catch (err) {
      const text = err instanceof Error ? err.message : String(err);
      return this.reply(msg.id!, {
        content: [{ type: "text", text: `error: ${text}` }],
        isError: true,
      } satisfies ToolResult);
    }
  }

  private reply(id: string | number, result: unknown): void {
    this.transport.send({ jsonrpc: JSONRPC_VERSION, id, result });
  }

  private replyError(id: string | number, code: number, message: string): void {
    this.transport.send({ jsonrpc: JSONRPC_VERSION, id, error: { code, message } });
  }
}

/** Helper to build a text tool result. */
export function textResult(value: unknown): ToolResult {
  const text = typeof value === "string" ? value : JSON.stringify(value, null, 2);
  return { content: [{ type: "text", text }] };
}

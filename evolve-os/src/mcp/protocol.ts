/**
 * Minimal JSON-RPC 2.0 + Model Context Protocol types. Dependency-free.
 * We implement the subset needed to serve tools: initialize, tools/list,
 * tools/call, plus ping. Transport is newline-delimited JSON (MCP stdio).
 */
export const JSONRPC_VERSION = "2.0";
export const MCP_PROTOCOL_VERSION = "2024-11-05";

export interface JsonRpcRequest {
  jsonrpc: "2.0";
  id?: string | number | null;
  method: string;
  params?: unknown;
}

export interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: string | number | null;
  result?: unknown;
  error?: JsonRpcError;
}

export interface JsonRpcError {
  code: number;
  message: string;
  data?: unknown;
}

export const ErrorCodes = {
  ParseError: -32700,
  InvalidRequest: -32600,
  MethodNotFound: -32601,
  InvalidParams: -32602,
  InternalError: -32603,
} as const;

export interface McpTool {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export interface ToolResult {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}

export interface McpTransport {
  /** Register the handler for incoming JSON-RPC messages. */
  onMessage(handler: (msg: JsonRpcRequest) => void): void;
  /** Send a JSON-RPC response/notification. */
  send(msg: JsonRpcResponse): void;
  start(): void;
  close(): void;
}

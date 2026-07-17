import { test } from "node:test";
import assert from "node:assert/strict";
import { Kernel } from "../src/kernel/kernel.js";
import { installDefaultFleet } from "../src/bootstrap.js";
import { createEvolveMcpServer } from "../src/mcp/evolve-tools.js";
import type { JsonRpcRequest, JsonRpcResponse, McpTransport } from "../src/mcp/protocol.js";

/** In-memory transport that lets a test push requests and capture responses. */
class TestTransport implements McpTransport {
  private handler: ((msg: JsonRpcRequest) => void) | null = null;
  readonly sent: JsonRpcResponse[] = [];
  onMessage(h: (msg: JsonRpcRequest) => void): void { this.handler = h; }
  send(msg: JsonRpcResponse): void { this.sent.push(msg); }
  start(): void {}
  close(): void {}
  push(msg: JsonRpcRequest): void { this.handler?.(msg); }
}

function devKernel(): Kernel {
  return Kernel.boot({
    env: "development", httpPort: 0, kmsRootKeyBase64: "",
    tokenKeyId: "t", tokenPrivateKeyPem: "", tokenPublicKeyPem: "",
    tokenTtlSec: 3600, rateLimitPerSec: 1000, rateLimitBurst: 1000,
  });
}

async function drain(): Promise<void> {
  await new Promise((r) => setTimeout(r, 60));
}

test("MCP: initialize + tools/list exposes the OS tools", async () => {
  const kernel = devKernel();
  installDefaultFleet(kernel);
  const t = new TestTransport();
  createEvolveMcpServer(kernel, t).start();

  t.push({ jsonrpc: "2.0", id: 1, method: "initialize", params: {} });
  await drain();
  const init = t.sent.find((m) => m.id === 1)!;
  assert.ok(init.result);
  assert.equal((init.result as { serverInfo: { name: string } }).serverInfo.name, "evolve-os");

  t.push({ jsonrpc: "2.0", id: 2, method: "tools/list" });
  await drain();
  const list = t.sent.find((m) => m.id === 2)!;
  const names = (list.result as { tools: Array<{ name: string }> }).tools.map((x) => x.name);
  assert.ok(names.includes("evolve_list_agents"));
  assert.ok(names.includes("evolve_submit_task"));
  assert.ok(names.includes("evolve_system_health"));
  kernel.stopSelfManagement();
});

test("MCP: tools/call runs a task through the fleet", async () => {
  const kernel = devKernel();
  installDefaultFleet(kernel);
  const t = new TestTransport();
  createEvolveMcpServer(kernel, t).start();

  const coordinator = kernel.registry.getByName("evolve", "evolve-coordinator")!;
  t.push({
    jsonrpc: "2.0", id: 10, method: "tools/call",
    params: { name: "evolve_submit_task", arguments: { agentId: coordinator.id, input: { text: "pricing please" } } },
  });
  await drain();
  const resp = t.sent.find((m) => m.id === 10)!;
  const text = (resp.result as { content: Array<{ text: string }> }).content[0]!.text;
  const parsed = JSON.parse(text) as { state: string; result: { intent: string } };
  assert.equal(parsed.state, "completed");
  assert.equal(parsed.result.intent, "pricing");
  kernel.stopSelfManagement();
});

test("MCP: unknown tool returns InvalidParams error", async () => {
  const kernel = devKernel();
  const t = new TestTransport();
  createEvolveMcpServer(kernel, t).start();
  t.push({ jsonrpc: "2.0", id: 20, method: "tools/call", params: { name: "nope" } });
  await drain();
  const resp = t.sent.find((m) => m.id === 20)!;
  assert.ok(resp.error);
  assert.equal(resp.error!.code, -32602);
  kernel.stopSelfManagement();
});

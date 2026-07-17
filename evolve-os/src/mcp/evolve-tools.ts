import type { Kernel } from "../kernel/kernel.js";
import type { Principal } from "../identity/principals.js";
import { McpServer, textResult, type ToolHandler } from "./mcp-server.js";
import type { McpTransport } from "./protocol.js";
import type { AgentManifest } from "../agents/manifest.js";

/**
 * Wire the Evolve OS onto an MCP server so any MCP client — Claude Desktop, the
 * Claude CLI, Codex, or a custom agent — can drive the operating system through
 * standard tool calls: register and deploy agents, submit tasks to the
 * multi-agent fleet, inspect self-healing/optimization health, and verify the
 * tamper-evident audit chain.
 *
 * The MCP server runs as a trusted local process launched by the operator, so
 * it acts as an `owner` principal within the configured tenant. All actions
 * still flow through the kernel's policy checks and audit ledger.
 */
export function createEvolveMcpServer(
  kernel: Kernel,
  transport: McpTransport,
  tenantId = process.env.EVOLVE_TENANT ?? "evolve",
): McpServer {
  const owner: Principal = {
    id: "mcp-operator",
    kind: "human",
    displayName: "MCP Operator",
    tenantId,
    roles: ["owner"],
  };

  const server = new McpServer(transport, { name: "evolve-os", version: "0.1.0" });

  const listAgents: ToolHandler = () =>
    textResult(
      kernel.registry.list(tenantId).map((r) => ({
        id: r.id, name: r.manifest.name, state: r.state, runtime: r.manifest.runtime,
      })),
    );

  const registerAgent: ToolHandler = (args) => {
    const manifest = args.manifest as Partial<AgentManifest>;
    if (!manifest || typeof manifest !== "object") throw new Error("manifest object required");
    const rec = kernel.registry.register({ ...(manifest as AgentManifest), tenantId });
    return textResult({ id: rec.id, name: rec.manifest.name, state: rec.state });
  };

  const deployAgent: ToolHandler = (args) => {
    const id = String(args.agentId ?? "");
    if (!id) throw new Error("agentId required");
    // Walk the lifecycle to deployed.
    const rec = kernel.registry.get(id);
    if (!rec) throw new Error(`unknown agent ${id}`);
    if (rec.state === "registered") kernel.registry.transition(id, "reviewing");
    if (rec.state === "reviewing") kernel.registry.transition(id, "approved");
    if (rec.state === "approved") kernel.registry.transition(id, "deployed");
    return textResult({ id, state: kernel.registry.get(id)!.state });
  };

  const submitTask: ToolHandler = async (args) => {
    const agentId = String(args.agentId ?? "");
    if (!agentId) throw new Error("agentId required");
    const input = args.input ?? {};
    const priority = typeof args.priority === "number" ? args.priority : 0;
    const task = await kernel.orchestrator.submit(owner, agentId, input, priority);
    // Give the dispatch loop a moment, then report current state.
    await kernel.orchestrator.tick(kernel.fleet);
    await new Promise((r) => setTimeout(r, 50));
    const current = kernel.orchestrator.queue.get(task.id);
    return textResult({ taskId: task.id, state: current?.state, result: current?.result });
  };

  const getTask: ToolHandler = (args) => {
    const task = kernel.orchestrator.queue.get(String(args.taskId ?? ""));
    if (!task) throw new Error("task not found");
    return textResult(task);
  };

  const systemHealth: ToolHandler = () => textResult(kernel.health());

  const auditVerify: ToolHandler = () => {
    const signerPub = Object.values(kernel.publicKeySet())[0];
    return textResult({
      entries: kernel.audit.snapshot().length,
      verification: kernel.audit.verify(signerPub),
    });
  };

  server
    .tool(
      {
        name: "evolve_list_agents",
        description: "List all agents registered in the Evolve OS for the tenant.",
        inputSchema: { type: "object", properties: {} },
      },
      listAgents,
    )
    .tool(
      {
        name: "evolve_register_agent",
        description:
          "Register a new agent from a manifest (name, version, runtime, capabilities, connectors, limits).",
        inputSchema: {
          type: "object",
          properties: {
            manifest: { type: "object", description: "AgentManifest object (tenantId is set automatically)." },
          },
          required: ["manifest"],
        },
      },
      registerAgent,
    )
    .tool(
      {
        name: "evolve_deploy_agent",
        description: "Advance an agent through review/approval to the deployed state so it can receive tasks.",
        inputSchema: {
          type: "object",
          properties: { agentId: { type: "string" } },
          required: ["agentId"],
        },
      },
      deployAgent,
    )
    .tool(
      {
        name: "evolve_submit_task",
        description: "Submit a task to a deployed agent and return its (near-immediate) state/result.",
        inputSchema: {
          type: "object",
          properties: {
            agentId: { type: "string" },
            input: { type: "object", description: "Arbitrary JSON input for the agent." },
            priority: { type: "number" },
          },
          required: ["agentId"],
        },
      },
      submitTask,
    )
    .tool(
      {
        name: "evolve_get_task",
        description: "Fetch the current state and result of a task by id.",
        inputSchema: {
          type: "object",
          properties: { taskId: { type: "string" } },
          required: ["taskId"],
        },
      },
      getTask,
    )
    .tool(
      {
        name: "evolve_system_health",
        description:
          "Return a live health snapshot: metrics, connector circuit-breaker states, quarantined agents, and the fleet roster.",
        inputSchema: { type: "object", properties: {} },
      },
      systemHealth,
    )
    .tool(
      {
        name: "evolve_audit_verify",
        description: "Verify the tamper-evident audit ledger and return entry count + integrity result.",
        inputSchema: { type: "object", properties: {} },
      },
      auditVerify,
    );

  return server;
}

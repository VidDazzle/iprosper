import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { Kernel } from "./kernel/kernel.js";
import { loadConfig } from "./config/config.js";
import { authenticate } from "./gateway/gateway.js";
import { readBody, sendJson, clientIp } from "./util/http.js";
import { permissionMatches } from "./identity/rbac.js";
import type { Principal } from "./identity/principals.js";
import { EvolveVoiceConnector } from "./connectors/builtin.js";
import type { AgentExecutor, ExecutionContext } from "./orchestrator/orchestrator.js";
import type { Task } from "./orchestrator/task-queue.js";

/**
 * Evolve AI OS — control plane HTTP server.
 *
 * A dependency-free reference server that exposes the kernel over HTTP with the
 * zero-trust gateway in front. It is deliberately small and readable so Codex
 * (or your team) can extend it. Every privileged route is authorized against
 * the token's capabilities; every action is audited.
 */

const config = loadConfig();
const kernel = Kernel.boot(config);

// Register a reference connector so agents have something to call.
kernel.connectors.register(new EvolveVoiceConnector());

/**
 * Demo executor: routes a task to the Evolve voice connector when the input has
 * an `utterance`, otherwise echoes. Replace with your real agent runtime (an
 * LLM loop, a workflow engine, a sandboxed worker).
 */
const demoExecutor: AgentExecutor = {
  async execute(task: Task, ctx: ExecutionContext): Promise<unknown> {
    const input = task.input as { utterance?: string } | undefined;
    if (input?.utterance) {
      return kernel.connectors.invoke("evolve.voice", { utterance: input.utterance }, ctx);
    }
    return { echoed: task.input, at: new Date().toISOString() };
  },
};

// Background dispatch loop.
const dispatch = setInterval(() => {
  void kernel.orchestrator.tick(demoExecutor);
}, 250);

function requireCap(caps: string[], required: string): boolean {
  return permissionMatches(new Set(caps), required);
}

async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = new URL(req.url ?? "/", "http://localhost");
  const path = url.pathname;
  const method = req.method ?? "GET";

  // Read the body once, up front, so the zero-trust gateway can threat-scan it
  // and route handlers can reuse it without re-reading the stream.
  let rawBody = "";
  if (method === "POST" || method === "PUT" || method === "PATCH") {
    try {
      rawBody = await readBody(req);
    } catch {
      return sendJson(res, 413, { error: "payload too large" });
    }
  }

  // --- Unauthenticated: liveness/readiness + public key set ---
  if (path === "/health" && method === "GET") {
    return sendJson(res, 200, { status: "ok", env: config.env, ts: new Date().toISOString() });
  }
  if (path === "/ready" && method === "GET") {
    const conn = await kernel.connectors.healthAll();
    return sendJson(res, 200, { status: "ready", connectors: conn });
  }
  if (path === "/.well-known/evolve-keys" && method === "GET") {
    return sendJson(res, 200, { keys: kernel.publicKeySet() });
  }

  // --- Bootstrap token (dev only, or admin-key gated) ---
  if (path === "/v1/auth/bootstrap" && method === "POST") {
    const body = rawBody;
    const parsed = safeJson<{ tenantId?: string; adminKey?: string; roles?: string[] }>(body) ?? {};
    if (config.env !== "development") {
      const expected = process.env.EVOLVE_ADMIN_KEY;
      if (!expected || parsed.adminKey !== expected) {
        return sendJson(res, 403, { error: "bootstrap requires valid EVOLVE_ADMIN_KEY" });
      }
    }
    const owner: Principal = {
      id: "owner-bootstrap",
      kind: "human",
      displayName: "Bootstrap Owner",
      tenantId: parsed.tenantId ?? "evolve",
      roles: parsed.roles ?? ["owner"],
    };
    const caps = [...kernel.rbac.permissionsFor(owner.roles)];
    const token = kernel.issueTokenFor(owner, caps);
    await kernel.audit.record({
      actor: owner.id,
      tenantId: owner.tenantId,
      action: "auth.bootstrap",
      outcome: "allow",
    });
    return sendJson(res, 200, { token, capabilities: caps, expiresInSec: config.tokenTtlSec });
  }

  // --- Everything below requires authentication via the gateway ---
  const auth = authenticate(kernel, {
    ...(req.headers.authorization ? { authorization: req.headers.authorization } : {}),
    ...(clientIp(req) ? { ip: clientIp(req)! } : {}),
    ...(typeof req.headers["user-agent"] === "string" ? { userAgent: req.headers["user-agent"] } : {}),
    path,
    ...(rawBody ? { body: rawBody } : {}),
  });
  if (!auth.ok) {
    return sendJson(res, auth.status, { error: auth.reason });
  }
  const { principal, capabilities } = auth;

  // GET /v1/agents — list agents in tenant
  if (path === "/v1/agents" && method === "GET") {
    if (!requireCap(capabilities, "agent:read")) return forbidden(res, "agent:read");
    return sendJson(res, 200, { agents: kernel.registry.list(principal.tenantId) });
  }

  // POST /v1/agents — register an agent from a manifest
  if (path === "/v1/agents" && method === "POST") {
    if (!requireCap(capabilities, "agent:register")) return forbidden(res, "agent:register");
    const body = safeJson<Record<string, unknown>>(rawBody) ?? {};
    try {
      const rec = kernel.registry.register({ ...(body as any), tenantId: principal.tenantId });
      await kernel.audit.record({
        actor: principal.id,
        tenantId: principal.tenantId,
        action: "agent.register",
        target: rec.id,
        outcome: "allow",
      });
      return sendJson(res, 201, { agent: rec });
    } catch (err) {
      return sendJson(res, 400, { error: err instanceof Error ? err.message : String(err) });
    }
  }

  // POST /v1/agents/:id/transition — lifecycle transition (e.g. deploy)
  const transMatch = /^\/v1\/agents\/([^/]+)\/transition$/.exec(path);
  if (transMatch && method === "POST") {
    if (!requireCap(capabilities, "agent:deploy")) return forbidden(res, "agent:deploy");
    const body = safeJson<{ to?: string }>(rawBody) ?? {};
    try {
      const rec = kernel.registry.transition(transMatch[1]!, body.to as any);
      await kernel.audit.record({
        actor: principal.id,
        tenantId: principal.tenantId,
        action: "agent.transition",
        target: rec.id,
        outcome: "allow",
        metadata: { to: rec.state },
      });
      await kernel.bus.emit("agent.state", { agentId: rec.id, state: rec.state });
      return sendJson(res, 200, { agent: rec });
    } catch (err) {
      return sendJson(res, 400, { error: err instanceof Error ? err.message : String(err) });
    }
  }

  // POST /v1/tasks — submit a task to an agent
  if (path === "/v1/tasks" && method === "POST") {
    if (!requireCap(capabilities, "task:submit")) return forbidden(res, "task:submit");
    const body = safeJson<{ agentId?: string; input?: unknown; priority?: number }>(rawBody) ?? {};
    if (!body.agentId) return sendJson(res, 400, { error: "agentId required" });
    try {
      const task = await kernel.orchestrator.submit(
        principal,
        body.agentId,
        body.input ?? {},
        body.priority ?? 0,
      );
      return sendJson(res, 202, { task });
    } catch (err) {
      return sendJson(res, 400, { error: err instanceof Error ? err.message : String(err) });
    }
  }

  // GET /v1/tasks/:id — task status
  const taskMatch = /^\/v1\/tasks\/([^/]+)$/.exec(path);
  if (taskMatch && method === "GET") {
    if (!requireCap(capabilities, "task:read")) return forbidden(res, "task:read");
    const task = kernel.orchestrator.queue.get(taskMatch[1]!);
    if (!task || task.tenantId !== principal.tenantId) {
      return sendJson(res, 404, { error: "task not found" });
    }
    return sendJson(res, 200, { task });
  }

  // GET /v1/audit — read + verify the audit chain
  if (path === "/v1/audit" && method === "GET") {
    if (!requireCap(capabilities, "audit:read")) return forbidden(res, "audit:read");
    const entries = kernel.audit.snapshot();
    const signerPub = Object.values(kernel.publicKeySet())[0];
    const verification = kernel.audit.verify(signerPub);
    return sendJson(res, 200, { count: entries.length, verification, entries: entries.slice(-100) });
  }

  return sendJson(res, 404, { error: "not found" });
}

function forbidden(res: ServerResponse, cap: string): void {
  sendJson(res, 403, { error: `missing capability: ${cap}` });
}

function safeJson<T>(s: string): T | null {
  try {
    return s ? (JSON.parse(s) as T) : null;
  } catch {
    return null;
  }
}

const server = createServer((req, res) => {
  handle(req, res).catch((err) => {
    console.error("[server] unhandled:", err);
    if (!res.headersSent) sendJson(res, 500, { error: "internal error" });
  });
});

server.listen(config.httpPort, () => {
  console.log(`Evolve AI OS control plane listening on :${config.httpPort} (${config.env})`);
});

function shutdown(): void {
  clearInterval(dispatch);
  kernel.orchestrator.drain();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 5000).unref();
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

export { kernel, server };

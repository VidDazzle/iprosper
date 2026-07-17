import type { Kernel } from "../kernel/kernel.js";
import type { Principal } from "../identity/principals.js";
import { assessThreat, type RequestSignal } from "../policy/threat-detector.js";

/**
 * Zero-trust gateway. NOTHING is trusted by network position — every request
 * must present a valid verifiable token, clears the threat detector, and is
 * resolved to a least-privilege principal before any handler runs. This is the
 * choke point that fronts the control plane and every agent-facing endpoint.
 */
export interface GatewayRequest {
  authorization?: string; // "Bearer <token>"
  ip?: string;
  userAgent?: string;
  path: string;
  body?: string;
}

export type GatewayResult =
  | { ok: true; principal: Principal; capabilities: string[]; jti: string }
  | { ok: false; status: number; reason: string };

export function authenticate(kernel: Kernel, req: GatewayRequest, audience?: string): GatewayResult {
  // 1. Threat pre-screen (cheap, runs before crypto to shed obvious abuse).
  const signal: RequestSignal = {
    ...(req.ip ? { ip: req.ip } : {}),
    ...(req.userAgent ? { userAgent: req.userAgent } : {}),
    path: req.path,
    ...(req.body ? { body: req.body } : {}),
    authenticated: Boolean(req.authorization),
  };
  const threat = assessThreat(signal);
  if (threat.action === "block") {
    return { ok: false, status: 403, reason: `blocked: ${threat.reasons.join(", ")}` };
  }

  // 2. Token required.
  const token = extractBearer(req.authorization);
  if (!token) return { ok: false, status: 401, reason: "missing bearer token" };

  const result = kernel.verify(token, audience);
  if (!result.ok) return { ok: false, status: 401, reason: result.reason };

  const { claims } = result;
  const principal: Principal = {
    id: claims.sub,
    kind: (claims.knd as Principal["kind"]) ?? "service",
    displayName: claims.sub,
    tenantId: claims.tid,
    roles: [], // roles are resolved server-side; token carries explicit caps
    capabilities: claims.cap, // explicit least-privilege caps from the token
  };
  return { ok: true, principal, capabilities: claims.cap, jti: claims.jti };
}

function extractBearer(header?: string): string | null {
  if (!header) return null;
  const m = /^Bearer\s+(.+)$/i.exec(header.trim());
  return m ? m[1]! : null;
}

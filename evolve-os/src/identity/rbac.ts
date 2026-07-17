import type { Principal } from "./principals.js";

/**
 * Role-Based Access Control with wildcard permissions.
 *
 * A permission is a colon-delimited string: `<resource>:<action>`, e.g.
 * `agent:deploy`, `secret:read`, `connector:invoke`. Wildcards are supported at
 * any segment: `agent:*` grants all agent actions, `*:*` (a.k.a. `*`) grants
 * everything. This mirrors the model used by cloud IAM systems.
 */
export interface Role {
  readonly name: string;
  readonly description: string;
  readonly permissions: string[];
  /** Roles whose permissions are also granted (single-level inheritance). */
  readonly inherits?: string[];
}

export class RbacRegistry {
  private readonly roles = new Map<string, Role>();

  constructor(roles: Role[] = DEFAULT_ROLES) {
    for (const r of roles) this.roles.set(r.name, r);
  }

  define(role: Role): void {
    this.roles.set(role.name, role);
  }

  /** All effective permissions for a set of role names (inheritance resolved). */
  permissionsFor(roleNames: string[]): Set<string> {
    const out = new Set<string>();
    const visit = (name: string, depth: number): void => {
      if (depth > 8) return; // guard against inheritance cycles
      const role = this.roles.get(name);
      if (!role) return;
      for (const p of role.permissions) out.add(p);
      for (const parent of role.inherits ?? []) visit(parent, depth + 1);
    };
    for (const name of roleNames) visit(name, 0);
    return out;
  }

  /** Does the principal hold `required` (e.g. `agent:deploy`)? */
  can(principal: Principal, required: string): boolean {
    const perms = this.permissionsFor(principal.roles);
    // Union role-derived permissions with the principal's explicit (token)
    // capabilities so both authorization models are honored.
    for (const c of principal.capabilities ?? []) perms.add(c);
    return permissionMatches(perms, required);
  }
}

/** True if any granted permission pattern satisfies the required permission. */
export function permissionMatches(
  granted: Set<string>,
  required: string,
): boolean {
  if (granted.has("*") || granted.has("*:*")) return true;
  if (granted.has(required)) return true;
  const [resource, action] = required.split(":", 2);
  if (granted.has(`${resource}:*`)) return true;
  if (granted.has(`*:${action}`)) return true;
  return false;
}

/** Sensible default roles for an Evolve deployment. */
export const DEFAULT_ROLES: Role[] = [
  {
    name: "root",
    description: "Unrestricted kernel access. Reserve for the system principal.",
    permissions: ["*"],
  },
  {
    name: "owner",
    description: "Tenant owner — full control within their tenant.",
    permissions: [
      "agent:*",
      "connector:*",
      "secret:*",
      "policy:*",
      "audit:read",
      "principal:*",
      "task:*",
    ],
  },
  {
    name: "operator",
    description: "Runs and monitors agents but cannot manage principals/policy.",
    permissions: [
      "agent:deploy",
      "agent:invoke",
      "agent:read",
      "agent:pause",
      "task:*",
      "connector:invoke",
      "connector:read",
      "audit:read",
    ],
  },
  {
    name: "developer",
    description: "Builds and registers agents and connectors; no prod deploy.",
    permissions: [
      "agent:register",
      "agent:read",
      "agent:invoke",
      "connector:register",
      "connector:read",
      "task:submit",
      "task:read",
    ],
  },
  {
    name: "agent",
    description: "Default role for autonomous agents — least privilege.",
    permissions: ["task:read", "task:complete", "connector:invoke"],
  },
  {
    name: "auditor",
    description: "Read-only access to audit trail and policy config.",
    permissions: ["audit:read", "policy:read", "agent:read"],
  },
];

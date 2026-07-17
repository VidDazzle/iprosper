/** The kinds of actors the OS recognizes. Everything is a principal. */
export type PrincipalKind = "human" | "agent" | "service" | "system";

export interface Principal {
  readonly id: string;
  readonly kind: PrincipalKind;
  readonly displayName: string;
  /** Tenant / organization the principal belongs to (multi-tenant isolation). */
  readonly tenantId: string;
  /** Assigned role names, resolved against the RBAC registry. */
  readonly roles: string[];
  /**
   * Explicit capabilities granted directly to this principal — e.g. the
   * least-privilege set carried by a verifiable token. These are unioned with
   * role-derived permissions during authorization, so a token-bearing principal
   * with no server-side roles is still authorized for exactly what it holds.
   */
  readonly capabilities?: string[];
  /** Optional free-form attributes for attribute-based checks. */
  readonly attributes?: Record<string, string>;
}

export function isAgent(p: Principal): boolean {
  return p.kind === "agent";
}

export function isHuman(p: Principal): boolean {
  return p.kind === "human";
}

/** The built-in system principal used for internal, fully-trusted operations. */
export const SYSTEM_PRINCIPAL: Principal = {
  id: "system",
  kind: "system",
  displayName: "Evolve OS Kernel",
  tenantId: "*",
  roles: ["root"],
};

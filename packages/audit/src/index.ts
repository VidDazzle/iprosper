import { prisma } from "@apex/db";

export interface AuditEntry {
  actor: string;
  action: string;
  target?: string;
  detail: Record<string, unknown>;
}

/**
 * Append-only. This is the only sanctioned way to write to AuditLog —
 * there is deliberately no update/delete helper exported from this
 * package. The full compliance gate (FTC disclosure, ToS ruleset,
 * licensed-media check, PII scan) lands with the Rebrand Engine in
 * Phase 2; this package currently covers the audit-log primitive that
 * APEX Core's kill-switch/rebalance/dispatch write to.
 */
export async function appendAuditLog(entry: AuditEntry) {
  return prisma.auditLog.create({
    data: {
      actor: entry.actor,
      action: entry.action,
      target: entry.target,
      detail: entry.detail as never,
    },
  });
}

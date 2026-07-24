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
 * package.
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

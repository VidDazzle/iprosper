import { prisma } from "@apex/db";
import { appendAuditLog } from "./auditLog.js";

/**
 * Backs the spec's `/api/erase` endpoint (Section 4). PII fields are
 * overwritten (not the row deleted outright — Touch/DispatchJob history
 * references leadId and the audit trail needs the row to still resolve),
 * and the lead is marked "erased" so no further outbound contact can
 * target it.
 */
export async function eraseLead(leadId: string, requestedBy: string) {
  const lead = await prisma.lead.findUniqueOrThrow({ where: { id: leadId } });

  const erased = await prisma.lead.update({
    where: { id: leadId },
    data: {
      name: "[erased]",
      email: "[erased]",
      phone: null,
      status: "erased",
    },
  });

  await appendAuditLog({
    actor: requestedBy,
    action: "lead_erased",
    target: leadId,
    detail: { previousStatus: lead.status },
  });

  return erased;
}

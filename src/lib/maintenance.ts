import { db } from '@/db';
import { maintenanceRuns } from '@/db/schema';
import { runSelfHeal } from '@/lib/self-heal';
import { runSecurityAudit } from '@/lib/security-audit';
import { runOptimizer } from '@/lib/optimizer';

/**
 * Runs a full self-maintenance cycle (heal + security audit + optimize),
 * persists a scored report, and returns the combined result. Shared by the
 * on-demand endpoint and the scheduled cron route so both behave identically.
 */
export async function runFullMaintenance(
  apply: boolean,
  trigger: 'cron' | 'agent' | 'manual',
) {
  const startedAt = Date.now();

  const [heal, security, optimize] = await Promise.all([
    runSelfHeal(apply),
    runSecurityAudit(),
    runOptimizer(apply),
  ]);

  const rank: Record<string, number> = { ok: 0, degraded: 1, critical: 2 };
  const status = (rank[heal.status] ?? 0) >= (rank[security.status] ?? 0) ? heal.status : security.status;
  const durationMs = Date.now() - startedAt;

  const findings = [
    ...heal.checks.map((c) => ({ engine: 'heal', ...c })),
    ...security.findings.map((f) => ({ engine: 'security', ...f })),
  ];
  const remediations = heal.checks
    .filter((c) => c.remediated > 0)
    .map((c) => ({ check: c.check, remediated: c.remediated }));

  const inserted = await db
    .insert(maintenanceRuns)
    .values({
      kind: 'full',
      status,
      healthScore: heal.healthScore,
      securityScore: security.securityScore,
      findings: JSON.stringify(findings),
      remediations: JSON.stringify(remediations),
      recommendations: JSON.stringify(optimize.recommendations),
      applied: apply,
      durationMs,
      trigger,
      createdAt: new Date().toISOString(),
    })
    .returning();

  return { runId: inserted[0].id, status, applied: apply, durationMs, heal, security, optimize };
}

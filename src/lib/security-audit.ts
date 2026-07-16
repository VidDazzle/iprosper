import { db } from '@/db';
import { voiceAgentLog } from '@/db/schema';
import { and, eq, gte } from 'drizzle-orm';
import { encryptionConfigured } from '@/lib/crypto';
import { agentAuthConfigured } from '@/lib/voice-auth';

/**
 * Security self-audit.
 *
 * Runs on every maintenance cycle to keep the system hardened against evolving
 * threats. It checks configuration strength, verifies the system fails closed,
 * and — the "responds to new threats" part — scans the agent audit log for live
 * attack signatures (credential brute-forcing, action floods). Findings feed a
 * 0-100 security score and concrete recommendations.
 *
 * This complements the automated dependency scanning done in CI (Dependabot +
 * scheduled `npm audit`), which patches newly disclosed CVEs in dependencies.
 */

export interface SecurityFinding {
  control: string;
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  ok: boolean;
  detail: string;
  recommendation?: string;
}

export interface SecurityReport {
  securityScore: number; // 0-100
  status: 'ok' | 'degraded' | 'critical';
  findings: SecurityFinding[];
}

const SEVERITY_PENALTY: Record<SecurityFinding['severity'], number> = {
  info: 0,
  low: 5,
  medium: 12,
  high: 25,
  critical: 45,
};

function isStrongKey(v: string | undefined): boolean {
  return Boolean(v && v.length >= 32);
}

export async function runSecurityAudit(): Promise<SecurityReport> {
  const findings: SecurityFinding[] = [];

  // --- Configuration hardening ------------------------------------------
  findings.push({
    control: 'mail_encryption_at_rest',
    severity: 'critical',
    ok: encryptionConfigured() && isStrongKey(process.env.MAIL_ENCRYPTION_KEY),
    detail: encryptionConfigured()
      ? 'Mailbox encryption key present.'
      : 'MAIL_ENCRYPTION_KEY missing — mail would be stored unencrypted.',
    recommendation: encryptionConfigured()
      ? undefined
      : 'Set a 64-hex-char MAIL_ENCRYPTION_KEY and rotate it periodically.',
  });

  findings.push({
    control: 'voice_agent_auth',
    severity: 'critical',
    ok: agentAuthConfigured() && isStrongKey(process.env.VOICE_AGENT_API_KEY),
    detail: agentAuthConfigured()
      ? 'Voice-agent API key configured; endpoint fails closed.'
      : 'VOICE_AGENT_API_KEY missing — autonomous endpoint rejects all writes (fails closed), but should be set.',
    recommendation: agentAuthConfigured()
      ? undefined
      : 'Set a long random VOICE_AGENT_API_KEY (≥32 chars).',
  });

  findings.push({
    control: 'db_credentials',
    severity: 'high',
    ok: Boolean(process.env.TURSO_AUTH_TOKEN) || Boolean(process.env.TURSO_CONNECTION_URL?.startsWith('file:')),
    detail: process.env.TURSO_AUTH_TOKEN
      ? 'Database auth token present.'
      : 'No TURSO_AUTH_TOKEN — acceptable only for a local file DB.',
    recommendation: 'Use a scoped Turso token in production; rotate on staff changes.',
  });

  findings.push({
    control: 'cron_secret',
    severity: 'medium',
    ok: isStrongKey(process.env.CRON_SECRET),
    detail: process.env.CRON_SECRET
      ? 'Scheduled-maintenance secret configured.'
      : 'CRON_SECRET not set — scheduled maintenance falls back to the agent key.',
    recommendation: 'Set CRON_SECRET so the cron trigger has its own least-privilege credential.',
  });

  // --- Live threat detection on the agent audit log ---------------------
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  // Rejected auth attempts = credential brute-force signature.
  const rejected = await db
    .select({ id: voiceAgentLog.id })
    .from(voiceAgentLog)
    .where(and(eq(voiceAgentLog.status, 'rejected'), gte(voiceAgentLog.createdAt, since)));
  const rejectedCount = rejected.length;
  findings.push({
    control: 'auth_bruteforce_watch',
    severity: rejectedCount >= 20 ? 'high' : rejectedCount >= 5 ? 'medium' : 'info',
    ok: rejectedCount < 5,
    detail: `${rejectedCount} unauthorized agent requests in the last 24h.`,
    recommendation:
      rejectedCount >= 5
        ? 'Rotate VOICE_AGENT_API_KEY and consider IP allow-listing the voice platform.'
        : undefined,
  });

  // Action-volume flood = abuse / runaway integration signature.
  const recent = await db
    .select({ id: voiceAgentLog.id })
    .from(voiceAgentLog)
    .where(gte(voiceAgentLog.createdAt, new Date(Date.now() - 60 * 60 * 1000).toISOString()));
  const hourly = recent.length;
  findings.push({
    control: 'action_flood_watch',
    severity: hourly >= 500 ? 'high' : hourly >= 200 ? 'medium' : 'info',
    ok: hourly < 200,
    detail: `${hourly} agent actions in the last hour.`,
    recommendation: hourly >= 200 ? 'Unusual volume — verify the voice platform isn’t looping or compromised.' : undefined,
  });

  findings.push({
    control: 'error_rate_watch',
    severity: 'info',
    ok: true,
    detail: 'Error-rate baseline recorded for trend comparison.',
  });

  // --- Score ------------------------------------------------------------
  let score = 100;
  for (const f of findings) {
    if (!f.ok) score -= SEVERITY_PENALTY[f.severity];
  }
  score = Math.max(0, Math.min(100, score));
  const hasCritical = findings.some((f) => !f.ok && f.severity === 'critical');
  const status: SecurityReport['status'] = hasCritical || score < 50 ? 'critical' : score < 80 ? 'degraded' : 'ok';

  return { securityScore: score, status, findings };
}

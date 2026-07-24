import { appendAuditLog } from "./auditLog.js";
import { checkFtcDisclosure } from "./ftcDisclosure.js";
import { checkPlatformToS, type ToSCheckResult } from "./platformToS.js";
import { checkLicensedMedia } from "./licensedMedia.js";
import { scanForPii, type PiiMatch } from "./pii.js";

export type ContentType = "affiliate-post" | "rebrand-preview" | "media-asset";

export interface ComplianceGateInput {
  contentType: ContentType;
  content: string;
  network?: string; // required for affiliate-post
  mediaLicenseIds?: string[]; // required for media-asset / anything embedding media
  piiAllowlist?: string[]; // e.g. the business's own public contact info
  jobId?: string;
}

export interface ComplianceCheckOutcome {
  check: string;
  passed: boolean;
  detail: unknown;
}

export class ComplianceGateBlockedError extends Error {
  outcomes: ComplianceCheckOutcome[];
  constructor(outcomes: ComplianceCheckOutcome[]) {
    const failures = outcomes.filter((o) => !o.passed);
    super(
      `Compliance gate blocked (${failures.length} check(s) failed): ${failures
        .map((f) => f.check)
        .join(", ")}`,
    );
    this.name = "ComplianceGateBlockedError";
    this.outcomes = outcomes;
  }
}

/**
 * The Auditor — blocking, not warning (spec Section 3). Runs every
 * applicable check for the given content type, writes an immutable
 * audit-log entry regardless of outcome, and throws
 * ComplianceGateBlockedError if anything failed. Nothing should publish,
 * post, or go out without passing through this.
 */
export async function runComplianceGate(input: ComplianceGateInput): Promise<ComplianceCheckOutcome[]> {
  const outcomes: ComplianceCheckOutcome[] = [];

  const piiMatches: PiiMatch[] = scanForPii(input.content, { allowlist: input.piiAllowlist });
  outcomes.push({ check: "pii_scan", passed: piiMatches.length === 0, detail: piiMatches });

  if (input.contentType === "affiliate-post") {
    const ftc = checkFtcDisclosure(input.content);
    outcomes.push({ check: "ftc_disclosure", passed: ftc.passed, detail: ftc });

    if (!input.network) {
      outcomes.push({
        check: "platform_tos",
        passed: false,
        detail: { reason: "No network specified for an affiliate-post — cannot verify ToS." },
      });
    } else {
      const tos: ToSCheckResult = checkPlatformToS(input.network, input.content);
      outcomes.push({ check: "platform_tos", passed: tos.passed, detail: tos });
    }
  }

  if (input.mediaLicenseIds && input.mediaLicenseIds.length > 0) {
    for (const licenseId of input.mediaLicenseIds) {
      const result = await checkLicensedMedia(licenseId);
      outcomes.push({ check: `licensed_media:${licenseId}`, passed: result.passed, detail: result });
    }
  }

  await appendAuditLog({
    actor: "apex.compliance-gate",
    action: "compliance_check_run",
    target: input.jobId,
    detail: { contentType: input.contentType, outcomes },
  });

  const failed = outcomes.some((o) => !o.passed);
  if (failed) {
    throw new ComplianceGateBlockedError(outcomes);
  }

  return outcomes;
}

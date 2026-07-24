import { prisma } from "@apex/db";

export interface LicensedMediaResult {
  passed: boolean;
  licenseId: string;
  reason?: string;
}

/** Verifies a media asset's license against the audit table (spec Section 3). */
export async function checkLicensedMedia(licenseId: string): Promise<LicensedMediaResult> {
  const license = await prisma.mediaLicense.findUnique({ where: { licenseId } });

  if (!license) {
    return { passed: false, licenseId, reason: `No license record found for "${licenseId}".` };
  }
  if (license.revoked) {
    return { passed: false, licenseId, reason: `License "${licenseId}" has been revoked.` };
  }
  if (license.expiresAt && license.expiresAt < new Date()) {
    return { passed: false, licenseId, reason: `License "${licenseId}" expired on ${license.expiresAt.toISOString()}.` };
  }

  return { passed: true, licenseId };
}

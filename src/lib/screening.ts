/**
 * Background-screening adapter for Evolve Discover.
 *
 * After identity verification (which gives us a verified legal name + DOB), we
 * run a background check against sex-offender registries and criminal /
 * violent / trafficking watchlists through a compliant provider (Checkr,
 * Sterling, or an identity provider's watchlist product such as Persona /
 * Onfido). Anyone who flags for a DISQUALIFYING category is barred from being
 * discoverable, tapping, or matching.
 *
 * We store ONLY the outcome (clear / flagged + which categories) — never the
 * underlying records.
 *
 * ⚖️  COMPLIANCE (Codex must handle before launch):
 *  - Background checks in the US are regulated by the FCRA: you generally need
 *    the person's consent, must use an FCRA-compliant Consumer Reporting Agency,
 *    and must follow adverse-action notice requirements when denying someone.
 *  - Some jurisdictions ("ban-the-box" / fair-chance laws) restrict blanket
 *    criminal bans; sex-offender-registry denials for a dating/meetup context
 *    are broadly defensible, but confirm with counsel per market.
 *  - No screen is perfect (records are incomplete; name matching has false
 *    positives/negatives). Keep block/report + human moderation as backstops.
 */

export type DisqualifyingCategory = 'sex_offense' | 'human_trafficking' | 'violent_felony' | 'kidnapping' | 'child_abuse';

// Categories that bar someone from Discover. Configurable via env
// SCREENING_DISQUALIFIERS (comma-separated) — defaults to the trafficking /
// sexual-violence set the owner asked for.
export function disqualifyingCategories(): DisqualifyingCategory[] {
  const raw = process.env.SCREENING_DISQUALIFIERS;
  if (raw) return raw.split(',').map((s) => s.trim()).filter(Boolean) as DisqualifyingCategory[];
  return ['sex_offense', 'human_trafficking', 'violent_felony', 'kidnapping', 'child_abuse'];
}

export function screeningConfigured(): boolean {
  return Boolean(process.env.CHECKR_API_KEY || process.env.STERLING_API_KEY || process.env.SCREENING_API_KEY);
}

export interface ScreeningSession {
  provider: string;
  sessionId: string;
  status: 'pending' | 'clear' | 'flagged';
  sandbox: boolean;
  note?: string;
}

/**
 * Kick off a background screening for a verified person. In production this
 * creates a report with the CRA (Checkr et al.); the result arrives via webhook.
 * With no provider configured, a labeled sandbox lets the flow be exercised.
 */
export async function startScreening(profileId: number, legalName?: string): Promise<ScreeningSession> {
  const key = process.env.CHECKR_API_KEY;
  if (key) {
    try {
      // Checkr: create a candidate + invitation/report. Kept minimal; Codex maps
      // the exact package (must include national sex offender + criminal search).
      const res = await fetch('https://api.checkr.com/v1/candidates', {
        method: 'POST',
        headers: { Authorization: `Basic ${Buffer.from(`${key}:`).toString('base64')}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ custom_id: String(profileId), ...(legalName ? { first_name: legalName.split(' ')[0], last_name: legalName.split(' ').slice(1).join(' ') || legalName } : {}) }),
      });
      if (res.ok) {
        const c = await res.json();
        return { provider: 'checkr', sessionId: c.id, status: 'pending', sandbox: false };
      }
      console.error('Checkr error:', res.status);
    } catch (err) {
      console.error('startScreening failed:', err);
    }
  }
  return {
    provider: 'none',
    sessionId: `sandbox_screen_${profileId}_${Date.now()}`,
    status: 'pending',
    sandbox: true,
    note: 'Sandbox mode — set CHECKR_API_KEY (or another FCRA-compliant CRA) to run a real sex-offender + criminal background check.',
  };
}

/**
 * Given a provider report's flagged categories, decide the outcome. Returns
 * 'flagged' if any disqualifying category is present, else 'clear'.
 */
export function evaluateReport(flags: string[]): { status: 'clear' | 'flagged'; disqualifying: string[] } {
  const dq = disqualifyingCategories() as string[];
  const hits = flags.filter((f) => dq.includes(f));
  return { status: hits.length ? 'flagged' : 'clear', disqualifying: hits };
}

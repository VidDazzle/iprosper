/**
 * The agreement every attorney or company must accept BEFORE advertising on any
 * VidDazzle LLC site. It captures two things the business requires up front:
 *
 *   1. Consent to a professional business background check.
 *   2. Acknowledgment that VidDazzle LLC has SOLE DISCRETION to approve or deny
 *      advertising and may remove an advertiser at any time, without notice.
 *
 * Acceptance is recorded on the partner record (version + timestamp) at apply
 * time. Bump ADVERTISER_AGREEMENT_VERSION whenever the terms change.
 */

export const ADVERTISER_AGREEMENT_VERSION = "2026-07-14";
export const ADVERTISER_AGREEMENT_TITLE = "Advertiser Agreement, Background-Check Consent & Discretion Acknowledgment";

export interface AdvertiserAck {
  id: string;
  label: string;
}

/** Every box must be checked to submit an advertising application. */
export const ADVERTISER_ACKS: AdvertiserAck[] = [
  {
    id: "background_check",
    label:
      "I authorize VidDazzle LLC (or a third-party vendor acting on its behalf) to conduct a professional business background check on me, my firm or company, and its principals, and I consent to that review as a condition of advertising.",
  },
  {
    id: "sole_discretion_approval",
    label:
      "I understand that VidDazzle LLC has sole and absolute discretion to approve or deny my advertising and may decline it for any reason or no reason.",
  },
  {
    id: "removal_any_time",
    label:
      "I understand that VidDazzle LLC may suspend or remove my advertising from any of its sites at any time, at its sole discretion, without prior notice.",
  },
  {
    id: "accuracy_good_standing",
    label:
      "All information I provide is truthful and accurate. If I am an attorney, I am licensed and in good standing in every jurisdiction where I advertise, and I will comply with the applicable rules of professional conduct and attorney-advertising rules.",
  },
  {
    id: "flat_fee_terms",
    label:
      "I agree to the Advertiser Agreement and to the flat-fee advertising model (setup, monthly, and flat per-lead fees) — never a share of legal fees or a referral fee.",
  },
];

export const ADVERTISER_ACK_IDS = ADVERTISER_ACKS.map((a) => a.id);

/** True only if every required acknowledgment id is present. */
export function allAdvertiserAcksAccepted(ids: unknown): boolean {
  if (!Array.isArray(ids)) return false;
  const set = new Set(ids.map(String));
  return ADVERTISER_ACK_IDS.every((id) => set.has(id));
}

/** Full readable agreement (for the /legal page and the apply form). */
export const ADVERTISER_AGREEMENT_PARAGRAPHS: string[] = [
  "Background check required. Before any attorney or company may advertise on a VidDazzle LLC website, the advertiser must agree to and pass a professional business background check. By applying, you authorize VidDazzle LLC, or a third-party vendor acting on its behalf, to review your professional and business background, including (as applicable) licensing and good-standing status, disciplinary history, business registration, and public records relevant to advertising on our platform.",
  "Sole discretion to approve or deny. VidDazzle LLC reserves the right, in its sole and absolute discretion, to decide whether to accept advertising from any applicant. We may deny advertising for any reason or for no reason.",
  "Removal at any time. VidDazzle LLC may suspend, pause, or remove any advertiser or advertisement from any of its sites at any time, at its sole discretion, without prior notice. Except where a refund is required by law, fees for advertising already delivered are non-refundable; any prepaid, unearned advertising fees for a period after removal will be refunded on a prorated basis.",
  "Advertiser responsibilities. You represent that all information you provide is truthful and accurate. If you are an attorney, you represent that you are licensed and in good standing in every jurisdiction where you advertise and that you will comply with the applicable rules of professional conduct and attorney-advertising rules. You must keep your information current and notify us of any change in your licensing or good-standing status.",
  "Flat-fee advertising only. Advertising is billed with flat fees only — a one-time setup fee, a flat monthly fee, and a flat fee per verified lead. VidDazzle LLC never takes a share of an attorney's legal fees and never pays or charges a referral fee for a specific client, consistent with ABA Model Rules 5.4 and 7.2.",
  "No endorsement. Attorney and company listings are paid advertisements. VidDazzle LLC does not recommend or endorse any advertiser, and a listing is not a referral or a guarantee of any advertiser's qualifications.",
  "By checking the boxes and submitting your application, you agree to this Advertiser Agreement, consent to the background check, and acknowledge VidDazzle LLC's sole discretion to approve, deny, or remove advertising as described above.",
];

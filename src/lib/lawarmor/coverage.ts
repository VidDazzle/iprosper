/**
 * Law & Armor — Coverage Checker.
 *
 * A consumer asks "is my leaking roof / defective part / damaged vehicle / this
 * treatment covered?", tells us what happened, and pastes (or uploads) their
 * policy, warranty, or service agreement. A specialist scans the document's
 * language and returns a PROBABILITY that the loss may be covered — low, medium,
 * or high — with the specific language behind it, and asks follow-up questions
 * when key facts (why / when / where / how) are missing.
 *
 * HARD RULE: we NEVER tell a consumer they are covered. We report a probability
 * band based only on the words in their document and what they told us, and we
 * always tell them not to act on it and to get a professional second opinion or
 * an attorney. The classification is deterministic (coverage/exclusion keyword
 * scan) so a real model+OCR analyzer can drop in behind the same shape.
 * Documents are never stored.
 */

export type CoverageDomain =
  | "homeowner"
  | "renters"
  | "auto"
  | "medical"
  | "warranty"
  | "service"
  | "unknown";

export type ProbabilityBand = "high" | "medium" | "low" | "insufficient";

export interface CoverageResult {
  domain: CoverageDomain;
  domainLabel: string;
  agent: string;
  band: ProbabilityBand;
  bandLabel: string;
  headline: string;
  supporting: string[];   // policy language that may support coverage
  concerns: string[];     // policy language that may limit or exclude coverage
  reasons: string[];      // plain-English reasoning
  followUps: string[];    // why/when/where/how questions when info is thin
  disclaimer: string;
}

interface DomainCfg {
  label: string;
  agent: string;
  covered: string[];
  excluded: string[];
  locations: string[];
  causePrompt: string;
  wherePrompt: string;
}

const HOMEOWNER: DomainCfg = {
  label: "Homeowner / property insurance",
  agent: "Bastion",
  covered: ["windstorm", "wind", "hail", "fire", "smoke", "lightning", "theft", "stolen", "burglary", "vandalism", "explosion", "falling object", "weight of ice", "weight of snow", "burst pipe", "frozen pipe", "sudden and accidental", "sudden", "accidental discharge", "accidental overflow", "riot", "aircraft", "freezing", "power surge"],
  excluded: ["flood", "surface water", "earthquake", "earth movement", "landslide", "sinkhole", "wear and tear", "wear", "deterioration", "gradual", "neglect", "lack of maintenance", "maintenance", "seepage", "constant seepage", "repeated leakage", "continuous leak", "mold", "fungus", "dry rot", "rot", "rust", "corrosion", "settling", "termite", "pest", "vermin", "infestation", "pre-existing", "ordinance or law", "intentional"],
  locations: ["roof", "ceiling", "attic", "wall", "floor", "basement", "crawl space", "kitchen", "bathroom", "bedroom", "garage", "foundation", "pipe", "plumbing", "window", "gutter", "siding", "deck"],
  causePrompt: "a storm, wind or hail, a burst or frozen pipe, a fire, theft — or gradual leaking / wear over time",
  wherePrompt: "which part of the home (roof, a ceiling, a specific room, plumbing, the foundation)",
};

const AUTO: DomainCfg = {
  label: "Auto insurance",
  agent: "Vantage",
  covered: ["collision", "comprehensive", "other than collision", "theft", "stolen", "vandalism", "glass", "windshield", "fire", "flood", "hail", "falling object", "animal", "hit a", "struck", "accident", "uninsured motorist", "underinsured motorist", "rental reimbursement", "towing"],
  excluded: ["wear and tear", "wear", "mechanical breakdown", "mechanical failure", "electrical breakdown", "normal wear", "racing", "commercial use", "ride-share", "rideshare", "delivery", "intentional", "road damage", "tires only", "manufacturer defect", "gradual", "freezing"],
  locations: ["windshield", "bumper", "hood", "door", "fender", "engine", "transmission", "tire", "roof", "quarter panel", "headlight", "mirror", "paint"],
  causePrompt: "a collision, someone hitting your car, theft, vandalism, hail or weather, hitting an animal — or a mechanical breakdown",
  wherePrompt: "which part of the vehicle was damaged",
};

const RENTERS: DomainCfg = {
  ...HOMEOWNER,
  label: "Renters insurance",
  covered: [...HOMEOWNER.covered, "personal property", "belongings", "loss of use", "liability"],
  causePrompt: "a fire, theft, vandalism, water from a burst pipe, or a storm — and whether it was your belongings or the building",
  wherePrompt: "what was damaged or lost (your belongings, and where they were)",
};

const MEDICAL: DomainCfg = {
  label: "Medical / health insurance",
  agent: "Claimant",
  covered: ["medically necessary", "covered service", "covered benefit", "in-network", "in network", "preventive", "emergency", "prior authorization approved", "covered procedure", "essential health benefit"],
  excluded: ["not medically necessary", "experimental", "investigational", "cosmetic", "elective", "out-of-network", "out of network", "excluded", "exclusion", "not covered", "non-covered", "prior authorization required", "pre-authorization required", "waiting period", "pre-existing"],
  locations: [],
  causePrompt: "the treatment or procedure, whether your doctor ordered it, and whether the provider is in-network",
  wherePrompt: "the provider and whether they are in-network, and whether prior authorization was obtained",
};

const WARRANTY: DomainCfg = {
  label: "Warranty",
  agent: "Codex",
  covered: ["defect", "defects in material", "materials", "workmanship", "manufacturer defect", "parts and labor", "covered component", "mechanical failure", "malfunction", "breakage", "fails to function", "fails to operate"],
  excluded: ["wear and tear", "wear", "misuse", "abuse", "neglect", "unauthorized repair", "modification", "cosmetic", "consumable", "battery", "batteries", "normal wear", "improper installation", "improper maintenance", "accidental damage", "acts of god", "commercial use", "pre-existing", "water damage", "rust", "corrosion", "cosmetic damage"],
  locations: ["part", "component", "motor", "compressor", "screen", "battery", "engine", "transmission", "board", "seal"],
  causePrompt: "a manufacturing defect, a failure during normal use, accidental damage, misuse, or lack of maintenance",
  wherePrompt: "which part or component failed",
};

const SERVICE: DomainCfg = { ...WARRANTY, label: "Service / extended-warranty agreement", agent: "Codex" };

const UNKNOWN: DomainCfg = {
  label: "Policy, warranty, or agreement",
  agent: "Aegis",
  covered: [...new Set([...HOMEOWNER.covered, ...AUTO.covered, ...WARRANTY.covered])],
  excluded: [...new Set([...HOMEOWNER.excluded, ...AUTO.excluded, ...WARRANTY.excluded])],
  locations: [],
  causePrompt: "what happened and what caused it",
  wherePrompt: "where or what exactly was affected",
};

const DOMAINS: Record<CoverageDomain, DomainCfg> = {
  homeowner: HOMEOWNER, renters: RENTERS, auto: AUTO, medical: MEDICAL, warranty: WARRANTY, service: SERVICE, unknown: UNKNOWN,
};

const BAND_LABELS: Record<ProbabilityBand, string> = {
  high: "High probability of coverage",
  medium: "Medium probability of coverage",
  low: "Low probability of coverage",
  insufficient: "Not enough information yet",
};

export const COVERAGE_DISCLAIMER =
  "This is an estimate of probability based only on the words in your document and what you told us — it is NOT a coverage decision and NOT legal or professional advice. We can never confirm that something is covered; only your insurer, warranty administrator, or a licensed professional can. Do not act on this information. Get a second opinion from a licensed professional, or an attorney to fight for your rights, before you rely on it, file, or give up a claim.";

const TIME_RE = /\b(19|20)\d\d\b|yesterday|today|tonight|last (week|month|year|night|winter|summer|spring|fall)|days? ago|weeks? ago|months? ago|years? ago|recently|this (morning|week|month|year)|on \w+day|january|february|march|april|may|june|july|august|september|october|november|december/i;
const CAUSE_RE = /caused|because|due to|from the|after the|when the|during|storm|hit|struck|broke|broken|leak|burst|fell|crash|accident|defect|malfunction|fail/i;

function sentences(text: string): string[] {
  return text.split(/(?<=[.;:\n])\s+/).map((s) => s.trim()).filter((s) => s.length > 8);
}

function snippetsFor(policyText: string, terms: string[], limit = 3): string[] {
  if (!policyText) return [];
  const lower = policyText.toLowerCase();
  const hitTerms = terms.filter((t) => lower.includes(t));
  if (!hitTerms.length) return [];
  const out: string[] = [];
  for (const s of sentences(policyText)) {
    const sl = s.toLowerCase();
    if (hitTerms.some((t) => sl.includes(t))) {
      out.push(s.length > 220 ? s.slice(0, 217) + "…" : s);
      if (out.length >= limit) break;
    }
  }
  return out;
}

export function analyzeCoverage(input: {
  domain?: string;
  question: string;
  policyText?: string;
}): CoverageResult {
  const domain = (input.domain && input.domain in DOMAINS ? input.domain : "unknown") as CoverageDomain;
  const cfg = DOMAINS[domain];
  const q = (input.question || "").toLowerCase();
  const policyText = (input.policyText || "").trim();
  const p = policyText.toLowerCase();

  const causeCovered = cfg.covered.filter((t) => q.includes(t));
  const causeExcluded = cfg.excluded.filter((t) => q.includes(t));
  const policyCovered = p ? cfg.covered.filter((t) => p.includes(t)) : [];
  const policyExcluded = p ? cfg.excluded.filter((t) => p.includes(t)) : [];
  const matchedCoverage = policyCovered.filter((t) => q.includes(t)); // policy language that matches the claim
  const matchedExclusion = policyExcluded.filter((t) => q.includes(t)); // exclusion that matches the claim

  // Information completeness (why / when / where)
  const hasCause = causeCovered.length > 0 || causeExcluded.length > 0 || CAUSE_RE.test(q);
  const hasWhen = TIME_RE.test(q);
  const hasWhere = cfg.locations.length === 0 ? true : cfg.locations.some((t) => q.includes(t));
  const infoScore = (hasCause ? 1 : 0) + (hasWhen ? 1 : 0) + (hasWhere ? 1 : 0);

  // Score
  let score = 0;
  if (causeCovered.length) score += 2;
  if (matchedCoverage.length) score += 2;
  else if (policyCovered.length) score += 1;
  if (causeExcluded.length) score -= 3;
  if (matchedExclusion.length) score -= 3;

  // Band — conservative. "High" requires the document's own language to support
  // the specific claim, with no matching exclusion and enough facts.
  let band: ProbabilityBand;
  if (!policyText && infoScore <= 1 && !causeCovered.length && !causeExcluded.length) {
    band = "insufficient";
  } else if (score <= 0) {
    band = "low";
  } else if (score >= 3 && !!policyText && matchedCoverage.length > 0 && matchedExclusion.length === 0 && infoScore >= 2) {
    band = "high";
  } else {
    band = "medium";
  }

  // Follow-up questions (why / when / where / how) when facts are thin
  const followUps: string[] = [];
  if (!policyText) followUps.push("Paste (or upload) the relevant section of your policy, warranty, or service agreement so we can point to the exact language.");
  if (!hasCause) followUps.push(`Why did it happen — what caused it? For example: ${cfg.causePrompt}.`);
  if (!hasWhen) followUps.push("When did the damage, loss, or failure happen? Coverage often turns on the date and on whether it was sudden or gradual.");
  if (!hasWhere && cfg.locations.length) followUps.push(`Where exactly — ${cfg.wherePrompt}?`);
  if (domain === "homeowner" || domain === "renters" || domain === "auto" || domain === "warranty" || domain === "service") {
    if (!/sudden|accident|storm|hit|struck|collision|burst/i.test(q) && !causeExcluded.length) {
      followUps.push("Was it sudden and accidental, or did it develop gradually over time? This is often the deciding factor.");
    }
  }

  // Reasons
  const reasons: string[] = [];
  if (matchedCoverage.length) reasons.push(`Your document contains coverage language that matches what you described (e.g. “${matchedCoverage[0]}”).`);
  else if (policyCovered.length) reasons.push("Your document contains relevant coverage language, though it doesn't clearly name your exact situation.");
  else if (policyText) reasons.push("We didn't find clear coverage language for your exact situation in the text you provided.");
  if (causeCovered.length) reasons.push(`What you described (“${causeCovered[0]}”) is the kind of cause these policies often cover.`);
  if (matchedExclusion.length || causeExcluded.length) reasons.push(`There is exclusion language that may apply to your situation (e.g. “${(matchedExclusion[0] || causeExcluded[0])}”), which can reduce or defeat coverage.`);
  if (infoScore < 2) reasons.push("Some key facts are missing, so this estimate is held down until you answer the follow-up questions below.");
  if (!reasons.length) reasons.push("There isn't enough in your document and description yet to point to specific coverage or exclusion language.");

  const headline =
    band === "insufficient"
      ? "We need a little more before we can estimate a probability."
      : band === "high"
        ? `Based on this ${cfg.label.toLowerCase()}, there is a HIGH probability your situation may be covered — but this is not a yes.`
        : band === "medium"
          ? `Based on this ${cfg.label.toLowerCase()}, there is a MEDIUM probability your situation may be covered.`
          : `Based on this ${cfg.label.toLowerCase()}, the probability your situation is covered appears LOW.`;

  return {
    domain,
    domainLabel: cfg.label,
    agent: cfg.agent,
    band,
    bandLabel: BAND_LABELS[band],
    headline,
    supporting: snippetsFor(policyText, matchedCoverage.length ? matchedCoverage : policyCovered),
    concerns: snippetsFor(policyText, matchedExclusion.length ? matchedExclusion : policyExcluded),
    reasons,
    followUps,
    disclaimer: COVERAGE_DISCLAIMER,
  };
}

export const COVERAGE_DOMAINS: { value: CoverageDomain; label: string }[] = [
  { value: "homeowner", label: "Homeowner / property insurance" },
  { value: "auto", label: "Auto insurance" },
  { value: "renters", label: "Renters insurance" },
  { value: "medical", label: "Medical / health insurance" },
  { value: "warranty", label: "Warranty" },
  { value: "service", label: "Service / extended-warranty agreement" },
  { value: "unknown", label: "Not sure / something else" },
];

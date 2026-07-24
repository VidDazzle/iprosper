// Per-network ToS ruleset (spec Section 3: "Platform ToS ruleset per
// network"). This is a starter set of hard blockers, not an exhaustive
// legal ruleset — each network's actual ToS changes frequently and needs
// real review before this is trusted as complete. Extend `RULES` as
// networks are actually integrated.

export interface ToSRule {
  network: string;
  bannedPhrases: string[];
  requiresDisclosureTag?: boolean;
}

const RULES: Record<string, ToSRule> = {
  tiktok: {
    network: "tiktok",
    bannedPhrases: ["guaranteed results", "get rich quick", "miracle cure"],
    requiresDisclosureTag: true,
  },
  instagram: {
    network: "instagram",
    bannedPhrases: ["guaranteed results", "get rich quick"],
    requiresDisclosureTag: true,
  },
  facebook: {
    network: "facebook",
    bannedPhrases: ["guaranteed results", "get rich quick", "before and after"],
    requiresDisclosureTag: true,
  },
};

export interface ToSCheckResult {
  passed: boolean;
  network: string;
  violations: string[];
}

export function checkPlatformToS(network: string, content: string): ToSCheckResult {
  const rule = RULES[network.toLowerCase()];
  if (!rule) {
    return {
      passed: false,
      network,
      violations: [`No ToS ruleset registered for network "${network}" — cannot verify, blocking by default.`],
    };
  }

  const lower = content.toLowerCase();
  const violations = rule.bannedPhrases.filter((phrase) => lower.includes(phrase));

  return { passed: violations.length === 0, network, violations };
}

export function registeredNetworks(): string[] {
  return Object.keys(RULES);
}

/**
 * Medical bill AUDIT & REPORTING engine.
 *
 * Takes the line items from an itemized hospital/provider bill and flags the
 * error patterns that most commonly inflate medical bills, estimates how much is
 * worth questioning, and generates a dispute-ready summary the patient can send
 * to the billing office.
 *
 * Guardrails: this is educational consumer information, NOT legal or medical
 * advice and NOT an accusation of fraud. Flags are items to VERIFY and question,
 * and dollar figures are ESTIMATES for discussion — the provider may be able to
 * substantiate a charge. Nothing here is stored; the audit runs on the numbers
 * the user enters and is discarded with the response.
 */

import { ADVOCATE_STANCE } from "@/lib/advocacy";

export interface BillLine {
  code?: string;        // CPT / HCPCS / revenue code (optional)
  description: string;
  units: number;        // quantity billed (default 1)
  charge: number;       // total charge for the line (as billed)
}

export interface BillContext {
  emergency?: boolean;      // care was emergency
  outOfNetwork?: boolean;   // provider was out-of-network at an in-network facility, etc.
  uninsured?: boolean;      // patient is uninsured / self-pay
  eobPatientResponsibility?: number; // what the insurer's EOB says the patient owes
}

export type FlagSeverity = "high" | "medium" | "info";

export interface AuditFlag {
  id: string;
  severity: FlagSeverity;
  title: string;
  detail: string;
  lines: string[];       // human-readable references to the affected line(s)
  amount?: number;       // estimated dollars associated with the flag, if quantifiable
}

export interface AuditReport {
  lineCount: number;
  totalCharged: number;
  flags: AuditFlag[];
  estimatedSavings: { low: number; high: number };
  amountToQuestion: number; // total charges touched by any flag
  rights: string[];
  nextSteps: string[];
  disputeSummary: string;   // ready-to-send plain-English request to the billing office
  disclaimer: string;
}

// ---- heuristics -------------------------------------------------------------

const ONCE_PER_STAY = /(room|board|admission|admit|facility fee|er visit|emergency (room|dept)|observation|recovery room|operating room base)/i;
const VAGUE = /(misc|miscellaneous|other charges?|supplies|supply|pharmacy general|central supply|sundry|kit\b|tray\b|administrative|admin fee|handling)/i;
const HIGH_LEVEL_EM = /(99205|99215|99284|99285|99291|level 5|level v|high complexity|critical care)/i;
const PANEL = /(metabolic panel|\bbmp\b|\bcmp\b|\bcbc\b|lipid panel|comprehensive panel|basic panel|hepatic panel|electrolyte panel)/i;
const PANEL_COMPONENT = /(glucose|potassium|sodium|chloride|calcium|creatinine|\bbun\b|albumin|bilirubin|\balt\b|\bast\b|hemoglobin|hematocrit|platelet|cholesterol|triglyceride|\bhdl\b|\bldl\b)/i;

const money = (n: number) => Math.round(n);
const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

function ref(line: BillLine): string {
  const code = line.code ? `${line.code} ` : "";
  return `${code}${line.description.trim()}${line.units > 1 ? ` ×${line.units}` : ""}`;
}

// ---- engine -----------------------------------------------------------------

export function auditBill(linesInput: BillLine[], context: BillContext = {}): AuditReport {
  const lines = linesInput
    .filter((l) => l && l.description && l.description.trim())
    .map((l) => ({ code: l.code?.trim() || undefined, description: l.description, units: Math.max(1, Number(l.units) || 1), charge: Math.max(0, Number(l.charge) || 0) }));

  const totalCharged = lines.reduce((s, l) => s + l.charge, 0);
  const flags: AuditFlag[] = [];
  const touched = new Set<number>(); // indices touched by any flag
  let id = 0;
  const nextId = () => `f${++id}`;

  // 1) Duplicate charges — same code (or description) + same charge, appearing >1x
  const groups = new Map<string, number[]>();
  lines.forEach((l, i) => {
    const key = (l.code ? `c:${norm(l.code)}` : `d:${norm(l.description)}`) + `|$${l.charge}`;
    groups.set(key, [...(groups.get(key) ?? []), i]);
  });
  for (const idxs of groups.values()) {
    if (idxs.length > 1) {
      const dupCharge = lines[idxs[0]].charge * (idxs.length - 1);
      idxs.forEach((i) => touched.add(i));
      flags.push({
        id: nextId(),
        severity: "high",
        title: `Possible duplicate charge (${idxs.length}×)`,
        detail: `"${lines[idxs[0]].description.trim()}" appears ${idxs.length} times at the same amount. Duplicate billing is one of the most common errors — ask the provider to confirm each instance was a separate, actual service.`,
        lines: idxs.map((i) => ref(lines[i])),
        amount: money(dupCharge),
      });
    }
  }

  // 2) Quantity anomaly on once-per-stay items
  lines.forEach((l, i) => {
    if (l.units > 1 && ONCE_PER_STAY.test(l.description)) {
      const excess = (l.charge / l.units) * (l.units - 1);
      touched.add(i);
      flags.push({
        id: nextId(),
        severity: "high",
        title: `Quantity looks high (×${l.units})`,
        detail: `"${l.description.trim()}" is usually billed once per visit or stay but shows ${l.units} units. Ask the provider to justify the quantity or correct it.`,
        lines: [ref(l)],
        amount: money(excess),
      });
    }
  });

  // 3) Unbundling — a lab panel plus its individual components billed separately
  const hasPanel = lines.some((l) => PANEL.test(l.description));
  const componentIdx = lines.map((l, i) => (PANEL_COMPONENT.test(l.description) ? i : -1)).filter((i) => i >= 0);
  if (hasPanel && componentIdx.length >= 2) {
    componentIdx.forEach((i) => touched.add(i));
    const compCharge = componentIdx.reduce((s, i) => s + lines[i].charge, 0);
    flags.push({
      id: nextId(),
      severity: "medium",
      title: "Possible unbundling of a lab panel",
      detail: "A lab panel appears alongside individual component tests billed separately. When a panel already includes those tests, billing them on their own ('unbundling') inflates the total. Ask whether these should be a single panel charge.",
      lines: componentIdx.map((i) => ref(lines[i])),
      amount: money(compCharge),
    });
  }

  // 4) Upcoding hint on high-level E/M or critical-care codes
  lines.forEach((l, i) => {
    if (HIGH_LEVEL_EM.test(`${l.code ?? ""} ${l.description}`)) {
      touched.add(i);
      flags.push({
        id: nextId(),
        severity: "medium",
        title: "High-level visit code — verify it matches your care",
        detail: `"${l.description.trim()}" is a top-tier visit/complexity code. These are sometimes 'upcoded' above the care actually delivered. Ask the provider to confirm the documentation supports this level.`,
        lines: [ref(l)],
        amount: money(l.charge),
      });
    }
  });

  // 5) Vague / generic high-dollar charges
  lines.forEach((l, i) => {
    if (VAGUE.test(l.description) && l.charge >= 100) {
      touched.add(i);
      flags.push({
        id: nextId(),
        severity: "medium",
        title: "Vague charge — request itemization",
        detail: `"${l.description.trim()}" is a non-specific charge of ${usd(l.charge)}. You have the right to know exactly what it covers — ask for an itemized breakdown or removal if it can't be substantiated.`,
        lines: [ref(l)],
        amount: money(l.charge),
      });
    }
  });

  // 6) Balance / surprise billing context
  if (context.emergency || context.outOfNetwork) {
    flags.push({
      id: nextId(),
      severity: "high",
      title: "No Surprises Act may protect this bill",
      detail: `Because this involved ${context.emergency ? "emergency care" : "an out-of-network provider"}, the federal No Surprises Act likely limits you to in-network cost-sharing and bars most balance billing. If you're being billed the out-of-network difference, that may be improper — cite the No Surprises Act when you dispute it.`,
      lines: ["Whole bill"],
    });
  }

  // 7) Bill exceeds the insurer's stated patient responsibility
  if (typeof context.eobPatientResponsibility === "number" && context.eobPatientResponsibility >= 0) {
    const gap = totalCharged - context.eobPatientResponsibility;
    if (gap > 1) {
      flags.push({
        id: nextId(),
        severity: "high",
        title: "Bill is higher than your EOB says you owe",
        detail: `This bill totals ${usd(totalCharged)}, but your insurer's EOB puts your patient responsibility at ${usd(context.eobPatientResponsibility)} — a gap of ${usd(gap)}. An in-network provider generally can't bill you above the allowed amount. Ask them to reconcile to your EOB.`,
        lines: ["Whole bill"],
        amount: money(gap),
      });
    }
  }

  // ---- estimate savings -----------------------------------------------------
  // Whole-bill flags (the EOB gap, No Surprises Act) are shown on their own and
  // kept OUT of the aggregate savings number: the gap already encompasses the
  // line-item errors, so summing them would double-count and could exceed the
  // bill. The estimate is built only from line-item overcharges and capped at
  // the total charged.
  const WHOLE_BILL = ["Bill is higher than your EOB says you owe", "No Surprises Act may protect this bill"];
  const lineFlags = flags.filter((f) => f.amount && !WHOLE_BILL.some((p) => f.title.startsWith(p)));
  const CONCRETE = ["Possible duplicate charge", "Quantity looks high"]; // measurable overcharges
  const low = Math.min(totalCharged, lineFlags.filter((f) => CONCRETE.some((p) => f.title.startsWith(p))).reduce((s, f) => s + (f.amount ?? 0), 0));
  const high = Math.min(totalCharged, lineFlags.reduce((s, f) => s + (f.amount ?? 0), 0));
  const amountToQuestion = [...touched].reduce((s, i) => s + lines[i].charge, 0);

  // order flags by severity
  const rank: Record<FlagSeverity, number> = { high: 0, medium: 1, info: 2 };
  flags.sort((a, b) => rank[a.severity] - rank[b.severity]);

  return {
    lineCount: lines.length,
    totalCharged: money(totalCharged),
    flags,
    estimatedSavings: { low: money(low), high: money(high) },
    amountToQuestion: money(amountToQuestion),
    rights: [
      "You have the right to a fully itemized bill and a written explanation of any charge.",
      "You can dispute specific line items and ask the provider to correct or substantiate them before paying.",
      "If you're uninsured or self-pay, you're generally entitled to a Good Faith Estimate; nonprofit hospitals must offer financial assistance (501(r)).",
      "The No Surprises Act limits most surprise and balance bills from out-of-network emergency care and out-of-network providers at in-network facilities.",
    ],
    nextSteps: [
      "Send the billing office the dispute summary below and ask them to correct or substantiate each flagged line in writing.",
      "Ask them to reconcile the balance to your insurer's EOB before you pay anything.",
      "On the corrected balance, request financial assistance, a self-pay/prompt-pay discount, or an interest-free payment plan.",
      "Keep every letter and note every call — a written trail protects you if it goes to collections.",
    ],
    disputeSummary: buildDisputeSummary(flags, totalCharged),
    disclaimer:
      "This audit is analysis — not an accusation of fraud. Flagged items are things that may be worth questioning, and the figures are estimates for discussion (the provider may be able to substantiate a charge). " +
      ADVOCATE_STANCE +
      " Your bill data was analyzed and discarded — nothing was stored.",
  };
}

function buildDisputeSummary(flags: AuditFlag[], total: number): string {
  const lead =
    `To the billing department:\n\n` +
    `I am reviewing my itemized bill (total charged ${usd(total)}) and requesting an itemized explanation and correction of the following item(s) before I make payment. Please respond in writing.\n`;
  if (!flags.length) {
    return (
      lead +
      `\nI did not identify obvious errors, but I am requesting a fully itemized statement with codes and quantities, and information on any financial-assistance or self-pay discount for which I may qualify.\n\n` +
      `Please treat this as a formal request under my right to an itemized bill. Thank you.`
    );
  }
  const items = flags
    .filter((f) => f.severity !== "info")
    .map((f, i) => `${i + 1}. ${f.title}${f.amount ? ` (~${usd(f.amount)})` : ""}: ${f.lines.join("; ")}. ${reasonLine(f)}`)
    .join("\n");
  return (
    lead +
    `\n${items}\n\n` +
    `Please substantiate or correct each item above, reconcile the balance to my insurer's Explanation of Benefits, and send me a corrected itemized statement. Please also send information on financial assistance or a self-pay discount for which I may qualify. I am disputing these charges in good faith and request that collection activity be paused while this is reviewed. Thank you.`
  );
}

function reasonLine(f: AuditFlag): string {
  if (f.title.startsWith("Possible duplicate")) return "Please confirm each instance was a separate service or remove the duplicate.";
  if (f.title.startsWith("Quantity")) return "Please justify the quantity billed or correct it.";
  if (f.title.startsWith("Possible unbundling")) return "Please confirm these were not already included in a billed panel.";
  if (f.title.startsWith("High-level")) return "Please confirm the documentation supports this visit level.";
  if (f.title.startsWith("Vague")) return "Please provide an itemized breakdown of what this covers.";
  if (f.title.startsWith("No Surprises")) return "Please apply in-network cost-sharing as required by the No Surprises Act.";
  if (f.title.startsWith("Bill is higher")) return "Please reconcile this balance to my EOB's patient-responsibility amount.";
  return "Please explain and substantiate this charge.";
}

export function usd(n: number): string {
  return "$" + Math.round(n).toLocaleString("en-US");
}

import type { Metadata } from "next";
import LegalShell from "@/components/solvana/legal-shell";
import { TSR_REQUIRED_DISCLOSURES, DEDICATED_ACCOUNT_REQUIREMENTS } from "@/lib/agents/compliance";
import { PROGRAM } from "@/lib/solvana/brand";

export const metadata: Metadata = {
  title: "Program Disclosures | Solvana",
  description: "Full federal and state-required disclosures for the Solvana debt settlement program.",
};

export default function DisclosuresPage() {
  return (
    <LegalShell title="Program Disclosures" updated="July 2026">
      <section>
        <h2>What Solvana does — and does not — do</h2>
        <p>
          Solvana Technologies, Inc. (&ldquo;Solvana&rdquo;) provides debt settlement services:
          we negotiate with your creditors to accept a one-time lump-sum payment that is less
          than your full balance, in exchange for forgiving the remainder. Solvana{" "}
          <strong>does not</strong> lend money, make monthly payments to your creditors, pay
          your debts directly, provide credit repair, or provide legal, tax, or bankruptcy
          advice. Solvana is not a law firm and is not a nonprofit credit counseling agency.
        </p>
      </section>

      <section>
        <h2>Disclosures required by the FTC Telemarketing Sales Rule</h2>
        <p>
          Before you enroll, our intake agent delivers each of the following on a recorded line
          and confirms you understand it (16 C.F.R. § 310.3(a)(1) and § 310.4(a)(5)):
        </p>
        <ul className="space-y-2 pt-2">
          {TSR_REQUIRED_DISCLOSURES.map((d) => (
            <li key={d}>{d}</li>
          ))}
        </ul>
      </section>

      <section>
        <h2>The advance-fee ban</h2>
        <p>
          Federal law prohibits us from charging or collecting any fee for a debt until: (1) we
          have negotiated a settlement of that debt and the creditor has executed a written
          agreement; (2) you have approved the settlement terms; and (3) you have made at least
          one payment to the creditor under that agreement. Our disbursement system evaluates
          these three conditions in software before any fee transaction can execute. Our fee is{" "}
          {PROGRAM.feePctLow}%–{PROGRAM.feePctHigh}% of the enrolled balance of each settled
          debt, disclosed in your enrollment agreement before you sign.
        </p>
      </section>

      <section>
        <h2>Your dedicated account</h2>
        <p>Program savings are held in a dedicated account that meets every federal requirement:</p>
        <ul className="space-y-2 pt-2">
          {DEDICATED_ACCOUNT_REQUIREMENTS.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
        <p className="pt-2">
          If you withdraw from the program, all funds in the account other than fees properly
          earned on already-settled debts are returned to you within seven (7) business days.
        </p>
      </section>

      <section>
        <h2>Material risks</h2>
        <ul className="space-y-2">
          <li>
            <strong>Credit damage.</strong> The program requires you to stop paying enrolled
            creditors. Late and missed payments are reported to credit bureaus and will likely
            significantly reduce your credit score.
          </li>
          <li>
            <strong>Growing balances.</strong> Creditors may continue to add interest, late
            fees, and penalties to enrolled accounts while we negotiate, so a balance may grow
            before it settles.
          </li>
          <li>
            <strong>Collection activity and lawsuits.</strong> Creditors may continue collection
            calls and letters and may sue you. No settlement company can prevent a creditor from
            filing suit. Never ignore a summons; if you are sued, we refer you to an independent
            licensed attorney.
          </li>
          <li>
            <strong>No guarantee.</strong> Creditors are not legally obligated to negotiate or
            accept any settlement. Some creditors refuse to work with settlement companies.
          </li>
          <li>
            <strong>Tax consequences.</strong> Forgiven debt of $600 or more may be reported to
            the IRS on Form 1099-C and may be taxable income. Consult a tax professional.
          </li>
          <li>
            <strong>Completion risk.</strong> Not all clients complete the program. Estimated
            savings figures reflect enrolled debts that settle, not program-wide guarantees.
          </li>
        </ul>
      </section>

      <section>
        <h2>Eligibility</h2>
        <p>
          Enrollment requires at least ${PROGRAM.minDebt.toLocaleString()} in qualifying
          unsecured debt (credit cards, medical bills, personal loans, store cards, collections,
          unsecured business debt). We cannot enroll secured debts (mortgages, auto loans),
          federal student loans, tax obligations, domestic support obligations, or debts in
          active bankruptcy. Programs typically take {PROGRAM.termLowMonths} to{" "}
          {PROGRAM.termHighMonths} months.
        </p>
      </section>

      <section>
        <h2>AI-delivered services</h2>
        <p>
          Solvana&apos;s services are delivered by artificial-intelligence agents, including
          voice agents that identify themselves as AI at the start of every call. Calls are
          recorded with consent as required by applicable state law. You may request a human
          supervisor at any time during any call, and matters requiring legal judgment are
          always escalated to licensed counsel. A complete audit log of agent actions on your
          account is available to you on request.
        </p>
      </section>

      <section>
        <h2>State-specific rights</h2>
        <p>
          Your state may grant additional rights, including cancellation windows, fee caps, or
          bond claims. See our <a href="/legal/licensing" className="text-cyan-300 underline">state licensing page</a>{" "}
          for the disclosures applicable in your state. Services are not available in every state.
        </p>
      </section>
    </LegalShell>
  );
}

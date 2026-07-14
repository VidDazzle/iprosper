import type { Metadata } from "next";
import LegalShell from "@/components/solvana/legal-shell";
import { PROGRAM } from "@/lib/solvana/brand";

export const metadata: Metadata = {
  title: "Terms of Service | X Debt",
  description: "Terms governing use of the X Debt website and debt settlement services.",
};

export default function TermsPage() {
  return (
    <LegalShell title="Terms of Service" updated="July 2026">
      <section>
        <h2>1. Agreement</h2>
        <p>
          These Terms govern your use of the X Debt website and client portal. Debt settlement
          services themselves are governed by a separate written Debt Settlement Services
          Agreement (&ldquo;Enrollment Agreement&rdquo;) that you sign electronically after
          receiving all required disclosures. If these Terms conflict with your Enrollment
          Agreement, the Enrollment Agreement controls.
        </p>
      </section>
      <section>
        <h2>2. The service</h2>
        <p>
          X Debt negotiates settlements of qualifying unsecured debts on behalf of enrolled
          clients under a limited power of attorney you grant at enrollment. X Debt does not
          pay debts on your behalf, does not extend credit, and does not guarantee any
          settlement outcome, savings amount, or timeline. Typical programs run{" "}
          {PROGRAM.termLowMonths}–{PROGRAM.termHighMonths} months and fees are{" "}
          {PROGRAM.feePctLow}%–{PROGRAM.feePctHigh}% of enrolled debt, charged only as permitted
          by 16 C.F.R. § 310.4(a)(5).
        </p>
      </section>
      <section>
        <h2>3. AI services and recordings</h2>
        <p>
          Services are provided by AI agents, including voice agents. By providing your phone
          number and consenting during enrollment, you authorize X Debt&apos;s AI agents to
          contact you by phone, SMS, and email regarding your program. Consent to marketing
          contact is not a condition of enrollment, and you may revoke communication consent at
          any time (reply STOP, or tell any agent). Calls are recorded where permitted and with
          consent where required. You may request a human supervisor on any call.
        </p>
      </section>
      <section>
        <h2>4. Your obligations</h2>
        <ul className="space-y-2">
          <li>Provide accurate, complete information about your debts and finances.</li>
          <li>Fund your dedicated account per your agreed deposit schedule.</li>
          <li>Forward creditor communications, including any legal notices, promptly.</li>
          <li>Review and approve or reject settlement offers within the stated window.</li>
          <li>Understand that you remain legally responsible for your debts until settled.</li>
        </ul>
      </section>
      <section>
        <h2>5. Cancellation</h2>
        <p>
          You may cancel at any time without penalty. Upon cancellation, funds in your dedicated
          account are returned to you (less fees properly earned on debts already settled with
          your approval). State law may provide specific cancellation windows with additional
          rights.
        </p>
      </section>
      <section>
        <h2>6. No legal, tax, or credit repair advice</h2>
        <p>
          X Debt is not a law firm, accounting firm, or credit repair organization. Content on
          this site is educational, not advice. For legal matters we refer you to independent
          licensed attorneys; engagement is between you and that attorney.
        </p>
      </section>
      <section>
        <h2>7. Disclaimers and liability</h2>
        <p>
          The website is provided &ldquo;as is.&rdquo; To the maximum extent permitted by law,
          X Debt disclaims implied warranties and is not liable for indirect, incidental, or
          consequential damages arising from website use. Nothing in these Terms limits rights
          you hold under the Telemarketing Sales Rule, state debt settlement statutes, or other
          consumer protection laws that cannot be waived.
        </p>
      </section>
      <section>
        <h2>8. Disputes</h2>
        <p>
          Your Enrollment Agreement contains the dispute resolution terms for services,
          including any arbitration provisions and applicable opt-out rights, as permitted by
          the law of your state.
        </p>
      </section>
      <section>
        <h2>9. Contact</h2>
        <p>
          VidDazzle LLC · legal@xdebt.ai · 1-888-XDEBT-24.
        </p>
      </section>
    </LegalShell>
  );
}

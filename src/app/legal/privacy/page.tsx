import type { Metadata } from "next";
import LegalShell from "@/components/solvana/legal-shell";

export const metadata: Metadata = {
  title: "Privacy Policy | Solvana",
  description: "How Solvana collects, uses, and protects your financial information under GLBA and state privacy law.",
};

export default function PrivacyPage() {
  return (
    <LegalShell title="Privacy Policy" updated="July 2026">
      <section>
        <h2>Scope</h2>
        <p>
          As a financial services provider, Solvana handles nonpublic personal information under
          the Gramm-Leach-Bliley Act (GLBA), its Safeguards Rule, and applicable state privacy
          laws (including the CCPA/CPRA for California residents). This policy covers the
          website, client portal, and services delivered by our AI agents.
        </p>
      </section>
      <section>
        <h2>What we collect</h2>
        <ul className="space-y-2">
          <li>Identity and contact details you provide (name, address, phone, email).</li>
          <li>Financial information: debts, creditors, balances, income, budget, and — with your consent — credit report data via soft pull (which does not affect your score).</li>
          <li>Call recordings and transcripts of interactions with our voice agents, recorded with consent as your state requires.</li>
          <li>Dedicated-account transaction data from our independent account provider.</li>
          <li>Standard website telemetry (device, pages, approximate location).</li>
        </ul>
      </section>
      <section>
        <h2>How we use it</h2>
        <p>
          To assess eligibility, negotiate with your creditors under your limited power of
          attorney, manage your program, meet legal and audit obligations, and improve service
          quality. Call recordings train and evaluate our agents&apos; compliance — every
          client-facing action is screened against our compliance rulebook and logged.
        </p>
      </section>
      <section>
        <h2>What we never do</h2>
        <ul className="space-y-2">
          <li>We do not sell your personal information.</li>
          <li>We do not share your information with third parties for their marketing.</li>
          <li>Our AI agents access only the minimum data their specific role requires (role-based access is enforced per agent, per tool).</li>
        </ul>
      </section>
      <section>
        <h2>Who we share with</h2>
        <p>
          Only as needed to serve you: your creditors (to negotiate), the independent
          FDIC-insured account provider, credit bureaus (soft inquiries), referred attorneys
          (with your consent), our regulators and auditors, and service providers bound by
          confidentiality. All sharing falls within GLBA permitted purposes.
        </p>
      </section>
      <section>
        <h2>Security</h2>
        <p>
          Data is encrypted in transit (TLS 1.3) and at rest (AES-256). Agent actions are
          logged immutably. We maintain a written information security program under the FTC
          Safeguards Rule, with annual penetration testing and incident response procedures.
          No system is perfectly secure; we will notify you of any breach as required by law.
        </p>
      </section>
      <section>
        <h2>Your rights</h2>
        <ul className="space-y-2">
          <li>Access, correct, or delete your data (subject to legal retention duties).</li>
          <li>Opt out of any non-essential communications instantly (&ldquo;STOP&rdquo; works with every agent).</li>
          <li>Request the audit log of AI agent actions on your account.</li>
          <li>California, Colorado, Virginia and other state residents: exercise applicable state privacy rights via privacy@solvana.ai — we do not discriminate for exercising them.</li>
        </ul>
      </section>
      <section>
        <h2>Retention & contact</h2>
        <p>
          Program records are retained as required by federal and state law (generally 3–7
          years post-program), then deleted or anonymized. Questions: privacy@solvana.ai.
        </p>
      </section>
    </LegalShell>
  );
}

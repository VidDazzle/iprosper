import type { Metadata } from "next";
import LegalShell from "@/components/solvana/legal-shell";

export const metadata: Metadata = {
  title: "State Licensing & Availability | Solvana",
  description: "Where Solvana is licensed to provide debt settlement services and your state-specific rights.",
};

export default function LicensingPage() {
  return (
    <LegalShell title="State Licensing & Availability" updated="July 2026">
      <section>
        <h2>How debt settlement is regulated</h2>
        <p>
          Debt settlement is regulated federally by the FTC&apos;s Telemarketing Sales Rule and
          the CFPB, and separately by each state. Many states require debt settlement providers
          to hold a license or registration, post a surety bond, cap fees, and file periodic
          reports. Several states adopted versions of the Uniform Debt-Management Services Act
          (UDMSA). A few states prohibit for-profit debt settlement entirely.
        </p>
      </section>
      <section>
        <h2>Where Solvana operates</h2>
        <p>
          Solvana provides services only in states where it is licensed, registered, or where
          services are otherwise lawful. Our compliance agent checks your state before any
          enrollment conversation begins — if we can&apos;t lawfully serve you, our intake agent
          will say so and point you to alternatives (typically an NFCC-member nonprofit credit
          counselor).
        </p>
        <p className="pt-2">
          Solvana does not currently enroll residents of states where for-profit debt
          settlement is prohibited or where our licensing is pending. The live list of
          serviceable states is maintained in our compliance system and confirmed on your
          eligibility call; licensing numbers and bond information for your state appear in
          your Enrollment Agreement.
        </p>
      </section>
      <section>
        <h2>Your state-specific rights may include</h2>
        <ul className="space-y-2">
          <li>A right to cancel within a statutory window after signing (often 3–10 days).</li>
          <li>State fee caps that may be lower than our standard fee range.</li>
          <li>A claim against our surety bond if we fail to perform.</li>
          <li>Required individualized savings estimates before enrollment.</li>
          <li>Complaint rights with your state attorney general or financial regulator.</li>
        </ul>
      </section>
      <section>
        <h2>Regulators</h2>
        <p>
          You may verify licensure or file a complaint with your state attorney general, your
          state&apos;s financial services regulator, the FTC (reportfraud.ftc.gov), or the CFPB
          (consumerfinance.gov/complaint).
        </p>
      </section>
    </LegalShell>
  );
}

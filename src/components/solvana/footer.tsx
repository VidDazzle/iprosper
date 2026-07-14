import Link from "next/link";
import { Facebook, Instagram, Youtube, Linkedin } from "lucide-react";
import { SolvanaLogo } from "./nav";
import { PROGRAM } from "@/lib/solvana/brand";

const SOCIALS = [
  { href: "https://www.facebook.com/xdebt.ai", label: "Facebook", Icon: Facebook },
  { href: "https://www.instagram.com/xdebt.ai", label: "Instagram", Icon: Instagram },
  { href: "https://www.youtube.com/@xdebt.ai", label: "YouTube", Icon: Youtube },
  { href: "https://www.linkedin.com/company/solvana-ai", label: "LinkedIn", Icon: Linkedin },
];

export default function SolvanaFooter() {
  return (
    <footer className="border-t border-white/10 bg-[#03040a] text-gray-400">
      <div className="mx-auto max-w-7xl px-6 py-14">
        <div className="grid gap-10 md:grid-cols-4">
          <div>
            <SolvanaLogo />
            <p className="mt-4 text-sm leading-relaxed">
              A self-optimizing AI platform to get out of debt faster. Free plans for
              every kind of debt, plus AI-negotiated settlements on qualifying unsecured
              debt. By VidDazzle LLC.
            </p>
            <div className="mt-5 flex gap-3">
              {SOCIALS.map(({ href, label, Icon }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  rel="noopener noreferrer"
                  target="_blank"
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-gray-400 transition-colors hover:border-cyan-400/40 hover:text-cyan-300"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>
          <div>
            <h4 className="mb-3 text-sm font-semibold text-white">Program</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/advisor" className="hover:text-cyan-300">Free debt plan</Link></li>
              <li><Link href="/law-and-armor" className="hover:text-cyan-300">Law &amp; Armor</Link></li>
              <li><Link href="/medical-billing" className="hover:text-cyan-300">Medical bill audit</Link></li>
              <li><Link href="/find-an-attorney" className="hover:text-cyan-300">Find an attorney</Link></li>
              <li><Link href="/attorneys" className="hover:text-cyan-300">Advertise (attorneys)</Link></li>
              <li><Link href="/how-it-works" className="hover:text-cyan-300">How it works</Link></li>
              <li><Link href="/locations" className="hover:text-cyan-300">Service areas</Link></li>
              <li><Link href="/agents" className="hover:text-cyan-300">Meet the AI agents</Link></li>
              <li><Link href="/pricing" className="hover:text-cyan-300">Fees & pricing</Link></li>
              <li><Link href="/get-started" className="hover:text-cyan-300">Get started</Link></li>
              <li><Link href="/qualify" className="hover:text-cyan-300">Do I qualify?</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="mb-3 text-sm font-semibold text-white">Legal</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/legal/disclosures" className="hover:text-cyan-300">Program disclosures</Link></li>
              <li><Link href="/legal/advocate-disclosure" className="hover:text-cyan-300">Advocate disclosure &amp; release</Link></li>
              <li><Link href="/legal/advertiser-agreement" className="hover:text-cyan-300">Advertiser agreement</Link></li>
              <li><Link href="/legal/terms" className="hover:text-cyan-300">Terms of service</Link></li>
              <li><Link href="/legal/privacy" className="hover:text-cyan-300">Privacy policy</Link></li>
              <li><Link href="/legal/licensing" className="hover:text-cyan-300">State licensing</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="mb-3 text-sm font-semibold text-white">Contact</h4>
            <ul className="space-y-2 text-sm">
              <li>Voice: 1-888-XDEBT-24 (AI agents, 24/7)</li>
              <li>hello@xdebt.ai</li>
              <li>Client portal: app.xdebt.ai</li>
            </ul>
          </div>
        </div>

        <div className="mt-12 space-y-4 border-t border-white/10 pt-8 text-xs leading-relaxed text-gray-500">
          <p>
            <strong className="text-gray-400">Important program disclosures.</strong>{" "}
            X Debt negotiates settlements of unsecured debt on your behalf. X Debt does not
            lend money, does not make monthly payments to your creditors, and does not assume
            your debts. Enrollment requires a minimum of ${PROGRAM.minDebt.toLocaleString()} in
            qualifying unsecured debt. Programs typically take {PROGRAM.termLowMonths} to{" "}
            {PROGRAM.termHighMonths} months. Fees are {PROGRAM.feePctLow}%–{PROGRAM.feePctHigh}% of
            enrolled debt and are charged only after a debt is settled, you approve the terms,
            and you make at least one payment toward the settlement, as required by the FTC
            Telemarketing Sales Rule, 16 C.F.R. § 310.4(a)(5).
          </p>
          <p>
            The program requires that you stop making payments to enrolled creditors. This will
            likely have an adverse effect on your creditworthiness, may result in your being
            subject to collections or legal action by creditors, and may increase enrolled
            balances due to accrued interest, late fees, and penalties. Creditors are not
            obligated to negotiate or to accept any settlement offer. Not all clients complete
            the program. Savings results vary and are not guaranteed. Forgiven debt may be
            taxable income; consult a tax professional.
          </p>
          <p>
            Funds you save accumulate in a dedicated account that you own and control at an
            independent, FDIC-insured institution unaffiliated with X Debt. You may withdraw
            your funds at any time without penalty. X Debt is not a law firm and does not
            provide legal, tax, or bankruptcy advice. X Debt does not settle secured debts
            (such as mortgages or auto loans) or federal student loans. Services are not
            available in all states; see{" "}
            <Link href="/legal/licensing" className="underline hover:text-cyan-300">state licensing</Link>.
          </p>
          <p>
            The free Debt Reduction Advisor is educational and is not financial, tax, or legal
            advice. © {new Date().getFullYear()} VidDazzle LLC. X Debt is a product of VidDazzle
            LLC. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

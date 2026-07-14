import type { Metadata } from "next";
import SolvanaNav from "@/components/solvana/nav";
import SolvanaFooter from "@/components/solvana/footer";
import AttorneyApplyForm from "@/components/partners/apply-form";
import { pageMetadata } from "@/lib/solvana/seo";
import { TIERS, SETUP_FEE, CALENDAR_ADDON, USD } from "@/lib/partners/pricing";
import { CheckCircle2, Scale, Radio, CalendarClock } from "lucide-react";

export const metadata: Metadata = pageMetadata({
  title: "Advertise to People Actively Solving Their Debt",
  description:
    "Debt and bankruptcy attorneys: reach consumers at the exact moment they're tackling their debt. Flat advertising fees — no fee-splitting, no percentage of your legal fees. Setup, monthly, and per-verified-lead.",
  path: "/attorneys",
});

export default function AttorneysPage() {
  return (
    <div className="bg-[#050810] font-sans text-white">
      <SolvanaNav />

      <section className="relative overflow-hidden px-6 pb-12 pt-16 text-center">
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="absolute left-1/2 top-[-150px] h-[400px] w-[640px] -translate-x-1/2 rounded-full bg-amber-500/12 blur-[130px]" />
        </div>
        <div className="relative mx-auto max-w-3xl">
          <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-4 py-1.5 text-sm text-amber-200">
            <Radio className="h-3.5 w-3.5" /> For debt & bankruptcy attorneys
          </span>
          <h1 className="mb-5 text-4xl font-bold md:text-6xl">
            Reach people at the moment they&rsquo;re{" "}
            <span className="bg-gradient-to-r from-amber-300 to-pink-500 bg-clip-text text-transparent">solving their debt</span>
          </h1>
          <p className="text-lg text-gray-300">
            Our free tools bring in consumers actively working on credit cards, medical bills, loans,
            foreclosure, and bankruptcy. Advertise your practice to them — and let{" "}
            <span className="text-white">Beacon</span>, our AI partnerships agent, onboard you, design your
            card, and route qualified connections to your phone.
          </p>
        </div>
      </section>

      {/* Pricing */}
      <section className="px-6 pb-16">
        <div className="mx-auto max-w-5xl">
          <div className="mb-6 text-center">
            <p className="text-sm text-slate-400">One-time setup: <span className="font-semibold text-white">{USD.format(SETUP_FEE)}</span> — includes onboarding, profile, and an AI-designed business card.</p>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {TIERS.map((t) => (
              <div key={t.id} className={`rounded-2xl border p-6 ${t.highlighted ? "border-cyan-400/40 bg-cyan-400/[0.04] shadow-[0_0_40px_rgba(34,211,238,0.08)]" : "border-white/10 bg-white/[0.03]"}`}>
                {t.highlighted && <span className="mb-3 inline-block rounded-full bg-gradient-to-r from-cyan-500 to-violet-600 px-3 py-1 text-xs font-semibold text-white">Most popular</span>}
                <h3 className="text-xl font-bold text-white">{t.name}</h3>
                <p className="mt-1 text-3xl font-bold text-white">{USD.format(t.monthly)}<span className="text-base font-normal text-slate-400">/mo</span></p>
                <p className="mt-1 text-sm text-cyan-300">+ {USD.format(t.perLeadFee)} per verified lead</p>
                <p className="mt-3 text-sm text-slate-400">{t.placement}</p>
                <ul className="mt-4 space-y-2 text-sm text-slate-300">
                  {t.perks.map((p) => (
                    <li key={p} className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-cyan-400/80" /> {p}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Calendar add-on */}
          <div className="mx-auto mt-6 max-w-3xl rounded-2xl border border-teal-400/25 bg-teal-400/[0.04] p-6">
            <div className="flex flex-wrap items-center gap-4">
              <CalendarClock className="h-8 w-8 flex-shrink-0 text-teal-300" />
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-white">Add-on: the booking calendar <span className="ml-1 text-sm font-normal text-teal-300">+{USD.format(CALENDAR_ADDON.monthly)}/mo · {USD.format(CALENDAR_ADDON.perAppointment)}/booked consult</span></h3>
                <p className="mt-1 text-sm text-slate-400">
                  Let clients book consultations on your open time. Chronos, our scheduling agent, syncs your Google,
                  Outlook, or Apple calendar&rsquo;s free/busy — clients see only your available slots, never your calendar
                  details — and books the appointment on both sides with calendar invites and reminders. No more phone tag.
                </p>
              </div>
            </div>
          </div>

          {/* Compliance note */}
          <div className="mx-auto mt-8 max-w-3xl rounded-xl border border-white/10 bg-white/[0.02] p-5">
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-white"><Scale className="h-4 w-4 text-amber-300" /> Ethics-compliant by design</h3>
            <p className="text-sm leading-relaxed text-slate-400">
              You pay <strong className="text-slate-200">flat advertising fees only</strong> — a one-time setup fee, a
              flat monthly fee, and a fixed per-verified-lead fee that is the same whether or not the client ever
              retains you and regardless of what you charge. We do <strong className="text-slate-200">not</strong> take a
              percentage of your legal fees (fee-splitting, barred by ABA Model Rule 5.4) and we do{" "}
              <strong className="text-slate-200">not</strong> charge referral fees for referrals (Rule 7.2(b)). All
              listings are clearly labeled paid advertising, and we never recommend one advertiser over another.
              You&rsquo;re responsible for compliance with your own state bar&rsquo;s advertising rules.
            </p>
          </div>
        </div>
      </section>

      {/* Apply */}
      <section className="px-6 pb-24">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-2 text-2xl font-bold text-white">Apply to advertise</h2>
          <p className="mb-6 text-sm text-slate-400">Beacon will verify your bar number and reach out to activate your listing — usually within one business day.</p>
          <AttorneyApplyForm />
        </div>
      </section>

      <SolvanaFooter />
    </div>
  );
}

import Link from "next/link";
import type { Metadata } from "next";
import { requireAttorney } from "@/lib/partners/session";
import { getPartner, leadsForPartner, appointmentsForPartner } from "@/lib/partners/store";
import { getTier, CALENDAR_ADDON, FREE_REFERRALS, USD } from "@/lib/partners/pricing";
import { SolvanaLogo } from "@/components/solvana/nav";
import AttorneyLogoutButton from "@/components/partners/logout-button";
import EnablePush from "@/components/portal/enable-push";
import { StatCard, Panel } from "@/components/admin/ui";
import { Phone, MessageSquare, Bell, CalendarClock, Gift, Download, Scale } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Attorney Dashboard | X Debt", robots: { index: false, follow: false } };

const CHANNEL_ICON = { call: Phone, text: MessageSquare, notification: Bell };
const STATUS_STYLE: Record<string, string> = { active: "text-emerald-300", pending: "text-amber-300", paused: "text-slate-400", rejected: "text-rose-300" };

export default async function AttorneyDashboard() {
  const session = await requireAttorney();
  const partner = await getPartner(session.pid);
  if (!partner) return null;
  const [leads, appts] = await Promise.all([leadsForPartner(partner.id), appointmentsForPartner(partner.id)]);

  const tier = getTier(partner.tier);
  const freeUsed = Math.min(leads.filter((l) => l.complimentary).length, FREE_REFERRALS);
  const freeRemaining = Math.max(0, FREE_REFERRALS - freeUsed);
  const monthly = tier.monthly + (partner.calendarEnabled ? CALENDAR_ADDON.monthly : 0);
  const feesThisPeriod = leads.reduce((s, l) => s + l.feeAmount, 0) + appts.reduce((s, a) => s + a.feeAmount, 0);

  return (
    <div className="min-h-screen bg-[#050810] font-sans text-slate-200">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#03040a]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
          <Link href="/"><SolvanaLogo /></Link>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium text-white">{partner.firmName}</p>
              <p className="text-xs text-slate-500">{partner.attorneyName}, Esq.</p>
            </div>
            <AttorneyLogoutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-5 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white">Advertiser dashboard</h1>
            <p className="text-sm text-slate-400">
              <span className="capitalize">{partner.tier}</span> plan ·{" "}
              <span className={`capitalize ${STATUS_STYLE[partner.status]}`}>{partner.status}</span>
              {partner.calendarEnabled && <span> · calendar on</span>}
            </p>
          </div>
          <Link href="/attorneys" className="text-sm text-cyan-300 hover:text-cyan-200">Update listing →</Link>
        </div>

        {freeRemaining > 0 && (
          <div className="flex items-center gap-3 rounded-xl border border-emerald-400/25 bg-emerald-400/5 px-5 py-4">
            <Gift className="h-6 w-6 flex-shrink-0 text-emerald-300" />
            <p className="text-sm text-emerald-100">
              <span className="font-semibold">Welcome gift:</span> your first {FREE_REFERRALS} client referrals are on us —
              you have <span className="font-semibold">{freeRemaining} free {freeRemaining === 1 ? "referral" : "referrals"}</span> left. No per-lead fee until they&rsquo;re used.
            </p>
          </div>
        )}

        <EnablePush subject={`attorney:${partner.id}`} label="Turn on push to get pinged the instant a client connects or books." />

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Client connections" value={String(leads.length)} sub={`${freeUsed} free used`} accent="cyan" />
          <StatCard label="Consultations booked" value={String(appts.length)} accent="violet" />
          <StatCard label="Your monthly plan" value={USD.format(monthly)} sub={partner.calendarEnabled ? "incl. calendar add-on" : undefined} accent="emerald" />
          <StatCard label="Fees this period" value={USD.format(feesThisPeriod)} sub="leads + appointments" accent="amber" />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Panel title={`Client connections (${leads.length})`}>
            {leads.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500">No connections yet. They&rsquo;ll appear here — and ping you — the moment a client reaches out.</p>
            ) : (
              <div className="space-y-2">
                {leads.map((l) => {
                  const Icon = CHANNEL_ICON[l.channel];
                  return (
                    <div key={l.id} className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] px-4 py-2.5 text-sm">
                      <span className="flex items-center gap-2 text-white"><Icon className="h-4 w-4 text-cyan-300" /> <span className="capitalize">{l.channel}</span>{l.practiceArea && <span className="text-slate-500">· {l.practiceArea}</span>}</span>
                      <span>{l.complimentary ? <span className="rounded bg-emerald-400/10 px-2 py-0.5 text-xs text-emerald-300">Free</span> : <span className="text-cyan-300">{USD.format(l.feeAmount)}</span>}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>

          <Panel title={`Upcoming consultations (${appts.length})`}>
            {appts.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500">{partner.calendarEnabled ? "No consultations booked yet." : "Enable the booking calendar add-on to let clients schedule consultations."}</p>
            ) : (
              <div className="space-y-2">
                {appts.map((a) => (
                  <div key={a.id} className="rounded-lg border border-white/5 bg-white/[0.02] px-4 py-2.5 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-white"><CalendarClock className="h-4 w-4 text-teal-300" /> {a.clientName}</span>
                      <span className="text-slate-400">{new Date(a.startUtc).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500">{a.clientEmail}{a.clientPhone ? ` · ${a.clientPhone}` : ""}{a.topic ? ` · ${a.topic}` : ""}</p>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Panel title="Your business card">
            {partner.businessCardUrl ? (
              <div className="space-y-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={partner.businessCardUrl} alt="Business card" className="w-full rounded-lg border border-white/10" />
                <a href={partner.businessCardUrl} download="business-card.svg" className="inline-flex items-center gap-2 text-sm text-cyan-300 hover:text-cyan-200"><Download className="h-4 w-4" /> Download</a>
              </div>
            ) : <p className="py-6 text-center text-sm text-slate-500">No card on file.</p>}
          </Panel>

          <Panel title="Your listing">
            <dl className="space-y-2 text-sm">
              <Row label="Practice areas" value={partner.practiceAreas.join(", ") || "—"} />
              <Row label="State / bar #" value={`${partner.stateCode ?? "—"} / ${partner.barNumber ?? "—"}`} />
              <Row label="Contact" value={`${partner.phone ?? "—"} · ${partner.email}`} />
              <Row label="Booking calendar" value={partner.calendarEnabled ? `On (${partner.availability?.timezone ?? ""})` : "Off"} />
              <Row label="Per-lead fee" value={`${USD.format(tier.perLeadFee)} after free referrals`} />
            </dl>
            <p className="mt-4 flex items-center gap-1.5 text-xs text-slate-500"><Scale className="h-3.5 w-3.5" /> Flat advertising fees only — never a share of your legal fees.</p>
          </Panel>
        </div>
      </main>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-white/5 py-1.5 last:border-0">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right text-slate-300">{value}</dd>
    </div>
  );
}

import { Panel, StatCard } from "@/components/admin/ui";
import { listAllPartners, listLeads, listAppointments, partnerRevenue } from "@/lib/partners/store";
import { getTier, USD } from "@/lib/partners/pricing";

export const dynamic = "force-dynamic";

const STATUS_STYLE: Record<string, string> = {
  active: "text-emerald-300",
  pending: "text-amber-300",
  paused: "text-slate-400",
  rejected: "text-rose-300",
};

export default async function AdminPartnersPage() {
  const [partners, leads, appointments, rev] = await Promise.all([
    listAllPartners(), listLeads(), listAppointments(), partnerRevenue(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Attorney Advertising</h1>
        <p className="text-sm text-slate-400">Beacon&rsquo;s partner network, Chronos bookings, and advertising revenue. Flat fees only — no fee-splitting.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Monthly recurring" value={USD.format(rev.mrr)} sub={`${rev.activePartners} advertisers · ${rev.calendarPartners} w/ calendar`} accent="emerald" />
        <StatCard label="Setup fees collected" value={USD.format(rev.setupCollected)} accent="cyan" />
        <StatCard label="Per-lead revenue" value={USD.format(rev.leadRevenue)} sub={`${rev.leadCount} verified leads`} accent="violet" />
        <StatCard label="Appointment revenue" value={USD.format(rev.appointmentRevenue)} sub={`${rev.appointmentCount} booked consults`} accent="amber" />
      </div>

      <Panel title="Attorney advertisers">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="pb-2 font-medium">Firm / Attorney</th>
                <th className="pb-2 font-medium">State</th>
                <th className="pb-2 font-medium">Tier</th>
                <th className="pb-2 font-medium">Monthly</th>
                <th className="pb-2 font-medium">Per-lead</th>
                <th className="pb-2 font-medium">Status</th>
                <th className="pb-2 font-medium">Card</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {partners.map((p) => {
                const tier = getTier(p.tier);
                return (
                  <tr key={p.id}>
                    <td className="py-2.5">
                      <span className="block font-medium text-white">{p.firmName}</span>
                      <span className="text-xs text-slate-500">{p.attorneyName} · bar {p.barNumber ?? "—"}</span>
                    </td>
                    <td className="py-2.5 text-slate-300">{p.stateCode ?? "—"}</td>
                    <td className="py-2.5 capitalize text-slate-300">{p.tier}</td>
                    <td className="py-2.5 text-slate-300">{USD.format(tier.monthly)}</td>
                    <td className="py-2.5 text-slate-300">{USD.format(tier.perLeadFee)}</td>
                    <td className={`py-2.5 capitalize ${STATUS_STYLE[p.status]}`}>{p.status}</td>
                    <td className="py-2.5 text-slate-400">{p.businessCardGenerated ? "AI-designed" : p.businessCardUrl ? "uploaded" : "—"}</td>
                  </tr>
                );
              })}
              {partners.length === 0 && (
                <tr><td colSpan={7} className="py-8 text-center text-slate-500">No advertisers yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel title={`Verified leads (${leads.length})`}>
        {leads.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">No leads routed yet. Each call, text, or contact request from the directory is billed to the attorney as a flat advertising fee.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
                <tr><th className="pb-2 font-medium">Attorney</th><th className="pb-2 font-medium">Channel</th><th className="pb-2 font-medium">Practice area</th><th className="pb-2 font-medium">Fee</th><th className="pb-2 font-medium">Status</th></tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {leads.map((l) => {
                  const partner = partners.find((p) => p.id === l.partnerId);
                  return (
                    <tr key={l.id}>
                      <td className="py-2.5 text-white">{partner?.firmName ?? `#${l.partnerId}`}</td>
                      <td className="py-2.5 capitalize text-slate-300">{l.channel}</td>
                      <td className="py-2.5 text-slate-400">{l.practiceArea ?? "—"}</td>
                      <td className="py-2.5 text-cyan-300">{USD.format(l.feeAmount)}</td>
                      <td className="py-2.5 capitalize text-slate-400">{l.status}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel title={`Booked consultations (${appointments.length})`}>
        {appointments.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">No consultations booked yet. Each booking through Chronos is billed to the attorney as a flat per-appointment advertising fee.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
                <tr><th className="pb-2 font-medium">Attorney</th><th className="pb-2 font-medium">Client</th><th className="pb-2 font-medium">When (UTC)</th><th className="pb-2 font-medium">Fee</th><th className="pb-2 font-medium">Status</th></tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {appointments.map((a) => {
                  const partner = partners.find((p) => p.id === a.partnerId);
                  return (
                    <tr key={a.id}>
                      <td className="py-2.5 text-white">{partner?.firmName ?? `#${a.partnerId}`}</td>
                      <td className="py-2.5 text-slate-300">{a.clientName}</td>
                      <td className="py-2.5 text-slate-400">{new Date(a.startUtc).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</td>
                      <td className="py-2.5 text-cyan-300">{USD.format(a.feeAmount)}</td>
                      <td className="py-2.5 capitalize text-slate-400">{a.status}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}

import { Panel, StatCard, money } from "@/components/admin/ui";
import { DonutChartCard, BarChartCard, PALETTE } from "@/components/admin/charts";
import { leadsBySource, portfolioKpis } from "@/lib/admin/reports";
import { CAMPAIGNS } from "@/lib/marketing/campaigns";

const PLATFORM_LABEL: Record<string, string> = {
  meta: "Meta (FB/IG)",
  tiktok: "TikTok",
  youtube: "YouTube",
  google: "Google",
  x: "X",
  linkedin: "LinkedIn",
};

// Illustrative funnel metrics per source (in production these come from the
// leads table joined with ad-platform cost data).
const SOURCE_CVR: Record<string, number> = {
  facebook: 0.11, tiktok: 0.08, google: 0.14, youtube: 0.07, x: 0.06, linkedin: 0.09, organic: 0.18, referral: 0.22,
};

export default function LeadsPage() {
  const bySource = leadsBySource();
  const k = portfolioKpis();
  const totalEnrolled = bySource.reduce((s, r) => s + r.count, 0);
  // Back into estimated lead volume from enrolled clients and conversion rate.
  const leadRows = bySource.map((r) => {
    const cvr = SOURCE_CVR[r.source] ?? 0.1;
    const leads = Math.round(r.count / cvr);
    return { source: r.source, leads, enrolled: r.count, cvr };
  });
  const totalLeads = leadRows.reduce((s, r) => s + r.leads, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Leads & Marketing</h1>
        <p className="text-sm text-slate-400">Acquisition performance across paid social, search, and organic.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Leads captured" value={totalLeads.toLocaleString()} sub="trailing period" trend={14} accent="cyan" />
        <StatCard label="Enrolled clients" value={String(totalEnrolled)} sub="from all sources" trend={9} accent="emerald" />
        <StatCard label="Blended conversion" value={`${Math.round((totalEnrolled / totalLeads) * 100)}%`} sub="lead → enrolled" accent="violet" />
        <StatCard label="Debt under mgmt" value={money(k.totalEnrolledDebt)} sub="attributed to marketing" accent="amber" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Enrolled clients by source">
          <DonutChartCard data={bySource} nameKey="source" valueKey="count" />
        </Panel>
        <div className="lg:col-span-2">
          <Panel title="Estimated leads by source">
            <BarChartCard
              data={leadRows}
              xKey="source"
              bars={[
                { key: "leads", name: "Leads", color: PALETTE[0] },
                { key: "enrolled", name: "Enrolled", color: PALETTE[2] },
              ]}
            />
          </Panel>
        </div>
      </div>

      <Panel title="Source performance">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="pb-2 font-medium">Source</th>
                <th className="pb-2 font-medium">Leads</th>
                <th className="pb-2 font-medium">Enrolled</th>
                <th className="pb-2 font-medium">Conversion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {leadRows.map((r) => (
                <tr key={r.source}>
                  <td className="py-2.5 font-medium capitalize text-white">{r.source}</td>
                  <td className="py-2.5 text-slate-300">{r.leads.toLocaleString()}</td>
                  <td className="py-2.5 text-emerald-300">{r.enrolled}</td>
                  <td className="py-2.5 text-cyan-300">{Math.round(r.cvr * 100)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel title="Active ad campaigns">
        <div className="grid gap-3 sm:grid-cols-2">
          {CAMPAIGNS.map((c) => (
            <div key={c.id} className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
              <div className="mb-1 flex items-center justify-between">
                <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2 py-0.5 text-xs text-cyan-300">
                  {PLATFORM_LABEL[c.platform] ?? c.platform}
                </span>
                <span className="text-xs capitalize text-slate-500">{c.objective.replace("_", " ")}</span>
              </div>
              <p className="text-sm font-medium text-white">{c.creatives[0]?.hook}</p>
              <p className="mt-1 text-xs text-slate-500">→ {c.landingPath} · {c.creatives.length} creative(s)</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-slate-500">
          Every campaign stamps consistent utm_* params on its landing URL; the /api/leads endpoint captures attribution and fires
          Meta CAPI + client pixels for conversion tracking.
        </p>
      </Panel>
    </div>
  );
}

import { Panel, money, pct } from "@/components/admin/ui";
import { BarChartCard, LineChartCard, DonutChartCard, PALETTE } from "@/components/admin/charts";
import {
  settlementsOverTime,
  settlementByCreditor,
  debtByType,
  funnelByPhase,
  depositsOverTime,
  portfolioKpis,
} from "@/lib/admin/reports";

export default function ReportsPage() {
  const settlements = settlementsOverTime();
  const byCreditor = settlementByCreditor();
  const byType = debtByType();
  const funnel = funnelByPhase();
  const deposits = depositsOverTime();
  const k = portfolioKpis();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Analytics & Reports</h1>
        <p className="text-sm text-slate-400">Portfolio-wide performance across settlements, deposits, and outcomes.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Settlements closed per month">
          <LineChartCard data={settlements} xKey="month" lines={[{ key: "settled", name: "Settlements", color: PALETTE[0] }]} />
        </Panel>
        <Panel title="Client savings generated per month">
          <BarChartCard data={settlements} xKey="month" money bars={[{ key: "savings", name: "Savings", color: PALETTE[2] }]} />
        </Panel>
      </div>

      <Panel title="Settlement performance by creditor (top 10)">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="pb-2 font-medium">Creditor</th>
                <th className="pb-2 font-medium">Settlements</th>
                <th className="pb-2 font-medium">Avg. settlement %</th>
                <th className="pb-2 font-medium">Client savings</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {byCreditor.map((r) => (
                <tr key={r.creditor}>
                  <td className="py-2.5 font-medium text-white">{r.creditor}</td>
                  <td className="py-2.5 text-slate-300">{r.settlements}</td>
                  <td className="py-2.5">
                    <span className={r.avgPct < 0.5 ? "text-emerald-300" : "text-amber-300"}>{pct(r.avgPct)}</span>
                  </td>
                  <td className="py-2.5 text-cyan-300">{money(r.saved)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Enrolled debt by type">
          <DonutChartCard data={byType} nameKey="type" valueKey="amount" money />
        </Panel>
        <Panel title="Client funnel by phase">
          <BarChartCard data={funnel} xKey="phase" bars={[{ key: "clients", name: "Clients", color: PALETTE[1] }]} />
        </Panel>
      </div>

      <Panel title="Program deposits: cleared vs missed (trailing 12 months)">
        <BarChartCard
          data={deposits}
          xKey="month"
          money
          bars={[
            { key: "cleared", name: "Cleared", color: PALETTE[2] },
            { key: "missed", name: "Missed", color: PALETTE[4] },
          ]}
        />
      </Panel>

      <div className="grid grid-cols-2 gap-4 rounded-xl border border-white/10 bg-[#0b1220]/60 p-5 lg:grid-cols-4">
        <Metric label="Avg. settlement" value={pct(k.avgSettlementPct)} />
        <Metric label="Total client savings" value={money(k.clientSavings)} />
        <Metric label="Fees earned" value={money(k.feesEarned)} />
        <Metric label="Graduation rate" value={pct(k.graduationRate)} />
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-bold text-white">{value}</p>
    </div>
  );
}

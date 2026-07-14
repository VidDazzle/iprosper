import Link from "next/link";
import { StatCard, Panel, PhaseBadge, money, pct, ProgressBar } from "@/components/admin/ui";
import { AreaChartCard, BarChartCard, DonutChartCard, PALETTE } from "@/components/admin/charts";
import {
  portfolioKpis,
  funnelByPhase,
  debtByType,
  settlementsOverTime,
  depositsOverTime,
  allCaseSummaries,
} from "@/lib/admin/reports";
import { portalActivityStats, listAllApprovals } from "@/lib/portal/store";
import { getClient } from "@/lib/admin/mock-data";
import { AlertTriangle, ArrowRight, CheckSquare, FileText, Clock } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminOverview() {
  const k = portfolioKpis();
  const portal = await portalActivityStats();
  const pendingApprovals = (await listAllApprovals()).filter((a) => a.status === "pending").slice(0, 5);
  const funnel = funnelByPhase();
  const byType = debtByType();
  const settlements = settlementsOverTime();
  const deposits = depositsOverTime();
  const cases = allCaseSummaries();
  const attention = cases
    .filter((c) => c.client.litigationActive || c.client.debts.some((d) => d.status === "offer_pending") || c.depositAdherence < 0.85)
    .slice(0, 6);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Operations Overview</h1>
        <p className="text-sm text-slate-400">Live portfolio across {k.totalClients} enrolled clients.</p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Active clients" value={String(k.activeClients)} sub={`${k.totalClients} total`} trend={6} accent="cyan" />
        <StatCard label="Debt under management" value={money(k.totalEnrolledDebt)} sub="enrolled balances" trend={9} accent="violet" />
        <StatCard label="Client savings to date" value={money(k.clientSavings)} sub={`avg settlement ${pct(k.avgSettlementPct)}`} trend={12} accent="emerald" />
        <StatCard label="Fees earned" value={money(k.feesEarned)} sub={`${money(k.feesInPipeline)} in pipeline`} trend={8} accent="amber" />
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Debt settled" value={money(k.debtSettledOriginal)} sub={`paid ${money(k.debtSettledPaid)}`} accent="cyan" />
        <StatCard label="In dedicated accounts" value={money(k.accountBalances)} sub="client-owned, FDIC-insured" accent="emerald" />
        <StatCard label="Graduation rate" value={pct(k.graduationRate)} sub="of completed programs" accent="violet" />
        <StatCard label="Litigation cases" value={String(k.litigationCases)} sub="Guardian handling" accent="rose" />
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Panel title="Settlements & client savings (trailing 12 months)">
            <AreaChartCard
              data={settlements}
              xKey="month"
              money
              areas={[{ key: "savings", name: "Client savings", color: PALETTE[0] }]}
            />
          </Panel>
        </div>
        <Panel title="Enrolled debt by type">
          <DonutChartCard data={byType} nameKey="type" valueKey="amount" money />
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Client funnel by phase">
          <BarChartCard data={funnel} xKey="phase" bars={[{ key: "clients", name: "Clients", color: PALETTE[1] }]} />
        </Panel>
        <div className="lg:col-span-2">
          <Panel title="Program deposits collected (trailing 12 months)">
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
        </div>
      </div>

      {/* Live client activity (portal) */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel
          title="Client approvals awaiting decision"
          action={
            <Link href="/admin/approvals" className="inline-flex items-center gap-1 text-xs text-cyan-300 hover:text-cyan-200">
              All approvals <ArrowRight className="h-3 w-3" />
            </Link>
          }
        >
          {pendingApprovals.length === 0 ? (
            <p className="py-4 text-center text-sm text-slate-500">No approvals awaiting a client decision.</p>
          ) : (
            <div className="space-y-2">
              {pendingApprovals.map((a) => {
                const client = getClient(a.clientId);
                return (
                  <div key={a.id} className="flex items-center justify-between gap-3 rounded-lg border border-amber-400/20 bg-amber-400/[0.04] px-4 py-2.5 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-white">{a.title}</p>
                      <Link href={`/admin/clients/${a.clientId}`} className="text-xs text-cyan-300 hover:text-cyan-200">{client?.name ?? a.clientId}</Link>
                    </div>
                    <span className="inline-flex flex-shrink-0 items-center gap-1 text-xs text-amber-300"><Clock className="h-3 w-3" /> pending</span>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>
        <StatCard label="Pending approvals" value={String(portal.approvalsPending)} sub={`${portal.approvalsApproved} approved · ${portal.approvalsRejected} declined`} accent="amber" />
        <StatCard label="Client documents" value={String(portal.documents)} sub={`${portal.documentsUrgent} urgent`} accent="cyan" />
      </div>

      {/* Needs attention */}
      <Panel
        title="Cases needing attention"
        action={
          <Link href="/admin/clients" className="inline-flex items-center gap-1 text-xs text-cyan-300 hover:text-cyan-200">
            All clients <ArrowRight className="h-3 w-3" />
          </Link>
        }
      >
        <div className="space-y-2">
          {attention.map((c) => (
            <Link
              key={c.client.id}
              href={`/admin/clients/${c.client.id}`}
              className="flex flex-wrap items-center gap-3 rounded-lg border border-white/5 bg-white/[0.02] px-4 py-3 transition-colors hover:border-white/15"
            >
              <span className="w-32 truncate font-medium text-white">{c.client.name}</span>
              <PhaseBadge phase={c.client.phase} />
              {c.client.litigationActive && (
                <span className="inline-flex items-center gap-1 text-xs text-rose-300">
                  <AlertTriangle className="h-3 w-3" /> Litigation
                </span>
              )}
              {c.client.debts.some((d) => d.status === "offer_pending") && (
                <span className="text-xs text-amber-300">Offer awaiting approval</span>
              )}
              {c.depositAdherence < 0.85 && (
                <span className="text-xs text-slate-400">Deposit adherence {pct(c.depositAdherence)}</span>
              )}
              <span className="ml-auto flex-1 basis-40">
                <span className="mb-1 block text-[11px] text-slate-500">Progress {pct(c.progressPct)}</span>
                <ProgressBar value={c.progressPct} />
              </span>
            </Link>
          ))}
        </div>
      </Panel>
    </div>
  );
}

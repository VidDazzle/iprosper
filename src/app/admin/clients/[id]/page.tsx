import Link from "next/link";
import { notFound } from "next/navigation";
import { getClient } from "@/lib/admin/mock-data";
import { caseSummary } from "@/lib/admin/reports";
import { StatCard, Panel, PhaseBadge, DebtStatusBadge, money, pct, ProgressBar } from "@/components/admin/ui";
import { BarChartCard, PALETTE } from "@/components/admin/charts";
import { getAgent } from "@/lib/agents/registry";
import { AGENT_ICONS, AGENT_GRADIENTS } from "@/components/solvana/agent-grid";
import { listDocuments, listApprovals } from "@/lib/portal/store";
import { ArrowLeft, TrendingUp, TrendingDown, AlertTriangle, PhoneCall, Mail, MessageSquare, Cpu, FileText, CheckCircle2, XCircle, Clock } from "lucide-react";
import type { AgentActivityEntry } from "@/lib/admin/types";

const CHANNEL_ICON = { voice: PhoneCall, email: Mail, sms: MessageSquare, internal: Cpu };

export const dynamic = "force-dynamic";

export default async function ClientCasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = getClient(id);
  if (!client) notFound();
  const c = caseSummary(client);
  const [documents, approvals] = await Promise.all([listDocuments(id), listApprovals(id)]);
  const creditUp = c.creditDelta >= 0;

  // Deposit history for chart.
  const deposits = client.deposits
    .filter((d) => d.status !== "scheduled")
    .slice(-12)
    .map((d) => ({
      month: new Date(d.date).toLocaleString("en-US", { month: "short", year: "2-digit" }),
      amount: d.status === "cleared" ? d.amount : 0,
      missed: d.status === "missed" ? d.amount : 0,
    }));

  return (
    <div className="space-y-6">
      <Link href="/admin/clients" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white">
        <ArrowLeft className="h-4 w-4" /> All clients
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">{client.name}</h1>
            <PhaseBadge phase={client.phase} />
            {client.litigationActive && (
              <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/30 bg-rose-500/10 px-2.5 py-0.5 text-xs text-rose-300">
                <AlertTriangle className="h-3 w-3" /> Litigation active
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {client.id} · {client.stateCode} · {client.email} · enrolled{" "}
            {new Date(client.enrolledOn).toLocaleDateString("en-US", { month: "short", year: "numeric" })} · via {client.source}
          </p>
        </div>
        <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 px-4 py-2 text-sm">
          <span className="text-xs uppercase tracking-wide text-slate-500">Next action</span>
          <p className="text-cyan-200">{c.nextAction}</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Enrolled debt" value={money(c.enrolledDebtTotal)} sub={`${client.debts.length} accounts`} accent="violet" />
        <StatCard label="Settled so far" value={money(c.settledDebtTotal)} sub={`paid ${money(c.settledPaidTotal)}`} accent="cyan" />
        <StatCard label="Client savings" value={money(c.savings)} sub={c.savingsPct ? `${pct(c.savingsPct)} off settled` : "—"} accent="emerald" />
        <StatCard label="Account balance" value={money(client.dedicatedAccountBalance)} sub={`${money(client.monthlyDeposit)}/mo`} accent="amber" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Left column: progress + credit + deposits */}
        <div className="space-y-4 lg:col-span-1">
          <Panel title="Program progress">
            <div className="space-y-4">
              <div>
                <div className="mb-1 flex justify-between text-xs text-slate-400">
                  <span>Debt resolved</span>
                  <span>{pct(c.progressPct)}</span>
                </div>
                <ProgressBar value={c.progressPct} />
              </div>
              <div>
                <div className="mb-1 flex justify-between text-xs text-slate-400">
                  <span>Deposit adherence</span>
                  <span>{pct(c.depositAdherence)}</span>
                </div>
                <ProgressBar value={c.depositAdherence} color={c.depositAdherence < 0.85 ? "amber" : "emerald"} />
              </div>
            </div>
          </Panel>

          <Panel title="Credit score trajectory">
            <div className="flex items-center justify-between">
              <div className="text-center">
                <p className="text-xs text-slate-500">At enrollment</p>
                <p className="text-2xl font-bold text-slate-300">{client.creditScoreAtEnrollment}</p>
              </div>
              <div className={`flex items-center gap-1 text-sm ${creditUp ? "text-emerald-400" : "text-rose-400"}`}>
                {creditUp ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
                {creditUp ? "+" : ""}{c.creditDelta}
              </div>
              <div className="text-center">
                <p className="text-xs text-slate-500">Current</p>
                <p className="text-2xl font-bold text-white">{client.currentCreditScore}</p>
              </div>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-slate-500">
              Scores typically dip after payments stop, then recover as debts settle. Reported to the client transparently.
            </p>
          </Panel>

          <Panel title="Deposits (last 12)">
            <BarChartCard
              data={deposits}
              xKey="month"
              money
              height={200}
              bars={[
                { key: "amount", name: "Cleared", color: PALETTE[2] },
                { key: "missed", name: "Missed", color: PALETTE[4] },
              ]}
            />
          </Panel>
        </div>

        {/* Right column: debts + timeline */}
        <div className="space-y-4 lg:col-span-2">
          <Panel title="Enrolled debts">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="pb-2 font-medium">Creditor</th>
                    <th className="pb-2 font-medium">Original</th>
                    <th className="pb-2 font-medium">Current</th>
                    <th className="pb-2 font-medium">Settlement</th>
                    <th className="pb-2 font-medium">Status</th>
                    <th className="pb-2 font-medium">Lit. risk</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {client.debts.map((d) => (
                    <tr key={d.id}>
                      <td className="py-2.5 font-medium text-white">{d.creditor}</td>
                      <td className="py-2.5 text-slate-300">{money(d.originalBalance)}</td>
                      <td className="py-2.5 text-slate-400">{money(d.currentBalance)}</td>
                      <td className="py-2.5 text-cyan-300">
                        {d.settlementAmount ? `${money(d.settlementAmount)} (${pct(d.settlementPct ?? 0)})` : "—"}
                      </td>
                      <td className="py-2.5"><DebtStatusBadge status={d.status} /></td>
                      <td className="py-2.5">
                        <span className={`text-xs ${d.litigationRisk > 60 ? "text-rose-300" : d.litigationRisk > 35 ? "text-amber-300" : "text-slate-400"}`}>
                          {d.litigationRisk}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel title="AI agent activity">
            <ol className="relative space-y-4 border-l border-white/10 pl-6">
              {client.activity.slice(0, 10).map((a: AgentActivityEntry) => {
                const agent = getAgent(a.agent);
                const Icon = AGENT_ICONS[a.agent];
                const ChannelIcon = CHANNEL_ICON[a.channel];
                return (
                  <li key={a.id} className="relative">
                    <span className={`absolute -left-[31px] flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br ${AGENT_GRADIENTS[a.agent]}`}>
                      <Icon className="h-3 w-3 text-white" />
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white">{agent?.name}</span>
                      <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                        <ChannelIcon className="h-3 w-3" /> {a.channel}
                      </span>
                      <span className="text-xs text-slate-600">
                        {new Date(a.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                      {a.complianceScreened && <span className="text-[10px] text-emerald-500">✓ screened</span>}
                    </div>
                    <p className="mt-0.5 text-sm text-slate-400">{a.summary}</p>
                  </li>
                );
              })}
            </ol>
          </Panel>
        </div>
      </div>

      {/* Live portal data: documents uploaded and approvals */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title={`Uploaded documents (${documents.length})`}>
          {documents.length === 0 ? (
            <p className="py-4 text-center text-sm text-slate-500">No documents uploaded by this client.</p>
          ) : (
            <div className="space-y-2">
              {documents.map((d) => {
                const agent = d.analyzedAgent ? getAgent(d.analyzedAgent) : null;
                return (
                  <div key={d.id} className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2 text-sm font-medium text-white">
                        <FileText className="h-4 w-4 text-slate-400" /> {d.fileName}
                      </span>
                      {d.priority !== "normal" && (
                        <span className={`text-xs uppercase ${d.priority === "urgent" ? "text-rose-300" : "text-amber-300"}`}>{d.priority}</span>
                      )}
                    </div>
                    {agent && <p className="mt-1 text-xs text-violet-300">Analyzed by {agent.name}</p>}
                    {d.recommendedAction && <p className="mt-0.5 text-xs text-slate-400">{d.recommendedAction}</p>}
                  </div>
                );
              })}
            </div>
          )}
        </Panel>

        <Panel title={`Approvals (${approvals.length})`}>
          {approvals.length === 0 ? (
            <p className="py-4 text-center text-sm text-slate-500">No approval requests for this client.</p>
          ) : (
            <div className="space-y-2">
              {approvals.map((a) => (
                <div key={a.id} className="flex items-center justify-between gap-3 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white">{a.title}</p>
                    <p className="text-xs text-slate-500">
                      {getAgent(a.agent)?.name}
                      {a.amount != null && ` · ${money(a.amount)}`}
                      {a.decidedVia && ` · via ${a.decidedVia}`}
                    </p>
                  </div>
                  {a.status === "pending" ? (
                    <span className="inline-flex flex-shrink-0 items-center gap-1 text-xs text-amber-300"><Clock className="h-3 w-3" /> pending</span>
                  ) : a.status === "approved" ? (
                    <span className="inline-flex flex-shrink-0 items-center gap-1 text-xs text-emerald-300"><CheckCircle2 className="h-3 w-3" /> approved</span>
                  ) : (
                    <span className="inline-flex flex-shrink-0 items-center gap-1 text-xs text-slate-400"><XCircle className="h-3 w-3" /> {a.status}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}

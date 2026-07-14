import Link from "next/link";
import { requireSession } from "@/lib/portal/session";
import PortalShell from "@/components/portal/shell";
import { getClient } from "@/lib/admin/mock-data";
import { caseSummary } from "@/lib/admin/reports";
import { listApprovals, listDocuments, listNotifications } from "@/lib/portal/store";
import { StatCard, PhaseBadge, ProgressBar, money, pct } from "@/components/admin/ui";
import { getAgent } from "@/lib/agents/registry";
import { AGENT_ICONS, AGENT_GRADIENTS } from "@/components/solvana/agent-grid";
import EnablePush from "@/components/portal/enable-push";
import { FileText, CheckSquare, Bell, ArrowRight, TrendingUp, TrendingDown, UploadCloud } from "lucide-react";

export default async function PortalDashboard() {
  const session = await requireSession();
  const client = getClient(session.cid);
  const [approvals, documents, notifications] = await Promise.all([
    listApprovals(session.cid),
    listDocuments(session.cid),
    listNotifications(session.cid),
  ]);
  const pending = approvals.filter((a) => a.status === "pending");

  return (
    <PortalShell session={session}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white">
              Hi {session.name.split(" ")[0]} 👋
            </h1>
            <p className="text-sm text-slate-400">
              Here&apos;s where your program stands today.
              {client && <span className="ml-2"><PhaseBadge phase={client.phase} /></span>}
            </p>
          </div>
          <Link href="/portal/documents">
            <span className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-500 to-violet-600 px-5 py-2.5 text-sm font-medium text-white">
              <UploadCloud className="h-4 w-4" /> Upload a document
            </span>
          </Link>
        </div>

        <EnablePush />

        {/* Pending approvals banner */}
        {pending.length > 0 && (
          <Link
            href="/portal/approvals"
            className="flex items-center justify-between gap-4 rounded-xl border border-amber-400/30 bg-amber-400/5 px-5 py-4 transition-colors hover:border-amber-400/50"
          >
            <div className="flex items-center gap-3">
              <CheckSquare className="h-5 w-5 text-amber-300" />
              <div>
                <p className="font-medium text-amber-100">
                  {pending.length} action{pending.length > 1 ? "s" : ""} need your approval
                </p>
                <p className="text-sm text-amber-200/70">{pending[0].title}</p>
              </div>
            </div>
            <ArrowRight className="h-5 w-5 text-amber-300" />
          </Link>
        )}

        {client ? (
          <>
            {(() => {
              const c = caseSummary(client);
              const creditUp = c.creditDelta >= 0;
              return (
                <>
                  <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                    <StatCard label="Enrolled debt" value={money(c.enrolledDebtTotal)} sub={`${client.debts.length} accounts`} accent="violet" />
                    <StatCard label="Saved so far" value={money(c.savings)} sub={c.settledDebtTotal ? `${pct(c.savingsPct)} off settled debt` : "building savings"} accent="emerald" />
                    <StatCard label="In your account" value={money(client.dedicatedAccountBalance)} sub={`${money(client.monthlyDeposit)}/mo · you control it`} accent="cyan" />
                    <StatCard label="Credit score" value={String(client.currentCreditScore)} sub={`${creditUp ? "+" : ""}${c.creditDelta} since enrolling`} accent={creditUp ? "emerald" : "amber"} />
                  </div>

                  <div className="grid gap-4 lg:grid-cols-3">
                    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5 lg:col-span-2">
                      <h3 className="mb-4 text-sm font-semibold text-white">Program progress</h3>
                      <div className="space-y-4">
                        <div>
                          <div className="mb-1 flex justify-between text-xs text-slate-400"><span>Debt resolved</span><span>{pct(c.progressPct)}</span></div>
                          <ProgressBar value={c.progressPct} />
                        </div>
                        <div>
                          <div className="mb-1 flex justify-between text-xs text-slate-400"><span>Deposit consistency</span><span>{pct(c.depositAdherence)}</span></div>
                          <ProgressBar value={c.depositAdherence} color={c.depositAdherence < 0.85 ? "amber" : "emerald"} />
                        </div>
                        <p className="rounded-lg bg-cyan-500/5 px-3 py-2 text-sm text-cyan-200">{c.nextAction}</p>
                      </div>
                    </div>

                    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
                      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
                        {creditUp ? <TrendingUp className="h-4 w-4 text-emerald-400" /> : <TrendingDown className="h-4 w-4 text-amber-400" />}
                        Credit trajectory
                      </h3>
                      <div className="flex items-center justify-between">
                        <div className="text-center"><p className="text-xs text-slate-500">Start</p><p className="text-xl font-bold text-slate-300">{client.creditScoreAtEnrollment}</p></div>
                        <div className="text-center"><p className="text-xs text-slate-500">Now</p><p className="text-xl font-bold text-white">{client.currentCreditScore}</p></div>
                      </div>
                      <p className="mt-3 text-xs leading-relaxed text-slate-500">Scores usually dip after payments stop, then recover as debts settle. We always show you the real number.</p>
                    </div>
                  </div>

                  {/* Debts snapshot */}
                  <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-white">Your accounts</h3>
                      <Link href="/portal/activity" className="inline-flex items-center gap-1 text-xs text-cyan-300 hover:text-cyan-200">Full activity <ArrowRight className="h-3 w-3" /></Link>
                    </div>
                    <div className="space-y-2">
                      {client.debts.slice(0, 5).map((d) => (
                        <div key={d.id} className="flex items-center justify-between rounded-lg bg-white/[0.02] px-4 py-2.5 text-sm">
                          <span className="font-medium text-white">{d.creditor}</span>
                          <span className="text-slate-400">
                            {d.settlementAmount ? (
                              <span className="text-emerald-300">Settled {money(d.settlementAmount)} ({pct(d.settlementPct ?? 0)})</span>
                            ) : (
                              <>{money(d.currentBalance)} · <span className="capitalize">{d.status.replace("_", " ")}</span></>
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              );
            })()}
          </>
        ) : (
          <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-8 text-center">
            <h3 className="mb-2 text-lg font-semibold text-white">Your enrollment is being set up</h3>
            <p className="mx-auto max-w-lg text-sm text-slate-300">
              Aria is finalizing your case. Upload your creditor statements and any letters you&apos;ve received —
              our AI agents will analyze them right away and tell you exactly what happens next.
            </p>
            <Link href="/portal/documents" className="mt-4 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-500 to-violet-600 px-6 py-2.5 text-sm font-medium text-white">
              <UploadCloud className="h-4 w-4" /> Upload documents
            </Link>
          </div>
        )}

        {/* Bottom grid: recent docs + agent activity + notifications */}
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-white"><FileText className="h-4 w-4 text-cyan-400" /> Recent documents</h3>
              <Link href="/portal/documents" className="text-xs text-cyan-300 hover:text-cyan-200">All</Link>
            </div>
            {documents.length === 0 ? (
              <p className="text-sm text-slate-500">No documents yet.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {documents.slice(0, 4).map((d) => (
                  <li key={d.id} className="truncate text-slate-300">
                    <span className="text-slate-500">{d.analyzedAgent ? getAgent(d.analyzedAgent)?.name : "Atlas"}:</span> {d.fileName}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
            <h3 className="mb-3 text-sm font-semibold text-white">Latest agent activity</h3>
            {client ? (
              <ul className="space-y-3">
                {client.activity.slice(0, 4).map((a) => {
                  const Icon = AGENT_ICONS[a.agent];
                  return (
                    <li key={a.id} className="flex gap-3 text-sm">
                      <span className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md bg-gradient-to-br ${AGENT_GRADIENTS[a.agent]}`}>
                        <Icon className="h-3 w-3 text-white" />
                      </span>
                      <span className="text-slate-400">{a.summary}</span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">Activity will appear as your case progresses.</p>
            )}
          </div>

          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white"><Bell className="h-4 w-4 text-cyan-400" /> Notifications</h3>
            {notifications.length === 0 ? (
              <p className="text-sm text-slate-500">You&apos;re all caught up.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {notifications.slice(0, 5).map((n) => (
                  <li key={n.id} className={n.read ? "text-slate-500" : "text-slate-300"}>
                    {n.href ? <Link href={n.href} className="hover:text-cyan-300">{n.message}</Link> : n.message}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </PortalShell>
  );
}

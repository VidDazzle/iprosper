import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@apex/db";
import type { WeeklyDigestContent } from "@apex/digest";
import { computeLedgerWithZeroFill, getRealizedUnitEconomics, suggestedMinimumPrice } from "@apex/spend";
import { loadEnv } from "@apex/config";
import { ENGINES } from "@apex/contracts";
import { getLatestHeartbeat, isHeartbeatStale, heartbeatStaleAfterMs } from "@apex/health";
import { verifyAdminSessionToken, ADMIN_SESSION_COOKIE } from "@/lib/adminAuth";
import { KillAgentButton, PromoteAgentButton, OpportunityActions } from "./AdminControls";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;

  if (!verifyAdminSessionToken(token)) {
    redirect("/admin/login");
  }

  const [ledger, recentAudit, recentLeads, agents, pendingOpportunities, latestDigest, latestHeartbeat, unitEconomicsByEngine] =
    await Promise.all([
      computeLedgerWithZeroFill(),
      prisma.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 20,
        where: { action: { in: ["kill_switch_fired", "rebalance_applied", "budget_cap_exceeded", "agent_promoted"] } },
      }),
      prisma.lead.findMany({ orderBy: { createdAt: "desc" }, take: 10 }),
      prisma.agent.findMany({ orderBy: { createdAt: "desc" } }),
      prisma.opportunityCandidate.findMany({ where: { status: "pending_review" }, orderBy: { score: "desc" } }),
      prisma.weeklyDigest.findFirst({ orderBy: { weekStart: "desc" } }),
      getLatestHeartbeat(),
      Promise.all(ENGINES.map(async (engine) => ({ engine, economics: await getRealizedUnitEconomics(engine) }))),
    ]);

  const targetMargin = loadEnv().TARGET_PROFIT_MARGIN_PERCENT;
  const digestContent = latestDigest?.content as unknown as WeeklyDigestContent | undefined;
  const heartbeatChecks = latestHeartbeat?.checks as unknown as
    | { db: { ok: boolean; latencyMs: number; error?: string }; redis: { ok: boolean; latencyMs: number; error?: string } }
    | undefined;
  const schedulerStale = isHeartbeatStale(latestHeartbeat, new Date(), heartbeatStaleAfterMs());

  return (
    <main className="min-h-screen bg-gray-50 p-8 text-black">
      <h1 className="text-2xl font-bold">APEX Ledger</h1>

      <section className="mt-4">
        <div
          className={`rounded-lg border p-4 text-sm ${
            schedulerStale ? "border-red-300 bg-red-50" : latestHeartbeat?.status === "ok" ? "border-green-300 bg-green-50" : "border-amber-300 bg-amber-50"
          }`}
        >
          <p className="font-semibold">
            {schedulerStale
              ? "⚠ Background process may be down"
              : latestHeartbeat?.status === "ok"
                ? "System heartbeat: OK"
                : "System heartbeat: degraded"}
          </p>
          {latestHeartbeat ? (
            <p className="mt-1 text-gray-600">
              Last checked {latestHeartbeat.createdAt.toISOString()}
              {heartbeatChecks && (
                <>
                  {" — "}db {heartbeatChecks.db.ok ? `ok (${heartbeatChecks.db.latencyMs}ms)` : `FAILED: ${heartbeatChecks.db.error}`}
                  {", "}redis {heartbeatChecks.redis.ok ? `ok (${heartbeatChecks.redis.latencyMs}ms)` : `FAILED: ${heartbeatChecks.redis.error}`}
                </>
              )}
              {schedulerStale && " — no heartbeat within the staleness threshold; the apex cron scheduler may have died."}
            </p>
          ) : (
            <p className="mt-1 text-gray-600">No heartbeat recorded yet — apps/apex may not be running.</p>
          )}
        </div>
      </section>

      <section className="mt-6">
        <h2 className="text-lg font-semibold">Portfolio</h2>
        <div className="mt-2 grid grid-cols-2 gap-4 md:grid-cols-5">
          <div className="rounded-lg border bg-white p-4">
            <p className="text-xs text-gray-500">Total spend</p>
            <p className="mt-1 text-xl font-semibold">${ledger.portfolio.spend.toFixed(2)}</p>
          </div>
          <div className="rounded-lg border bg-white p-4">
            <p className="text-xs text-gray-500">Total revenue</p>
            <p className="mt-1 text-xl font-semibold">${ledger.portfolio.revenue.toFixed(2)}</p>
          </div>
          <div className="rounded-lg border bg-white p-4">
            <p className="text-xs text-gray-500">Net P&amp;L</p>
            <p className={`mt-1 text-xl font-semibold ${ledger.portfolio.pnl >= 0 ? "text-green-600" : "text-red-600"}`}>
              ${ledger.portfolio.pnl.toFixed(2)}
            </p>
          </div>
          <div className="rounded-lg border bg-white p-4">
            <p className="text-xs text-gray-500">Credit allocated</p>
            <p className="mt-1 text-xl font-semibold">${ledger.portfolio.budgetAllocated.toFixed(2)}</p>
          </div>
          <div className="rounded-lg border bg-white p-4">
            <p className="text-xs text-gray-500">Credit remaining</p>
            <p className={`mt-1 text-xl font-semibold ${ledger.portfolio.creditRemaining >= 0 ? "" : "text-red-600"}`}>
              ${ledger.portfolio.creditRemaining.toFixed(2)}
            </p>
          </div>
        </div>
        <p className="mt-2 text-xs text-gray-400">
          &quot;Credit&quot; = the sum of every job&apos;s hard budgetCap — the ceiling recordCost() enforces per job, not a
          promise that any individual job is profitable. Prospecting spend on a job that never converts is expected;
          profitability is a portfolio property (spend vs. revenue in aggregate), which is what the kill-switch
          actually watches per agent.
        </p>
      </section>

      <section className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        {ledger.byEngine.map((row) => (
          <div key={row.engine} className="rounded-lg border bg-white p-4">
            <h2 className="font-semibold capitalize">{row.engine.replace("-", " ")}</h2>
            <p className="mt-1 text-sm text-gray-500">{row.jobCount} jobs</p>
            <p className="mt-2 text-sm">Spend: ${row.spend.toFixed(2)}</p>
            <p className="text-sm">Revenue: ${row.revenue.toFixed(2)}</p>
            <p className={`text-sm font-semibold ${row.pnl >= 0 ? "text-green-600" : "text-red-600"}`}>
              P&amp;L: ${row.pnl.toFixed(2)} {row.marginPercent !== null && `(${row.marginPercent.toFixed(1)}% margin)`}
            </p>
            {row.roiPercent !== null && <p className="text-xs text-gray-500">ROI: {row.roiPercent.toFixed(1)}%</p>}
            <p className="mt-1 text-xs text-gray-500">
              Credit: ${row.spend.toFixed(2)} used of ${row.budgetAllocated.toFixed(2)} (${row.creditRemaining.toFixed(2)} left)
            </p>
          </div>
        ))}
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Unit Economics &amp; Suggested Pricing</h2>
        <p className="mt-1 text-xs text-gray-400">
          Computed only from real closed deals — never a candidate&apos;s own revenue projection. Shown once there are
          enough closes to trust the number (currently {loadEnv().UNIT_ECONOMICS_MIN_SAMPLE}+). &quot;Suggested minimum
          price&quot; targets a {targetMargin}% margin over the real blended cost of acquiring a customer, including
          money spent on prospects who never converted.
        </p>
        <div className="mt-2 grid grid-cols-1 gap-4 md:grid-cols-3">
          {unitEconomicsByEngine.map(({ engine, economics }) => (
            <div key={engine} className="rounded-lg border bg-white p-4">
              <h3 className="font-semibold capitalize">{engine.replace("-", " ")}</h3>
              {economics.eligible && economics.avgCostPerClose !== null && economics.avgRevenuePerClose !== null ? (
                <>
                  <p className="mt-1 text-sm text-gray-500">{economics.closedDealCount} closed deals</p>
                  <p className="mt-2 text-sm">Real avg. cost per close: ${economics.avgCostPerClose.toFixed(2)}</p>
                  <p className="text-sm">Real avg. revenue per close: ${economics.avgRevenuePerClose.toFixed(2)}</p>
                  <p className="text-sm">
                    Realized margin: {economics.realizedMarginPercent === null ? "—" : `${economics.realizedMarginPercent.toFixed(1)}%`}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-blue-700">
                    Suggested minimum price: ${suggestedMinimumPrice(economics.avgCostPerClose, targetMargin).toFixed(2)}
                  </p>
                </>
              ) : (
                <p className="mt-2 text-sm text-gray-400">
                  Not enough closed deals yet ({economics.closedDealCount} of {loadEnv().UNIT_ECONOMICS_MIN_SAMPLE} needed).
                </p>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Agents</h2>
        <table className="mt-2 w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500">
              <th className="pb-2">Agent</th>
              <th className="pb-2">Engine</th>
              <th className="pb-2">Status</th>
              <th className="pb-2">Trial Runs</th>
              <th className="pb-2">Credit</th>
              <th className="pb-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {agents.map((a) => {
              const ledgerRow = ledger.byAgent.find((row) => row.engine === a.engine && row.agentId === a.id);
              return (
                <tr key={a.id} className="border-t">
                  <td className="py-2">{a.id}</td>
                  <td className="py-2">{a.engine}</td>
                  <td className="py-2">{a.status}</td>
                  <td className="py-2">
                    {a.trialRunsCompleted}/{a.trialRunsRequired}
                  </td>
                  <td className="py-2 text-xs text-gray-500">
                    {ledgerRow
                      ? `$${ledgerRow.spend.toFixed(2)} of $${ledgerRow.budgetAllocated.toFixed(2)} (${ledgerRow.pnl >= 0 ? "+" : ""}$${ledgerRow.pnl.toFixed(2)} P&L)`
                      : "—"}
                  </td>
                  <td className="py-2">
                    {a.status !== "killed" && (
                      <>
                        <KillAgentButton agentId={a.id} />
                        {a.status === "trial" && <PromoteAgentButton agentId={a.id} />}
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
            {agents.length === 0 && (
              <tr>
                <td colSpan={6} className="py-2 text-gray-400">
                  No agents yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Pending Scout Opportunities</h2>
        <table className="mt-2 w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500">
              <th className="pb-2">Name</th>
              <th className="pb-2">Category</th>
              <th className="pb-2">Score</th>
              <th className="pb-2">Confidence</th>
              <th className="pb-2">Est. Revenue/mo</th>
              <th className="pb-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pendingOpportunities.map((o) => (
              <tr key={o.id} className="border-t align-top">
                <td className="py-2">{o.name}</td>
                <td className="py-2">{o.category}</td>
                <td className="py-2">{Number(o.score).toFixed(2)}</td>
                <td className="py-2">{o.confidence}</td>
                <td className="py-2">${Number(o.estRevenueMonthly).toFixed(2)}</td>
                <td className="py-2">
                  <OpportunityActions candidateId={o.id} />
                </td>
              </tr>
            ))}
            {pendingOpportunities.length === 0 && (
              <tr>
                <td colSpan={6} className="py-2 text-gray-400">
                  No pending opportunities.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Latest Weekly Digest</h2>
        {digestContent ? (
          <div className="mt-2 rounded-lg border bg-white p-4 text-sm">
            <p className="text-gray-500">
              Week of {new Date(digestContent.weekStart).toDateString()} – {new Date(digestContent.weekEnd).toDateString()}
              {latestDigest && !latestDigest.delivered && (
                <span className="ml-2 text-xs text-amber-600">(not yet delivered)</span>
              )}
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-4">
              <p>Previews: {digestContent.previewsGenerated}</p>
              <p>Leads: {digestContent.leadsCaptured}</p>
              <p>Consent rate: {(digestContent.consentRate * 100).toFixed(1)}%</p>
              <p>Closes: {digestContent.closes}</p>
              <p>Total spend: ${digestContent.totalSpend.toFixed(2)}</p>
              <p>Total revenue: ${digestContent.totalRevenue.toFixed(2)}</p>
              <p>Cost/close: {digestContent.costPerClose === null ? "—" : `$${digestContent.costPerClose.toFixed(2)}`}</p>
            </div>
            <div className="mt-3">
              <h3 className="font-semibold">ROI per engine</h3>
              <ul className="mt-1 space-y-0.5">
                {digestContent.roiPerEngine.map((r) => (
                  <li key={r.engine}>
                    {r.engine}: spend ${r.spend.toFixed(2)}, revenue ${r.revenue.toFixed(2)}, ROI {(r.roi * 100).toFixed(1)}%
                  </li>
                ))}
              </ul>
            </div>
            <div className="mt-3">
              <h3 className="font-semibold">Engine status</h3>
              <ul className="mt-1 space-y-0.5">
                {digestContent.engineStatus.map((s) => (
                  <li key={s.engine}>
                    {s.engine}: {s.status}
                  </li>
                ))}
              </ul>
            </div>
            {digestContent.killSwitchEvents.length > 0 && (
              <div className="mt-3">
                <h3 className="font-semibold">Kill-switch events</h3>
                <ul className="mt-1 space-y-0.5">
                  {digestContent.killSwitchEvents.map((e, i) => (
                    <li key={i}>
                      {e.agentId ?? "—"} at {new Date(e.firedAt).toISOString()}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <p className="mt-2 text-gray-400">No digest generated yet.</p>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Recent Kill-Switch / Rebalance / Budget Events</h2>
        <ul className="mt-2 space-y-1 text-sm">
          {recentAudit.map((entry) => (
            <li key={entry.id} className="border-t py-2">
              <span className="font-mono text-xs text-gray-400">{entry.createdAt.toISOString()}</span>{" "}
              <span className="font-semibold">{entry.action}</span> — {entry.target ?? "—"}
            </li>
          ))}
          {recentAudit.length === 0 && <li className="text-gray-400">No events yet.</li>}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Recent Leads</h2>
        <ul className="mt-2 space-y-1 text-sm">
          {recentLeads.map((lead) => (
            <li key={lead.id} className="border-t py-2">
              {lead.name} — {lead.email} — <span className="text-gray-500">{lead.status}</span>
            </li>
          ))}
          {recentLeads.length === 0 && <li className="text-gray-400">No leads yet.</li>}
        </ul>
      </section>
    </main>
  );
}

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@apex/db";
import { verifyAdminSessionToken, ADMIN_SESSION_COOKIE } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;

  if (!verifyAdminSessionToken(token)) {
    redirect("/admin/login");
  }

  const [engineTotals, recentAudit, recentLeads, agents] = await Promise.all([
    prisma.dispatchJob.groupBy({
      by: ["engine"],
      _sum: { costToDate: true, revenueAttributed: true },
      _count: { _all: true },
    }),
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      where: { action: { in: ["kill_switch_fired", "rebalance_applied", "budget_cap_exceeded", "agent_promoted"] } },
    }),
    prisma.lead.findMany({ orderBy: { createdAt: "desc" }, take: 10 }),
    prisma.agent.findMany({ orderBy: { createdAt: "desc" } }),
  ]);

  return (
    <main className="min-h-screen bg-gray-50 p-8 text-black">
      <h1 className="text-2xl font-bold">APEX Ledger</h1>

      <section className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        {engineTotals.map((row) => {
          const spend = Number(row._sum.costToDate ?? 0);
          const revenue = Number(row._sum.revenueAttributed ?? 0);
          return (
            <div key={row.engine} className="rounded-lg border bg-white p-4">
              <h2 className="font-semibold capitalize">{row.engine.replace("-", " ")}</h2>
              <p className="mt-1 text-sm text-gray-500">{row._count._all} jobs</p>
              <p className="mt-2 text-sm">Spend: ${spend.toFixed(2)}</p>
              <p className="text-sm">Revenue: ${revenue.toFixed(2)}</p>
              <p className={`text-sm font-semibold ${revenue - spend >= 0 ? "text-green-600" : "text-red-600"}`}>
                P&amp;L: ${(revenue - spend).toFixed(2)}
              </p>
            </div>
          );
        })}
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
            </tr>
          </thead>
          <tbody>
            {agents.map((a) => (
              <tr key={a.id} className="border-t">
                <td className="py-2">{a.id}</td>
                <td className="py-2">{a.engine}</td>
                <td className="py-2">{a.status}</td>
                <td className="py-2">
                  {a.trialRunsCompleted}/{a.trialRunsRequired}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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

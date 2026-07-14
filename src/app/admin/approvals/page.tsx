import Link from "next/link";
import { Panel, StatCard, money } from "@/components/admin/ui";
import { listAllApprovals } from "@/lib/portal/store";
import { getClient } from "@/lib/admin/mock-data";
import { getAgent } from "@/lib/agents/registry";
import { AGENT_ICONS, AGENT_GRADIENTS } from "@/components/solvana/agent-grid";
import { Mail, MessageSquare, Bell, CheckCircle2, XCircle, Clock } from "lucide-react";

export const dynamic = "force-dynamic";

const CHANNEL_ICON: Record<string, typeof Mail> = { email: Mail, sms: MessageSquare, "in-app": Bell };

const STATUS_STYLE: Record<string, string> = {
  pending: "border-amber-400/30 bg-amber-400/5",
  approved: "border-emerald-400/20 bg-emerald-400/5",
  rejected: "border-white/10 bg-white/[0.02]",
  expired: "border-white/10 bg-white/[0.02]",
};

export default async function AdminApprovalsPage() {
  const approvals = await listAllApprovals();
  const pending = approvals.filter((a) => a.status === "pending");
  const decided = approvals.filter((a) => a.status !== "pending");
  const approvedValue = approvals
    .filter((a) => a.status === "approved")
    .reduce((s, a) => s + (a.amount ?? 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Approvals</h1>
        <p className="text-sm text-slate-400">Live client decisions across every case — the same requests clients see in their portal.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Awaiting client" value={String(pending.length)} sub="pending decisions" accent="amber" />
        <StatCard label="Approved" value={String(approvals.filter((a) => a.status === "approved").length)} accent="emerald" />
        <StatCard label="Declined" value={String(approvals.filter((a) => a.status === "rejected").length)} accent="rose" />
        <StatCard label="Approved settlement value" value={money(approvedValue)} sub="client-authorized" accent="cyan" />
      </div>

      {approvals.length === 0 && (
        <p className="rounded-xl border border-white/10 bg-white/[0.02] p-8 text-center text-sm text-slate-500">
          No approval requests yet. They appear here as agents create them (e.g. a client uploads a settlement letter).
        </p>
      )}

      {pending.length > 0 && (
        <Panel title={`Awaiting client decision (${pending.length})`}>
          <div className="space-y-3">
            {pending.map((a) => {
              const client = getClient(a.clientId);
              const agent = getAgent(a.agent);
              const Icon = AGENT_ICONS[a.agent];
              return (
                <div key={a.id} className={`rounded-lg border p-4 ${STATUS_STYLE[a.status]}`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex gap-3">
                      <span className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${AGENT_GRADIENTS[a.agent]}`}>
                        <Icon className="h-4 w-4 text-white" />
                      </span>
                      <div>
                        <p className="font-medium text-white">{a.title}</p>
                        <p className="text-xs text-slate-400">
                          {agent?.name} ·{" "}
                          <Link href={`/admin/clients/${a.clientId}`} className="text-cyan-300 hover:text-cyan-200">
                            {client?.name ?? a.clientId}
                          </Link>
                          {a.creditor && ` · ${a.creditor}`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      {a.amount != null && <p className="font-semibold text-amber-200">{money(a.amount)}</p>}
                      <span className="inline-flex items-center gap-1 text-xs text-amber-300"><Clock className="h-3 w-3" /> pending</span>
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-slate-400">{a.detail}</p>
                  {a.channelsSent.length > 0 && (
                    <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
                      <span>Sent via:</span>
                      {a.channelsSent.map((ch) => {
                        const CIcon = CHANNEL_ICON[ch] ?? Bell;
                        return <span key={ch} className="inline-flex items-center gap-1 capitalize"><CIcon className="h-3 w-3" /> {ch}</span>;
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Panel>
      )}

      {decided.length > 0 && (
        <Panel title="Decision history">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="pb-2 font-medium">Request</th>
                  <th className="pb-2 font-medium">Client</th>
                  <th className="pb-2 font-medium">Amount</th>
                  <th className="pb-2 font-medium">Decision</th>
                  <th className="pb-2 font-medium">Via</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {decided.map((a) => {
                  const client = getClient(a.clientId);
                  return (
                    <tr key={a.id}>
                      <td className="py-2.5 text-white">{a.title}</td>
                      <td className="py-2.5">
                        <Link href={`/admin/clients/${a.clientId}`} className="text-cyan-300 hover:text-cyan-200">{client?.name ?? a.clientId}</Link>
                      </td>
                      <td className="py-2.5 text-slate-300">{a.amount != null ? money(a.amount) : "—"}</td>
                      <td className="py-2.5">
                        {a.status === "approved" ? (
                          <span className="inline-flex items-center gap-1 text-emerald-300"><CheckCircle2 className="h-4 w-4" /> Approved</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-slate-400"><XCircle className="h-4 w-4" /> {a.status}</span>
                        )}
                      </td>
                      <td className="py-2.5 capitalize text-slate-400">{a.decidedVia ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
    </div>
  );
}

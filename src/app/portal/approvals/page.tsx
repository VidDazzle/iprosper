import { requireSession } from "@/lib/portal/session";
import PortalShell from "@/components/portal/shell";
import ApprovalActions from "@/components/portal/approval-actions";
import { listApprovals } from "@/lib/portal/store";
import { getAgent } from "@/lib/agents/registry";
import { AGENT_ICONS, AGENT_GRADIENTS } from "@/components/solvana/agent-grid";
import { money } from "@/components/admin/ui";
import { Mail, MessageSquare, Bell, CheckCircle2, XCircle } from "lucide-react";

export default async function ApprovalsPage() {
  const session = await requireSession();
  const approvals = await listApprovals(session.cid);
  const pending = approvals.filter((a) => a.status === "pending");
  const decided = approvals.filter((a) => a.status !== "pending");

  const channelIcon: Record<string, typeof Mail> = { email: Mail, sms: MessageSquare, "in-app": Bell };

  return (
    <PortalShell session={session}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Approvals</h1>
          <p className="text-sm text-slate-400">
            Nothing moves without your say-so. Approve or decline here, or use the one-click links we send by
            email and text.
          </p>
        </div>

        {pending.length === 0 && decided.length === 0 && (
          <p className="rounded-xl border border-white/10 bg-white/[0.02] p-8 text-center text-sm text-slate-500">
            No approvals right now. When an agent needs your decision — like accepting a settlement offer — it&apos;ll show up here.
          </p>
        )}

        {pending.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-amber-300">Awaiting your decision</h2>
            {pending.map((a) => {
              const agent = getAgent(a.agent);
              const Icon = AGENT_ICONS[a.agent];
              return (
                <div key={a.id} className="rounded-xl border border-amber-400/30 bg-amber-400/5 p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex gap-3">
                      <span className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${AGENT_GRADIENTS[a.agent]}`}>
                        <Icon className="h-5 w-5 text-white" />
                      </span>
                      <div>
                        <h3 className="font-semibold text-white">{a.title}</h3>
                        <p className="text-xs text-slate-400">Requested by {agent?.name}</p>
                        {a.amount != null && (
                          <p className="mt-1 text-sm text-amber-200">Settlement amount: {money(a.amount)}</p>
                        )}
                      </div>
                    </div>
                    <ApprovalActions id={a.id} />
                  </div>
                  <p className="mt-4 text-sm leading-relaxed text-slate-300">{a.detail}</p>
                  {a.channelsSent.length > 0 && (
                    <div className="mt-3 flex items-center gap-3 text-xs text-slate-500">
                      <span>Sent to you via:</span>
                      {a.channelsSent.map((ch) => {
                        const CIcon = channelIcon[ch] ?? Bell;
                        return (
                          <span key={ch} className="inline-flex items-center gap-1 capitalize">
                            <CIcon className="h-3 w-3" /> {ch}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {decided.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">History</h2>
            {decided.map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] px-5 py-4">
                <div className="flex items-center gap-3">
                  {a.status === "approved" ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  ) : (
                    <XCircle className="h-5 w-5 text-slate-500" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-white">{a.title}</p>
                    <p className="text-xs text-slate-500">
                      {a.status === "approved" ? "Approved" : "Declined"}
                      {a.decidedVia && ` via ${a.decidedVia}`}
                      {a.decidedAt && ` · ${new Date(a.decidedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}
                    </p>
                  </div>
                </div>
                {a.amount != null && <span className="text-sm text-slate-400">{money(a.amount)}</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </PortalShell>
  );
}

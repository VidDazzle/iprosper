import { requireSession } from "@/lib/portal/session";
import PortalShell from "@/components/portal/shell";
import { getClient } from "@/lib/admin/mock-data";
import { getAgent } from "@/lib/agents/registry";
import { AGENT_ICONS, AGENT_GRADIENTS } from "@/components/solvana/agent-grid";
import { DebtStatusBadge, money, pct } from "@/components/admin/ui";
import { PhoneCall, Mail, MessageSquare, Cpu } from "lucide-react";

const CHANNEL_ICON = { voice: PhoneCall, email: Mail, sms: MessageSquare, internal: Cpu };

export default async function ActivityPage() {
  const session = await requireSession();
  const client = getClient(session.cid);

  return (
    <PortalShell session={session}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Case Activity</h1>
          <p className="text-sm text-slate-400">Every action our AI agents have taken on your account — nothing hidden.</p>
        </div>

        {!client ? (
          <p className="rounded-xl border border-white/10 bg-white/[0.02] p-8 text-center text-sm text-slate-500">
            Your case activity will appear here once your enrollment is complete.
          </p>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Accounts */}
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
              <h2 className="mb-4 text-sm font-semibold text-white">Your enrolled accounts</h2>
              <div className="space-y-2">
                {client.debts.map((d) => (
                  <div key={d.id} className="rounded-lg bg-white/[0.02] p-3">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-white">{d.creditor}</span>
                      <DebtStatusBadge status={d.status} />
                    </div>
                    <div className="mt-1 flex justify-between text-xs text-slate-400">
                      <span>Balance {money(d.currentBalance)}</span>
                      {d.settlementAmount && <span className="text-emerald-300">Settled for {money(d.settlementAmount)} ({pct(d.settlementPct ?? 0)})</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Agent timeline */}
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
              <h2 className="mb-4 text-sm font-semibold text-white">Agent activity log</h2>
              <ol className="relative space-y-4 border-l border-white/10 pl-6">
                {client.activity.map((a) => {
                  const agent = getAgent(a.agent);
                  const Icon = AGENT_ICONS[a.agent];
                  const ChannelIcon = CHANNEL_ICON[a.channel];
                  return (
                    <li key={a.id} className="relative">
                      <span className={`absolute -left-[31px] flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br ${AGENT_GRADIENTS[a.agent]}`}>
                        <Icon className="h-3 w-3 text-white" />
                      </span>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium text-white">{agent?.name}</span>
                        <span className="inline-flex items-center gap-1 text-xs text-slate-500"><ChannelIcon className="h-3 w-3" /> {a.channel}</span>
                        <span className="text-xs text-slate-600">{new Date(a.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                        {a.complianceScreened && <span className="text-[10px] text-emerald-500">✓ compliance-screened</span>}
                      </div>
                      <p className="mt-0.5 text-sm text-slate-400">{a.summary}</p>
                    </li>
                  );
                })}
              </ol>
            </div>
          </div>
        )}
      </div>
    </PortalShell>
  );
}

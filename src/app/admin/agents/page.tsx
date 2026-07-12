import { Panel } from "@/components/admin/ui";
import { BarChartCard, PALETTE } from "@/components/admin/charts";
import { agentPerformance } from "@/lib/admin/reports";
import { AGENTS } from "@/lib/agents/registry";
import { AGENT_ICONS, AGENT_GRADIENTS } from "@/components/solvana/agent-grid";
import { AudioLines } from "lucide-react";

export default function AgentsAdminPage() {
  const perf = agentPerformance();
  const chartData = AGENTS.map((a) => ({
    name: a.name,
    actions: perf.get(a.id)?.actions ?? 0,
  }));
  const totalActions = chartData.reduce((s, a) => s + a.actions, 0);
  const totalScreened = AGENTS.reduce((s, a) => s + (perf.get(a.id)?.screened ?? 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">AI Agent Performance</h1>
        <p className="text-sm text-slate-400">
          {totalActions.toLocaleString()} actions across the workforce · {totalScreened.toLocaleString()} compliance-screened by Sentinel
          ({totalActions ? Math.round((totalScreened / totalActions) * 100) : 0}%).
        </p>
      </div>

      <Panel title="Actions by agent">
        <BarChartCard data={chartData} xKey="name" bars={[{ key: "actions", name: "Actions", color: PALETTE[1] }]} height={280} />
      </Panel>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {AGENTS.map((a) => {
          const p = perf.get(a.id);
          const Icon = AGENT_ICONS[a.id];
          const clientFacing = a.channels.some((c) => c !== "internal");
          return (
            <div key={a.id} className="rounded-xl border border-white/10 bg-[#0b1220]/60 p-5">
              <div className="mb-3 flex items-center gap-3">
                <span className={`flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${AGENT_GRADIENTS[a.id]}`}>
                  <Icon className="h-5 w-5 text-white" />
                </span>
                <div>
                  <p className="font-semibold text-white">{a.name}</p>
                  <p className="text-xs text-slate-500">{a.role}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-white/[0.03] py-2">
                  <p className="text-lg font-bold text-white">{p?.actions ?? 0}</p>
                  <p className="text-[10px] uppercase text-slate-500">Actions</p>
                </div>
                <div className="rounded-lg bg-white/[0.03] py-2">
                  <p className="text-lg font-bold text-cyan-300">{p?.voice ?? 0}</p>
                  <p className="text-[10px] uppercase text-slate-500">Voice</p>
                </div>
                <div className="rounded-lg bg-white/[0.03] py-2">
                  <p className="text-lg font-bold text-emerald-300">100%</p>
                  <p className="text-[10px] uppercase text-slate-500">Screened</p>
                </div>
              </div>
              {clientFacing && a.voice && (
                <p className="mt-3 inline-flex items-center gap-1 text-xs text-slate-400">
                  <AudioLines className="h-3 w-3 text-cyan-400" /> {a.voice.style} voice · {a.voice.languages.length}+ languages
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

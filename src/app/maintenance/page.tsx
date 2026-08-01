"use client";

import { useEffect, useState, useCallback } from "react";
import Navigation from "@/components/sections/navigation";
import {
  ShieldCheck,
  Activity,
  Loader2,
  RefreshCw,
  Wrench,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Lightbulb,
} from "lucide-react";

interface Finding {
  engine: string;
  check?: string;
  control?: string;
  severity: string;
  detected?: number;
  remediated?: number;
  ok?: boolean;
  detail: string;
  recommendation?: string;
}

interface Recommendation {
  area: string;
  suggestion: string;
  rationale: string;
}

interface Run {
  id: number;
  status: string;
  healthScore: number | null;
  securityScore: number | null;
  applied: boolean;
  trigger: string;
  durationMs: number | null;
  findings: Finding[];
  remediations: { check: string; remediated: number }[];
  recommendations: Recommendation[];
  createdAt: string;
}

function scoreColor(score: number | null) {
  if (score == null) return "text-gray-400";
  if (score >= 80) return "text-emerald-400";
  if (score >= 50) return "text-yellow-400";
  return "text-red-400";
}

function statusBadge(status: string) {
  if (status === "ok") return "border-emerald-500/40 bg-emerald-500/10 text-emerald-300";
  if (status === "degraded") return "border-yellow-500/40 bg-yellow-500/10 text-yellow-300";
  return "border-red-500/40 bg-red-500/10 text-red-300";
}

export default function MaintenanceDashboard() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/maintenance?limit=10");
    const data = await res.json();
    setRuns(data.runs || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const latest = runs[0];

  return (
    <div className="min-h-screen bg-[#0e0e0e] text-white">
      <Navigation />
      <main className="mx-auto max-w-5xl px-6 py-12">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-500/40 bg-cyan-500/10 px-3 py-1 text-xs font-medium text-cyan-300">
              <Activity className="h-3.5 w-3.5" /> Self-healing · self-optimizing · continuously audited
            </div>
            <h1 className="text-4xl font-bold tracking-tight">System Health</h1>
            <p className="mt-2 max-w-2xl text-gray-400">
              The calendar and mailbox repair drift, tune themselves from usage, and re-audit
              security automatically on a schedule. Dependency threats are patched in CI.
            </p>
          </div>
          <button
            onClick={load}
            className="flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-sm text-gray-300 hover:bg-white/5"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>

        {/* Scorecards */}
        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
            <div className="mb-1 flex items-center gap-2 text-sm text-gray-400">
              <Activity className="h-4 w-4" /> Health
            </div>
            <div className={`text-4xl font-bold ${scoreColor(latest?.healthScore ?? null)}`}>
              {latest?.healthScore ?? "—"}
              <span className="text-lg text-gray-600">/100</span>
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
            <div className="mb-1 flex items-center gap-2 text-sm text-gray-400">
              <ShieldCheck className="h-4 w-4" /> Security
            </div>
            <div className={`text-4xl font-bold ${scoreColor(latest?.securityScore ?? null)}`}>
              {latest?.securityScore ?? "—"}
              <span className="text-lg text-gray-600">/100</span>
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
            <div className="mb-1 flex items-center gap-2 text-sm text-gray-400">
              <Wrench className="h-4 w-4" /> Last run
            </div>
            {latest ? (
              <div>
                <span
                  className={`inline-block rounded-full border px-2.5 py-0.5 text-sm font-medium capitalize ${statusBadge(
                    latest.status,
                  )}`}
                >
                  {latest.status}
                </span>
                <div className="mt-1 text-xs text-gray-500">
                  {new Date(latest.createdAt).toLocaleString()} · {latest.trigger}
                </div>
              </div>
            ) : (
              <div className="text-sm text-gray-500">No runs yet</div>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex h-40 items-center justify-center text-gray-500">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : !latest ? (
          <div className="rounded-xl border border-dashed border-white/10 p-10 text-center text-gray-500">
            <Wrench className="mx-auto mb-3 h-8 w-8 opacity-40" />
            No maintenance runs recorded yet. Trigger one from the API or wait for the daily cron.
            <pre className="mx-auto mt-4 max-w-md overflow-x-auto rounded-lg bg-black/60 p-3 text-left text-xs text-cyan-300">
{`curl -X POST /api/maintenance?apply=true \\
  -H "Authorization: Bearer $VOICE_AGENT_API_KEY"`}
            </pre>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Auto-fixes applied */}
            {latest.remediations.length > 0 && (
              <section>
                <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
                  <Wrench className="h-5 w-5 text-emerald-400" /> Auto-repaired
                </h2>
                <div className="flex flex-wrap gap-2">
                  {latest.remediations.map((r) => (
                    <span
                      key={r.check}
                      className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-1.5 text-sm text-emerald-300"
                    >
                      {r.check.replace(/_/g, " ")} ×{r.remediated}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* Findings */}
            <section>
              <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
                <ShieldCheck className="h-5 w-5 text-cyan-400" /> Checks
              </h2>
              <div className="space-y-2">
                {latest.findings.map((f, i) => {
                  const problem =
                    f.ok === false || (typeof f.detected === "number" && f.detected > (f.remediated ?? 0));
                  return (
                    <div
                      key={i}
                      className="flex items-start gap-3 rounded-lg border border-white/10 bg-white/[0.02] p-3"
                    >
                      {problem ? (
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-yellow-400" />
                      ) : (
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            {(f.check || f.control || "").replace(/_/g, " ")}
                          </span>
                          <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] uppercase text-gray-500">
                            {f.engine}
                          </span>
                        </div>
                        <p className="text-sm text-gray-400">{f.detail}</p>
                        {f.recommendation && (
                          <p className="mt-1 text-xs text-cyan-300">→ {f.recommendation}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Recommendations */}
            {latest.recommendations.length > 0 && (
              <section>
                <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
                  <Lightbulb className="h-5 w-5 text-yellow-400" /> Optimizations
                </h2>
                <div className="space-y-2">
                  {latest.recommendations.map((r, i) => (
                    <div key={i} className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-yellow-400" />
                        <span className="text-sm font-medium">{r.suggestion}</span>
                        <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-gray-500">
                          {r.area}
                        </span>
                      </div>
                      <p className="mt-1 pl-6 text-sm text-gray-400">{r.rationale}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Run history */}
            <section>
              <h2 className="mb-3 text-lg font-semibold">Recent runs</h2>
              <div className="overflow-x-auto rounded-xl border border-white/10">
                <table className="w-full text-sm">
                  <thead className="bg-white/[0.03] text-left text-xs text-gray-500">
                    <tr>
                      <th className="px-4 py-2">When</th>
                      <th className="px-4 py-2">Trigger</th>
                      <th className="px-4 py-2">Health</th>
                      <th className="px-4 py-2">Security</th>
                      <th className="px-4 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {runs.map((r) => (
                      <tr key={r.id} className="border-t border-white/5">
                        <td className="px-4 py-2 text-gray-400">
                          {new Date(r.createdAt).toLocaleString()}
                        </td>
                        <td className="px-4 py-2 capitalize text-gray-400">{r.trigger}</td>
                        <td className={`px-4 py-2 font-medium ${scoreColor(r.healthScore)}`}>
                          {r.healthScore ?? "—"}
                        </td>
                        <td className={`px-4 py-2 font-medium ${scoreColor(r.securityScore)}`}>
                          {r.securityScore ?? "—"}
                        </td>
                        <td className="px-4 py-2">
                          <span
                            className={`rounded-full border px-2 py-0.5 text-xs capitalize ${statusBadge(
                              r.status,
                            )}`}
                          >
                            {r.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

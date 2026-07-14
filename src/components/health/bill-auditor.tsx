"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Plus, Trash2, Search, AlertTriangle, TriangleAlert, Info, PiggyBank, ClipboardCopy, Check, Scale } from "lucide-react";
import { usd } from "@/lib/health/audit";

type Severity = "high" | "medium" | "info";
interface Flag { id: string; severity: Severity; title: string; detail: string; lines: string[]; amount?: number }
interface Report {
  lineCount: number; totalCharged: number; flags: Flag[];
  estimatedSavings: { low: number; high: number }; amountToQuestion: number;
  rights: string[]; nextSteps: string[]; disputeSummary: string; disclaimer: string;
}

const uid = () => Math.random().toString(36).slice(2, 8);
const blank = () => ({ id: uid(), code: "", description: "", units: "1", charge: "" });
const inputCls = "h-9 border-white/15 bg-[#03040a] text-white placeholder:text-slate-600";

const SEV: Record<Severity, { icon: React.ComponentType<{ className?: string }>; ring: string; text: string; label: string }> = {
  high: { icon: TriangleAlert, ring: "border-rose-400/30 bg-rose-400/5", text: "text-rose-300", label: "High" },
  medium: { icon: AlertTriangle, ring: "border-amber-400/30 bg-amber-400/5", text: "text-amber-300", label: "Review" },
  info: { icon: Info, ring: "border-sky-400/30 bg-sky-400/5", text: "text-sky-300", label: "Info" },
};

export default function HealthBillAuditor() {
  const [rows, setRows] = useState(() => [blank(), blank(), blank()]);
  const [emergency, setEmergency] = useState(false);
  const [outOfNetwork, setOutOfNetwork] = useState(false);
  const [uninsured, setUninsured] = useState(false);
  const [eob, setEob] = useState("");
  const [state, setState] = useState<"idle" | "working" | "done" | "error">("idle");
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  function set(id: string, field: string, v: string) {
    setRows((c) => c.map((r) => (r.id === id ? { ...r, [field]: v } : r)));
  }

  async function run() {
    const lines = rows
      .filter((r) => r.description.trim() && r.charge !== "")
      .map((r) => ({ code: r.code.trim() || undefined, description: r.description.trim(), units: Number(r.units) || 1, charge: Number(r.charge) || 0 }));
    if (!lines.length) { setError("Add at least one line with a description and a charge."); return; }
    setState("working"); setError(""); setReport(null); setCopied(false);
    try {
      const res = await fetch("/api/health/audit", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lines, context: { emergency, outOfNetwork, uninsured, eobPatientResponsibility: eob === "" ? undefined : Number(eob) } }),
      });
      const data = await res.json();
      if (res.ok) { setReport(data.report); setState("done"); }
      else { setError(data.error ?? "Audit failed."); setState("error"); }
    } catch { setError("Network error."); setState("error"); }
  }

  async function copySummary() {
    if (!report) return;
    try { await navigator.clipboard.writeText(report.disputeSummary); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* clipboard unavailable */ }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <h3 className="text-lg font-semibold text-white">Itemized bill auditor</h3>
        <p className="mt-1 text-sm text-slate-400">
          Enter each line from your itemized bill. We flag likely errors, estimate what&apos;s worth questioning, and draft a
          dispute letter you can send. It&apos;s free, and nothing is stored.
        </p>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="pb-2 pr-2 font-medium">Code <span className="normal-case text-slate-600">(opt.)</span></th>
                <th className="pb-2 px-2 font-medium">Description</th>
                <th className="pb-2 px-2 font-medium">Qty</th>
                <th className="pb-2 px-2 font-medium">Charge</th>
                <th className="pb-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="py-2 pr-2"><Input value={r.code} onChange={(e) => set(r.id, "code", e.target.value)} placeholder="CPT" className={`${inputCls} w-24`} /></td>
                  <td className="px-2 py-2"><Input value={r.description} onChange={(e) => set(r.id, "description", e.target.value)} placeholder="e.g. Comprehensive metabolic panel" className={`${inputCls} w-full min-w-[180px]`} /></td>
                  <td className="px-2 py-2"><Input type="number" value={r.units} onChange={(e) => set(r.id, "units", e.target.value)} className={`${inputCls} w-16`} /></td>
                  <td className="px-2 py-2"><Input type="number" value={r.charge} onChange={(e) => set(r.id, "charge", e.target.value)} placeholder="0" className={`${inputCls} w-28`} /></td>
                  <td className="py-2 pl-1">{rows.length > 1 && <button onClick={() => setRows((c) => c.filter((x) => x.id !== r.id))} className="text-slate-500 hover:text-rose-300"><Trash2 className="h-3.5 w-3.5" /></button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <button onClick={() => setRows((c) => [...c, blank()])} className="mt-3 inline-flex items-center gap-1.5 text-sm text-cyan-300 hover:text-cyan-200"><Plus className="h-4 w-4" /> Add a line</button>

        <div className="mt-5 grid gap-4 border-t border-white/5 pt-5 sm:grid-cols-2">
          <div>
            <Label className="mb-1.5 block text-sm text-slate-300">Your EOB &quot;patient responsibility&quot; (optional)</Label>
            <Input type="number" value={eob} onChange={(e) => setEob(e.target.value)} placeholder="What your insurer says you owe" className={`${inputCls} max-w-xs`} />
          </div>
          <div className="flex flex-wrap items-end gap-4 text-sm text-slate-300">
            <label className="inline-flex items-center gap-2"><input type="checkbox" checked={emergency} onChange={(e) => setEmergency(e.target.checked)} className="accent-cyan-500" /> Emergency care</label>
            <label className="inline-flex items-center gap-2"><input type="checkbox" checked={outOfNetwork} onChange={(e) => setOutOfNetwork(e.target.checked)} className="accent-cyan-500" /> Out-of-network</label>
            <label className="inline-flex items-center gap-2"><input type="checkbox" checked={uninsured} onChange={(e) => setUninsured(e.target.checked)} className="accent-cyan-500" /> Uninsured / self-pay</label>
          </div>
        </div>

        {error && <p className="mt-3 text-sm text-rose-400">{error}</p>}

        <div className="mt-5">
          <Button onClick={run} disabled={state === "working"} className="h-11 rounded-full bg-gradient-to-r from-cyan-500 to-violet-600 px-8 text-white hover:from-cyan-400 hover:to-violet-500">
            {state === "working" ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Auditing…</> : <><Search className="mr-2 h-4 w-4" /> Audit my bill</>}
          </Button>
        </div>
      </div>

      {state === "done" && report && (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <Stat label="Total charged" value={usd(report.totalCharged)} />
            <Stat label="Worth questioning" value={usd(report.amountToQuestion)} accent="text-amber-300" />
            <Stat label="Est. savings" value={`${usd(report.estimatedSavings.low)}–${usd(report.estimatedSavings.high)}`} accent="text-emerald-300" icon={PiggyBank} />
          </div>

          {report.flags.length === 0 ? (
            <div className="rounded-2xl border border-emerald-400/25 bg-emerald-400/5 p-6 text-sm text-emerald-100">
              No obvious errors jumped out from what you entered. That doesn&apos;t guarantee the bill is right — still request a
              fully itemized statement, reconcile it to your EOB, and ask about financial assistance or a self-pay discount.
            </div>
          ) : (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">{report.flags.length} thing{report.flags.length > 1 ? "s" : ""} to question</h3>
              {report.flags.map((f) => {
                const s = SEV[f.severity];
                return (
                  <div key={f.id} className={`rounded-xl border p-5 ${s.ring}`}>
                    <div className="mb-1 flex items-center justify-between gap-3">
                      <span className={`flex items-center gap-2 font-semibold ${s.text}`}><s.icon className="h-4 w-4" /> {f.title}</span>
                      {f.amount ? <span className={`text-sm font-semibold ${s.text}`}>~{usd(f.amount)}</span> : <span className="text-xs uppercase tracking-wide text-slate-500">{s.label}</span>}
                    </div>
                    <p className="text-sm text-slate-300">{f.detail}</p>
                    <p className="mt-2 text-xs text-slate-500">Line{f.lines.length > 1 ? "s" : ""}: {f.lines.join(" · ")}</p>
                  </div>
                );
              })}
            </div>
          )}

          {/* Dispute summary — the deliverable */}
          <div className="rounded-2xl border border-cyan-400/25 bg-white/[0.03] p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-cyan-300"><ClipboardCopy className="h-4 w-4" /> Your dispute summary — ready to send</h3>
              <button onClick={copySummary} className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5 text-xs text-slate-300 hover:border-cyan-400/40 hover:text-cyan-200">
                {copied ? <><Check className="h-3.5 w-3.5" /> Copied</> : <><ClipboardCopy className="h-3.5 w-3.5" /> Copy</>}
              </button>
            </div>
            <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-lg bg-[#03040a] p-4 text-xs leading-relaxed text-slate-300">{report.disputeSummary}</pre>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <ListCard title="Your rights" items={report.rights} />
            <ListCard title="Options to consider" items={report.nextSteps} />
          </div>

          <div className="rounded-2xl border border-amber-400/20 bg-amber-400/5 p-5 text-sm text-amber-100">
            <Scale className="mb-1 inline h-4 w-4" /> {report.disclaimer}{" "}
            <Link href="/find-an-attorney" className="text-cyan-300 hover:text-cyan-200">Talk to an attorney affiliate →</Link>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, accent = "text-white", icon: Icon }: { label: string; value: string; accent?: string; icon?: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <p className="mb-1 flex items-center gap-1.5 text-xs uppercase tracking-wide text-slate-500">{Icon && <Icon className="h-3.5 w-3.5" />}{label}</p>
      <p className={`text-2xl font-bold ${accent}`}>{value}</p>
    </div>
  );
}

function ListCard({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
      <h3 className="mb-3 text-sm font-semibold text-white">{title}</h3>
      <ul className="space-y-2">
        {items.map((it) => <li key={it} className="flex gap-2 text-sm text-slate-400"><span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-cyan-400" />{it}</li>)}
      </ul>
    </div>
  );
}

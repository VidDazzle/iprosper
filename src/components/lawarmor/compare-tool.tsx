"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Trophy, ThumbsDown, Scale, Plus, Trash2, GitCompare } from "lucide-react";
import { COMPARE_PROFILES, fmt, getProfile, type CompareMetric } from "@/lib/lawarmor/compare";

interface Cell { name: string; value: number; best: boolean; worst: boolean }
interface Result {
  profileLabel: string;
  ranked: { name: string; score: number; pros: string[]; cons: string[] }[];
  best: { name: string; reasons: string[] };
  worst: { name: string; reasons: string[] };
  metrics: CompareMetric[];
  matrix: { metric: string; unit: string; cells: Cell[] }[];
  disclaimer: string;
}

const inputCls = "h-9 border-white/15 bg-[#03040a] text-white placeholder:text-slate-600";
const uid = () => Math.random().toString(36).slice(2, 8);

export default function LawArmorCompareTool() {
  const [profileId, setProfileId] = useState(COMPARE_PROFILES[0].id);
  const profile = getProfile(profileId)!;
  const [options, setOptions] = useState(() => [
    { id: uid(), name: "Option A", values: {} as Record<string, number> },
    { id: uid(), name: "Option B", values: {} as Record<string, number> },
  ]);
  const [state, setState] = useState<"idle" | "working" | "done" | "error">("idle");
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");

  function setVal(id: string, key: string, v: string) {
    setOptions((cur) => cur.map((o) => (o.id === id ? { ...o, values: { ...o.values, [key]: v === "" ? 0 : Number(v) } } : o)));
  }
  function setName(id: string, name: string) {
    setOptions((cur) => cur.map((o) => (o.id === id ? { ...o, name } : o)));
  }

  async function run() {
    setState("working"); setError(""); setResult(null);
    try {
      const res = await fetch("/api/lawarmor/compare", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId, options: options.map((o) => ({ name: o.name, values: o.values })) }),
      });
      const data = await res.json();
      if (res.ok) { setResult(data.result); setState("done"); }
      else { setError(data.error ?? "Comparison failed."); setState("error"); }
    } catch { setError("Network error."); setState("error"); }
  }

  const scoreColor = (s: number) => (s >= 66 ? "text-emerald-300" : s >= 40 ? "text-amber-300" : "text-rose-300");

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <Label className="mb-1.5 block text-sm text-slate-300">What are you comparing?</Label>
        <select value={profileId} onChange={(e) => { setProfileId(e.target.value); setResult(null); setState("idle"); }}
          className="h-10 w-full max-w-md rounded-md border border-white/15 bg-[#03040a] px-3 text-sm text-white">
          {COMPARE_PROFILES.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
        </select>
        <p className="mt-2 text-xs text-slate-500">{profile.note} Enter the key terms from each offer (from documents you have — nothing is stored).</p>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="pb-2 pr-4 font-medium">Term</th>
                {options.map((o) => (
                  <th key={o.id} className="pb-2 px-2 font-medium">
                    <div className="flex items-center gap-1">
                      <Input value={o.name} onChange={(e) => setName(o.id, e.target.value)} className="h-8 w-28 border-white/15 bg-[#03040a] text-white" />
                      {options.length > 2 && <button onClick={() => setOptions((c) => c.filter((x) => x.id !== o.id))} className="text-slate-500 hover:text-rose-300"><Trash2 className="h-3.5 w-3.5" /></button>}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {profile.metrics.map((m) => (
                <tr key={m.key}>
                  <td className="py-2 pr-4">
                    <span className="text-slate-300">{m.label}</span>
                    <span className="ml-1 text-xs text-slate-600">({m.dir === "lower" ? "lower better" : "higher better"}{m.unit === "score" ? ", 1–10" : ""})</span>
                    {m.help && <span className="block text-xs text-slate-600">{m.help}</span>}
                  </td>
                  {options.map((o) => (
                    <td key={o.id} className="px-2 py-2">
                      <Input type="number" value={o.values[m.key] ?? ""} onChange={(e) => setVal(o.id, m.key, e.target.value)} className={inputCls} placeholder="0" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          {options.length < 4 && (
            <button onClick={() => setOptions((c) => [...c, { id: uid(), name: `Option ${String.fromCharCode(65 + c.length)}`, values: {} }])}
              className="inline-flex items-center gap-1.5 text-sm text-cyan-300 hover:text-cyan-200"><Plus className="h-4 w-4" /> Add another offer</button>
          )}
          <Button onClick={run} disabled={state === "working"} className="h-11 rounded-full bg-gradient-to-r from-cyan-500 to-violet-600 px-8 text-white hover:from-cyan-400 hover:to-violet-500">
            {state === "working" ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Comparing…</> : <><GitCompare className="mr-2 h-4 w-4" /> Compare & rate</>}
          </Button>
        </div>
        {error && <p className="mt-2 text-sm text-rose-400">{error}</p>}
      </div>

      {state === "done" && result && (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-emerald-400/25 bg-emerald-400/5 p-5">
              <h3 className="mb-1 flex items-center gap-2 font-semibold text-emerald-200"><Trophy className="h-5 w-5" /> Scores highest: {result.best.name}</h3>
              <ul className="mt-2 space-y-1 text-sm text-emerald-100/90">{result.best.reasons.map((r) => <li key={r}>• {r}</li>)}</ul>
            </div>
            <div className="rounded-2xl border border-rose-400/25 bg-rose-400/5 p-5">
              <h3 className="mb-1 flex items-center gap-2 font-semibold text-rose-200"><ThumbsDown className="h-5 w-5" /> Scores lowest: {result.worst.name}</h3>
              <ul className="mt-2 space-y-1 text-sm text-rose-100/90">{result.worst.reasons.map((r) => <li key={r}>• {r}</li>)}</ul>
            </div>
          </div>

          <div className="space-y-3">
            {result.ranked.map((o, i) => (
              <div key={o.name} className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
                <div className="mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-2 font-semibold text-white"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-xs">{i + 1}</span>{o.name}</span>
                  <span className={`text-lg font-bold ${scoreColor(o.score)}`}>{o.score}<span className="text-sm text-slate-500">/100</span></span>
                </div>
                <div className="mb-3 h-2 w-full overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-violet-500" style={{ width: `${o.score}%` }} /></div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>{o.pros.map((p) => <p key={p} className="text-sm text-emerald-300">✓ {p}</p>)}</div>
                  <div>{o.cons.map((c) => <p key={c} className="text-sm text-amber-300">△ {c}</p>)}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Matrix */}
          <div className="overflow-x-auto rounded-xl border border-white/10 bg-white/[0.03] p-5">
            <table className="w-full min-w-[520px] text-sm">
              <thead><tr className="text-left text-xs uppercase tracking-wide text-slate-500"><th className="pb-2 pr-4 font-medium">Term</th>{result.ranked.map((o) => <th key={o.name} className="pb-2 px-2 font-medium">{o.name}</th>)}</tr></thead>
              <tbody className="divide-y divide-white/5">
                {result.matrix.map((row) => (
                  <tr key={row.metric}>
                    <td className="py-2 pr-4 text-slate-400">{row.metric}</td>
                    {result.ranked.map((o) => {
                      const cell = row.cells.find((c) => c.name === o.name)!;
                      return <td key={o.name} className={`px-2 py-2 ${cell.best ? "font-semibold text-emerald-300" : cell.worst ? "text-rose-300" : "text-slate-300"}`}>{fmt(cell.value, row.unit as CompareMetric["unit"])}</td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="rounded-2xl border border-amber-400/20 bg-amber-400/5 p-5 text-sm text-amber-100">
            <Scale className="mb-1 inline h-4 w-4" /> {result.disclaimer}{" "}
            <Link href="/find-an-attorney" className="text-cyan-300 hover:text-cyan-200">Talk to an attorney affiliate →</Link>
          </div>
        </div>
      )}
    </div>
  );
}

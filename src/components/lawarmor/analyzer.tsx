"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { UploadCloud, Loader2, ShieldCheck, Lightbulb, AlertTriangle, Scale, HelpCircle, Trash2 } from "lucide-react";

const DOC_TYPES = [
  ["homeowner_insurance", "Homeowner / property insurance"],
  ["auto_insurance", "Auto insurance"],
  ["renters_insurance", "Renters insurance"],
  ["real_estate", "Real estate contract"],
  ["lease", "Lease / rental agreement"],
  ["contract", "Contract / agreement"],
  ["warranty", "Warranty / service contract"],
  ["unknown", "Something else"],
];

interface Analysis {
  docLabel: string; agent: string; summary: string;
  keyPoints: string[]; watchOuts: string[]; rights: string[]; questions: string[]; stateNote: string;
  attorneyAreas: string[];
}

export default function LawArmorAnalyzer() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [declaredType, setDeclaredType] = useState(DOC_TYPES[0][0]);
  const [stateCode, setStateCode] = useState("");
  const [note, setNote] = useState("");
  const [state, setState] = useState<"idle" | "working" | "done" | "error">("idle");
  const [result, setResult] = useState<Analysis | null>(null);
  const [error, setError] = useState("");

  async function run(e: React.FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file && !note) { setError("Upload a document (or paste a snippet) to analyze."); return; }
    setState("working"); setError(""); setResult(null);
    try {
      const fd = new FormData();
      if (file) fd.append("file", file);
      fd.append("declaredType", declaredType);
      fd.append("stateCode", stateCode);
      fd.append("note", note);
      const res = await fetch("/api/lawarmor/analyze", { method: "POST", body: fd });
      const data = await res.json();
      if (res.ok) { setResult(data.analysis); setState("done"); }
      else { setError(data.error ?? "Analysis failed."); setState("error"); }
    } catch { setError("Network error."); setState("error"); }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={run} className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed border-white/20 bg-[#03040a] px-6 py-8 text-center transition-colors hover:border-cyan-400/40">
          <UploadCloud className="h-8 w-8 text-cyan-400" />
          <span className="text-sm text-slate-300">{fileName || "Upload your document (PDF or image, up to 15 MB)"}</span>
          <input ref={fileRef} type="file" className="hidden" accept=".pdf,.png,.jpg,.jpeg,.webp,.heic,.doc,.docx"
            onChange={(e) => setFileName(e.target.files?.[0]?.name ?? "")} />
        </label>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <Label className="mb-1.5 block text-sm text-slate-300">What kind of document?</Label>
            <select value={declaredType} onChange={(e) => setDeclaredType(e.target.value)}
              className="h-10 w-full rounded-md border border-white/15 bg-[#03040a] px-3 text-sm text-white">
              {DOC_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <Label className="mb-1.5 block text-sm text-slate-300">Your state</Label>
            <Input value={stateCode} onChange={(e) => setStateCode(e.target.value.toUpperCase().slice(0, 2))} placeholder="CA" maxLength={2}
              className="h-10 border-white/15 bg-[#03040a] text-white placeholder:text-slate-600" />
          </div>
          <div>
            <Label className="mb-1.5 block text-sm text-slate-300">Anything specific? (optional)</Label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. denied my claim"
              className="h-10 border-white/15 bg-[#03040a] text-white placeholder:text-slate-600" />
          </div>
        </div>

        {error && <p className="text-sm text-rose-400">{error}</p>}

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={state === "working"} className="h-11 rounded-full bg-gradient-to-r from-cyan-500 to-violet-600 px-8 text-white hover:from-cyan-400 hover:to-violet-500">
            {state === "working" ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing…</> : <><ShieldCheck className="mr-2 h-4 w-4" /> Analyze my document</>}
          </Button>
          <span className="inline-flex items-center gap-1.5 text-xs text-slate-500"><Trash2 className="h-3.5 w-3.5" /> Your document is analyzed and immediately discarded — we never store it.</span>
        </div>
      </form>

      {state === "done" && result && (
        <div className="space-y-5">
          <div className="rounded-2xl border border-cyan-400/25 bg-gradient-to-b from-cyan-500/10 to-transparent p-6">
            <div className="mb-1 flex items-center gap-2 text-xs uppercase tracking-wide text-cyan-300">
              <ShieldCheck className="h-4 w-4" /> Analyzed by {result.agent} · {result.docLabel}
            </div>
            <p className="text-slate-200">{result.summary}</p>
            <p className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-emerald-400/10 px-3 py-1.5 text-xs text-emerald-300">
              <Trash2 className="h-3.5 w-3.5" /> Document discarded — nothing was stored.
            </p>
          </div>

          <Section icon={Lightbulb} color="text-cyan-300" title="Key points to understand" items={result.keyPoints} />
          <Section icon={AlertTriangle} color="text-amber-300" title="Watch-outs & red flags" items={result.watchOuts} />
          <Section icon={Scale} color="text-emerald-300" title="Rights you may have" items={result.rights} />
          <Section icon={HelpCircle} color="text-violet-300" title="Questions to ask" items={result.questions} />

          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
            <p className="mb-1 text-sm font-semibold text-white">In your state</p>
            <p className="text-sm text-slate-400">{result.stateNote}</p>
          </div>

          <div className="rounded-2xl border border-amber-400/20 bg-amber-400/5 p-5">
            <p className="text-sm text-amber-100">
              <strong>This is not legal advice</strong>, and Law &amp; Armor is not a law firm. This report helps you
              understand your document. For advice about your specific situation, talk to a licensed attorney —
              <Link href="/find-an-attorney" className="ml-1 text-cyan-300 hover:text-cyan-200">find one who handles {result.attorneyAreas[0]?.toLowerCase() ?? "your issue"} →</Link>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ icon: Icon, color, title, items }: { icon: React.ComponentType<{ className?: string }>; color: string; title: string; items: string[] }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
      <h3 className={`mb-3 flex items-center gap-2 text-sm font-semibold ${color}`}><Icon className="h-4 w-4" /> {title}</h3>
      <ul className="space-y-2">
        {items.map((it) => (
          <li key={it} className="flex gap-2 text-sm text-slate-300"><span className={`mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-current ${color}`} />{it}</li>
        ))}
      </ul>
    </div>
  );
}

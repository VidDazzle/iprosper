"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { UploadCloud, Loader2, Gauge, Quote, AlertTriangle, HelpCircle, Scale, Trash2, ShieldQuestion, ClipboardCopy, Check, ListChecks } from "lucide-react";
import { COVERAGE_DOMAINS, type ProbabilityBand } from "@/lib/lawarmor/coverage";

interface Result {
  domainLabel: string; agent: string; band: ProbabilityBand; bandLabel: string; headline: string;
  supporting: string[]; concerns: string[]; reasons: string[]; followUps: string[]; disclaimer: string;
  actions?: { questions: string[]; letter: string };
}

const BAND_UI: Record<ProbabilityBand, { ring: string; text: string; bar: string; pct: string }> = {
  high: { ring: "border-emerald-400/30 bg-emerald-400/5", text: "text-emerald-300", bar: "bg-emerald-400", pct: "90%" },
  medium: { ring: "border-amber-400/30 bg-amber-400/5", text: "text-amber-300", bar: "bg-amber-400", pct: "55%" },
  low: { ring: "border-rose-400/30 bg-rose-400/5", text: "text-rose-300", bar: "bg-rose-400", pct: "20%" },
  insufficient: { ring: "border-sky-400/30 bg-sky-400/5", text: "text-sky-300", bar: "bg-sky-400", pct: "0%" },
};

export default function LawArmorCoverageChecker() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [domain, setDomain] = useState(COVERAGE_DOMAINS[0].value);
  const [question, setQuestion] = useState("");
  const [policyText, setPolicyText] = useState("");
  const [extra, setExtra] = useState("");
  const [state, setState] = useState<"idle" | "working" | "done" | "error">("idle");
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  async function copyLetter(text: string) {
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* clipboard unavailable */ }
  }

  async function run(e?: React.FormEvent) {
    e?.preventDefault();
    const fullQuestion = [question, extra].filter(Boolean).join(" ").trim();
    if (fullQuestion.length < 5) { setError("Tell us what happened and what you want to know."); return; }
    setState("working"); setError(""); setResult(null);
    try {
      const fd = new FormData();
      fd.append("domain", domain);
      fd.append("question", fullQuestion);
      fd.append("policyText", policyText);
      if (fileRef.current?.files?.[0]) fd.append("file", fileRef.current.files[0]);
      const res = await fetch("/api/lawarmor/coverage", { method: "POST", body: fd });
      const data = await res.json();
      if (res.ok) { setResult(data.result); setState("done"); }
      else { setError(data.error ?? "Coverage check failed."); setState("error"); }
    } catch { setError("Network error."); setState("error"); }
  }

  const ui = result ? BAND_UI[result.band] : null;

  return (
    <div className="space-y-6">
      <form onSubmit={run} className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/[0.04] p-4">
          <p className="flex items-center gap-2 text-sm font-medium text-cyan-200"><ShieldQuestion className="h-4 w-4" /> Is it covered?</p>
          <p className="mt-1 text-sm text-slate-400">Upload or paste your policy, warranty, or service agreement and ask your question — a leaking roof, a defective part, a damaged vehicle, a medical treatment. We&apos;ll estimate the probability and show you the language behind it. We never tell you &ldquo;yes, it&apos;s covered.&rdquo;</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label className="mb-1.5 block text-sm text-slate-300">What kind of coverage?</Label>
            <select value={domain} onChange={(e) => setDomain(e.target.value as typeof domain)}
              className="h-10 w-full rounded-md border border-white/15 bg-[#03040a] px-3 text-sm text-white">
              {COVERAGE_DOMAINS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
            </select>
          </div>
          <label className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-white/20 bg-[#03040a] px-4 py-3 text-center transition-colors hover:border-cyan-400/40">
            <UploadCloud className="h-5 w-5 text-cyan-400" />
            <span className="text-xs text-slate-400">{fileName || "Upload policy / warranty (optional, discarded)"}</span>
            <input ref={fileRef} type="file" className="hidden" accept=".pdf,.png,.jpg,.jpeg,.webp,.heic,.doc,.docx,.txt"
              onChange={(e) => setFileName(e.target.files?.[0]?.name ?? "")} />
          </label>
        </div>

        <div>
          <Label className="mb-1.5 block text-sm text-slate-300">What happened, and what do you want to know? <span className="text-rose-400">*</span></Label>
          <textarea value={question} onChange={(e) => setQuestion(e.target.value)} rows={3}
            placeholder="e.g. My roof started leaking into the upstairs ceiling after a windstorm last week. Is the water damage covered?"
            className="w-full rounded-md border border-white/15 bg-[#03040a] px-3 py-2 text-sm text-white placeholder:text-slate-600" />
        </div>

        <div>
          <Label className="mb-1.5 block text-sm text-slate-300">Paste the relevant section of your policy / warranty (recommended)</Label>
          <textarea value={policyText} onChange={(e) => setPolicyText(e.target.value)} rows={4}
            placeholder="Paste the coverage, perils, or exclusions section. The more of your document's own words we can read, the more specific we can be — and nothing is stored."
            className="w-full rounded-md border border-white/15 bg-[#03040a] px-3 py-2 text-sm text-white placeholder:text-slate-600" />
        </div>

        {error && <p className="text-sm text-rose-400">{error}</p>}

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={state === "working"} className="h-11 rounded-full bg-gradient-to-r from-cyan-500 to-violet-600 px-8 text-white hover:from-cyan-400 hover:to-violet-500">
            {state === "working" ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Checking…</> : <><Gauge className="mr-2 h-4 w-4" /> Check my coverage probability</>}
          </Button>
          <span className="inline-flex items-center gap-1.5 text-xs text-slate-500"><Trash2 className="h-3.5 w-3.5" /> Analyzed in memory and immediately discarded.</span>
        </div>
      </form>

      {state === "done" && result && ui && (
        <div className="space-y-5">
          {/* Probability band */}
          <div className={`rounded-2xl border p-6 ${ui.ring}`}>
            <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wide text-slate-400">
              <Gauge className="h-4 w-4" /> Assessed by {result.agent} · {result.domainLabel}
            </div>
            <h3 className={`text-xl font-bold ${ui.text}`}>{result.bandLabel}</h3>
            <div className="my-3 h-2.5 w-full overflow-hidden rounded-full bg-white/10"><div className={`h-full rounded-full ${ui.bar}`} style={{ width: ui.pct }} /></div>
            <p className="text-sm text-slate-200">{result.headline}</p>
            <p className="mt-2 text-xs text-slate-500">This is a probability, not a decision. We never tell you that you are covered.</p>
          </div>

          {result.supporting.length > 0 && (
            <Section icon={Quote} color="text-emerald-300" title="Language that may support coverage" items={result.supporting} quote />
          )}
          {result.concerns.length > 0 && (
            <Section icon={AlertTriangle} color="text-amber-300" title="Language that may limit or exclude coverage" items={result.concerns} quote />
          )}
          <Section icon={Scale} color="text-cyan-300" title="Why we landed here" items={result.reasons} />

          {result.followUps.length > 0 && (
            <div className="rounded-2xl border border-violet-400/25 bg-violet-400/5 p-5">
              <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-violet-200"><HelpCircle className="h-4 w-4" /> Answer these to sharpen the estimate</h3>
              <ul className="mb-4 space-y-2">
                {result.followUps.map((f) => <li key={f} className="flex gap-2 text-sm text-slate-300"><span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-violet-400" />{f}</li>)}
              </ul>
              <textarea value={extra} onChange={(e) => setExtra(e.target.value)} rows={2}
                placeholder="Add the details (why, when, where, how)…"
                className="w-full rounded-md border border-white/15 bg-[#03040a] px-3 py-2 text-sm text-white placeholder:text-slate-600" />
              <Button onClick={() => run()} className="mt-3 h-9 rounded-full bg-white/10 px-5 text-sm text-white hover:bg-white/20">Re-check with these details</Button>
            </div>
          )}

          {result.actions && (
            <div className="rounded-2xl border border-cyan-400/25 bg-white/[0.03] p-5">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-cyan-300"><ListChecks className="h-4 w-4" /> If you want to act on this — your choice</h3>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Questions to ask your insurer / administrator</p>
              <ul className="mb-4 space-y-2">
                {result.actions.questions.map((q) => <li key={q} className="flex gap-2 text-sm text-slate-300"><span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-cyan-400" />{q}</li>)}
              </ul>
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Request-for-determination letter</p>
                <button onClick={() => copyLetter(result.actions!.letter)} className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5 text-xs text-slate-300 hover:border-cyan-400/40 hover:text-cyan-200">
                  {copied ? <><Check className="h-3.5 w-3.5" /> Copied</> : <><ClipboardCopy className="h-3.5 w-3.5" /> Copy</>}
                </button>
              </div>
              <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-lg bg-[#03040a] p-4 text-xs leading-relaxed text-slate-300">{result.actions.letter}</pre>
              <p className="mt-2 text-xs text-slate-600">This is a template you may choose to use — it asks the insurer for their decision. It is not a demand and not legal advice.</p>
            </div>
          )}

          <div className="rounded-2xl border border-amber-400/25 bg-amber-400/5 p-5 text-sm text-amber-100">
            <Scale className="mb-1 inline h-4 w-4" /> {result.disclaimer}{" "}
            <Link href="/find-an-attorney" className="text-cyan-300 hover:text-cyan-200">Find an attorney to fight for your rights →</Link>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ icon: Icon, color, title, items, quote }: { icon: React.ComponentType<{ className?: string }>; color: string; title: string; items: string[]; quote?: boolean }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
      <h3 className={`mb-3 flex items-center gap-2 text-sm font-semibold ${color}`}><Icon className="h-4 w-4" /> {title}</h3>
      <ul className="space-y-2">
        {items.map((it) => (
          <li key={it} className={quote ? "border-l-2 border-white/15 pl-3 text-sm italic text-slate-300" : "flex gap-2 text-sm text-slate-300"}>
            {!quote && <span className={`mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-current ${color}`} />}{quote ? `“${it}”` : it}
          </li>
        ))}
      </ul>
    </div>
  );
}

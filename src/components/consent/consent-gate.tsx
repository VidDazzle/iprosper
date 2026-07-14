"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ShieldCheck, FileSignature, Lock } from "lucide-react";
import { AGREEMENT_TITLE, AGREEMENT_VERSION, AGREEMENT_PARAGRAPHS, REQUIRED_ACKS } from "@/lib/consent/agreement";

/**
 * Blocks its children (the analysis tools) until the visitor signs the
 * disclosure + hold-harmless agreement. Enforcement is also server-side — the
 * analysis routes reject requests without a valid signed cookie — this gate is
 * the UI that makes signing possible and confirms it before revealing the tools.
 */
export default function ConsentGate({ children, scope = "advocate" }: { children: React.ReactNode; scope?: string }) {
  const [status, setStatus] = useState<"checking" | "needed" | "accepted">("checking");
  const [name, setName] = useState("");
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  useEffect(() => {
    let live = true;
    fetch("/api/consent/status")
      .then((r) => r.json())
      .then((d) => { if (live) setStatus(d.accepted ? "accepted" : "needed"); })
      .catch(() => { if (live) setStatus("needed"); });
    return () => { live = false; };
  }, []);

  const allChecked = REQUIRED_ACKS.every((a) => checked[a.id]);
  const canSign = allChecked && name.trim().length >= 2 && !submitting;

  async function sign() {
    if (!canSign) return;
    setSubmitting(true); setError("");
    try {
      const res = await fetch("/api/consent/accept", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), scope, acks: REQUIRED_ACKS.map((a) => a.id) }),
      });
      const data = await res.json();
      if (res.ok) setStatus("accepted");
      else setError(data.error ?? "Could not record your acceptance.");
    } catch { setError("Network error. Please try again."); }
    finally { setSubmitting(false); }
  }

  if (status === "checking") {
    return <div className="flex items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] p-12 text-slate-400"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading…</div>;
  }

  if (status === "accepted") return <>{children}</>;

  return (
    <div className="rounded-2xl border border-cyan-400/25 bg-white/[0.03] p-6 sm:p-8">
      <div className="mb-4 flex items-center gap-2 text-cyan-300">
        <FileSignature className="h-5 w-5" />
        <h3 className="text-lg font-semibold text-white">{AGREEMENT_TITLE}</h3>
      </div>
      <p className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-amber-400/25 bg-amber-400/10 px-3 py-1 text-xs text-amber-200">
        <Lock className="h-3.5 w-3.5" /> Required before you can analyze, compare, or check out.
      </p>

      <div className="mb-5 max-h-56 space-y-3 overflow-y-auto rounded-lg border border-white/10 bg-[#03040a] p-4 text-sm leading-relaxed text-slate-300">
        {AGREEMENT_PARAGRAPHS.map((p, i) => <p key={i}>{p}</p>)}
      </div>
      <p className="mb-5 text-xs text-slate-500">
        Read the full text on the <Link href="/legal/advocate-disclosure" target="_blank" className="text-cyan-300 hover:text-cyan-200">disclosure page</Link>. Version {AGREEMENT_VERSION}.
      </p>

      <div className="space-y-3">
        {REQUIRED_ACKS.map((a) => (
          <label key={a.id} className="flex cursor-pointer items-start gap-3 rounded-lg border border-white/10 bg-white/[0.02] p-3 text-sm text-slate-300 hover:border-cyan-400/30">
            <input type="checkbox" checked={!!checked[a.id]} onChange={(e) => setChecked((c) => ({ ...c, [a.id]: e.target.checked }))}
              className="mt-0.5 h-4 w-4 flex-shrink-0 accent-cyan-500" />
            <span>{a.label}</span>
          </label>
        ))}
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <Label className="mb-1.5 block text-sm text-slate-300">Type your full legal name to sign</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Q. Consumer"
            className="h-10 border-white/15 bg-[#03040a] text-white placeholder:text-slate-600" />
        </div>
        <div>
          <Label className="mb-1.5 block text-sm text-slate-300">Date</Label>
          <div className="flex h-10 items-center rounded-md border border-white/15 bg-[#03040a] px-3 text-sm text-slate-400">{today}</div>
        </div>
      </div>

      {error && <p className="mt-3 text-sm text-rose-400">{error}</p>}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button onClick={sign} disabled={!canSign}
          className="h-11 rounded-full bg-gradient-to-r from-cyan-500 to-violet-600 px-8 text-white hover:from-cyan-400 hover:to-violet-500 disabled:opacity-40">
          {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Signing…</> : <><ShieldCheck className="mr-2 h-4 w-4" /> I agree &amp; continue</>}
        </Button>
        {!allChecked && <span className="text-xs text-slate-500">Check every box and type your name to continue.</span>}
      </div>
    </div>
  );
}

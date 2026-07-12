"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { UploadCloud, Loader2, Sparkles, CheckCircle2, AlertTriangle } from "lucide-react";

const DOC_TYPES = [
  "Creditor statement",
  "Settlement letter",
  "Legal notice / lawsuit",
  "Collection letter",
  "Pay stub / income",
  "Bank statement",
  "ID document",
  "Other",
];

interface AnalysisResult {
  agent: string;
  category: string;
  findings: string[];
  recommendedAction: string;
  priority: "normal" | "high" | "urgent";
  approvalCreated: boolean;
}

export default function DocumentUpload() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [declaredType, setDeclaredType] = useState(DOC_TYPES[0]);
  const [note, setNote] = useState("");
  const [state, setState] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) { setError("Please choose a file."); return; }
    setState("uploading");
    setError("");
    setResult(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("declaredType", declaredType);
      fd.append("note", note);
      const res = await fetch("/api/portal/documents", { method: "POST", body: fd });
      const data = await res.json();
      if (res.ok) {
        setResult(data.analysis);
        setState("done");
        setNote("");
        setFileName("");
        if (fileRef.current) fileRef.current.value = "";
        router.refresh();
      } else {
        setError(data.error ?? "Upload failed.");
        setState("error");
      }
    } catch {
      setError("Network error. Please try again.");
      setState("error");
    }
  }

  const priorityStyle = {
    urgent: "border-rose-400/40 bg-rose-400/5 text-rose-200",
    high: "border-amber-400/40 bg-amber-400/5 text-amber-200",
    normal: "border-cyan-400/40 bg-cyan-400/5 text-cyan-100",
  };

  return (
    <div className="space-y-4">
      <form onSubmit={submit} className="space-y-4 rounded-xl border border-white/10 bg-white/[0.03] p-6">
        <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed border-white/20 bg-[#03040a] px-6 py-8 text-center transition-colors hover:border-cyan-400/40">
          <UploadCloud className="h-8 w-8 text-cyan-400" />
          <span className="text-sm text-slate-300">{fileName || "Click to choose a file (PDF, image, up to 15 MB)"}</span>
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            accept=".pdf,.png,.jpg,.jpeg,.webp,.heic,.doc,.docx"
            onChange={(e) => setFileName(e.target.files?.[0]?.name ?? "")}
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="dtype" className="mb-1.5 block text-sm text-slate-300">What is this document?</Label>
            <select
              id="dtype"
              value={declaredType}
              onChange={(e) => setDeclaredType(e.target.value)}
              className="h-10 w-full rounded-md border border-white/15 bg-[#03040a] px-3 text-sm text-white"
            >
              {DOC_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <Label htmlFor="note" className="mb-1.5 block text-sm text-slate-300">Note (optional)</Label>
            <input
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Anything we should know?"
              className="h-10 w-full rounded-md border border-white/15 bg-[#03040a] px-3 text-sm text-white placeholder:text-slate-600"
            />
          </div>
        </div>

        {error && <p className="text-sm text-rose-400">{error}</p>}

        <Button type="submit" disabled={state === "uploading"} className="h-11 rounded-full bg-gradient-to-r from-cyan-500 to-violet-600 px-8 text-white hover:from-cyan-400 hover:to-violet-500">
          {state === "uploading" ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing…</>
          ) : (
            <><Sparkles className="mr-2 h-4 w-4" /> Upload & analyze</>
          )}
        </Button>
      </form>

      {state === "done" && result && (
        <div className={`rounded-xl border p-6 ${priorityStyle[result.priority]}`}>
          <div className="mb-3 flex items-center gap-2">
            {result.priority === "urgent" ? <AlertTriangle className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
            <h3 className="font-semibold">
              {result.agent} analyzed your document
              {result.priority !== "normal" && <span className="ml-2 text-xs uppercase">· {result.priority} priority</span>}
            </h3>
          </div>
          <ul className="mb-4 space-y-1.5 text-sm">
            {result.findings.map((f, i) => (
              <li key={i} className="flex gap-2">
                <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-current opacity-60" />
                {f}
              </li>
            ))}
          </ul>
          <p className="text-sm opacity-90"><strong>Next step:</strong> {result.recommendedAction}</p>
          {result.approvalCreated && (
            <p className="mt-3 rounded-lg bg-black/20 px-3 py-2 text-sm">
              ✅ We&apos;ve sent an approval request to your portal, email, and phone. You decide whether we proceed.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

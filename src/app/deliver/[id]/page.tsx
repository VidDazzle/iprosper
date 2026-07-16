"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  Loader2,
  Check,
  RotateCcw,
  ExternalLink,
  Bot,
  Link2,
  FileText,
  Video,
  ImageIcon,
  ShieldCheck,
} from "lucide-react";
import ScoreCard from "@/components/ScoreCard";

function itemIcon(kind: string) {
  if (kind === "voice_agent") return Bot;
  if (kind === "link") return Link2;
  if (kind === "video") return Video;
  if (kind === "image") return ImageIcon;
  return FileText;
}

export default function ClientReview() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [detail, setDetail] = useState("");
  const [mode, setMode] = useState<null | "approve" | "revision">(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<null | "approved" | "revision_requested">(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/deliverables/${id}`);
    if (res.ok) setData(await res.json());
    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function submit(decision: "approved" | "revision_requested") {
    setError(null);
    if (!name.trim()) return setError("Please enter your name.");
    if (decision === "revision_requested" && !detail.trim())
      return setError("Please describe the specific revision you'd like.");
    setBusy(true);
    const res = await fetch(`/api/deliverables/${id}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reviewerName: name, decision, revisionDetail: detail }),
    });
    setBusy(false);
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      setError(e.error || "Could not submit.");
      return;
    }
    setDone(decision);
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0b0b0b] text-gray-400">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }
  if (!data?.deliverable) {
    return <div className="flex min-h-screen items-center justify-center bg-[#0b0b0b] text-gray-300">This delivery link is not valid.</div>;
  }

  const d = data.deliverable;
  const items = data.items || [];

  return (
    <div className="min-h-screen bg-[#0b0b0b] text-white">
      <div className="mx-auto max-w-2xl px-6 py-12">
        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-purple-500/40 bg-purple-500/10 px-3 py-1 text-xs font-medium text-purple-300">
          <ShieldCheck className="h-3.5 w-3.5" /> Evolve delivery
        </div>
        <h1 className="text-3xl font-bold">{d.title}</h1>
        {d.message && <p className="mt-2 text-gray-300">{d.message}</p>}
        <p className="mt-1 text-sm text-gray-500">Please review everything below, then approve or request a revision.</p>

        {/* Items */}
        <div className="mt-6 space-y-3">
          {items.map((it: any) => {
            const Icon = itemIcon(it.kind);
            return (
              <div key={it.id} className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Icon className="h-5 w-5 text-purple-400" />
                    <div>
                      <div className="text-sm font-medium">{it.title}</div>
                      <div className="text-[11px] uppercase text-gray-500">{it.kind.replace(/_/g, " ")}</div>
                    </div>
                  </div>
                  {it.url && (
                    <a href={it.url} target="_blank" className="flex items-center gap-1 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-gray-200 hover:bg-white/5">
                      Open <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
                {it.description && <p className="mt-2 text-sm text-gray-400">{it.description}</p>}
                {it.kind === "image" && it.url && <img src={it.url} alt={it.title} className="mt-3 max-h-64 w-full rounded object-contain" />}
                <div className="mt-3 border-t border-white/5 pt-3">
                  <ScoreCard
                    targetType="deliverable_item"
                    targetId={it.id}
                    category={d.projectType}
                    reviewerName={name}
                    label={`Rate this ${it.kind.replace(/_/g, " ")}`}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Decision */}
        {done ? (
          <div className={`mt-8 rounded-xl border p-6 text-center ${done === "approved" ? "border-emerald-500/40 bg-emerald-500/10" : "border-amber-500/40 bg-amber-500/10"}`}>
            {done === "approved" ? (
              <>
                <Check className="mx-auto mb-2 h-8 w-8 text-emerald-400" />
                <p className="text-lg font-semibold">Approved — thank you!</p>
                <p className="text-sm text-gray-400">We&apos;ve let the team know. 🎉</p>
              </>
            ) : (
              <>
                <RotateCcw className="mx-auto mb-2 h-8 w-8 text-amber-400" />
                <p className="text-lg font-semibold">Revision requested</p>
                <p className="text-sm text-gray-400">Your notes were sent to the team. We&apos;ll get right on it.</p>
              </>
            )}
          </div>
        ) : (
          <div className="mt-8 rounded-xl border border-white/10 bg-white/[0.02] p-6">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="mb-3 w-full rounded-lg border border-white/10 bg-black/40 px-4 py-3 text-sm outline-none focus:border-white/30"
            />

            {mode === "revision" && (
              <textarea
                value={detail}
                onChange={(e) => setDetail(e.target.value)}
                placeholder="Describe the specific revision you'd like (be as detailed as you want)…"
                rows={4}
                className="mb-3 w-full resize-none rounded-lg border border-amber-500/30 bg-black/40 px-4 py-3 text-sm outline-none focus:border-amber-500/60"
              />
            )}

            {error && <p className="mb-3 text-sm text-red-400">{error}</p>}

            {mode === null && (
              <div className="flex flex-col gap-2 sm:flex-row">
                <button onClick={() => submit("approved")} disabled={busy} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-500 py-3 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-50">
                  <Check className="h-4 w-4" /> Approve delivery
                </button>
                <button onClick={() => setMode("revision")} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-amber-500 py-3 text-sm font-semibold text-white hover:bg-amber-600">
                  <RotateCcw className="h-4 w-4" /> Request a revision
                </button>
              </div>
            )}

            {mode === "revision" && (
              <div className="flex gap-2">
                <button onClick={() => submit("revision_requested")} disabled={busy} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-amber-500 py-3 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />} Send revision request
                </button>
                <button onClick={() => setMode(null)} className="rounded-lg border border-white/15 px-4 py-3 text-sm text-gray-300 hover:bg-white/5">
                  Back
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

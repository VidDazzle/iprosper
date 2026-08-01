"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Navigation from "@/components/sections/navigation";
import {
  Loader2,
  Send,
  Link2,
  Bot,
  FileUp,
  ExternalLink,
  Check,
  RotateCcw,
  Copy,
} from "lucide-react";
import { uploadDeliverableItem, type UploadProgress } from "@/lib/deliverable-client";

export default function DeliverableManage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkTitle, setLinkTitle] = useState("");
  const [linkKind, setLinkKind] = useState("link");
  const [busy, setBusy] = useState(false);
  const [uploadPct, setUploadPct] = useState<number | null>(null);
  const [delivered, setDelivered] = useState<{ reviewUrl: string; emailedClient: boolean } | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/deliverables/${id}`);
    const d = await res.json();
    setData(d);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function addLink() {
    if (!/^https?:\/\//i.test(linkUrl.trim())) return;
    setBusy(true);
    await fetch(`/api/deliverables/${id}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: linkKind, url: linkUrl.trim(), title: linkTitle || linkUrl.trim() }),
    });
    setLinkUrl("");
    setLinkTitle("");
    setBusy(false);
    load();
  }

  async function addFile(file: File | undefined) {
    if (!file) return;
    setUploadPct(0);
    const kind = file.type.startsWith("video/") ? "video" : file.type.startsWith("image/") ? "image" : "document";
    try {
      await uploadDeliverableItem(id, file, { kind }, (p: UploadProgress) => setUploadPct(p.pct));
      setUploadPct(null);
      load();
    } catch {
      setUploadPct(null);
    }
  }

  async function deliver() {
    setBusy(true);
    const res = await fetch(`/api/deliverables/${id}/deliver`, { method: "POST" });
    const d = await res.json();
    setBusy(false);
    if (d.delivered) {
      setDelivered({ reviewUrl: d.reviewUrl, emailedClient: d.emailedClient });
      load();
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0e0e0e] text-gray-400">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }
  if (!data?.deliverable) {
    return <div className="flex min-h-screen items-center justify-center bg-[#0e0e0e] text-gray-300">Not found.</div>;
  }

  const d = data.deliverable;
  const items = data.items || [];
  const reviews = data.reviews || [];

  return (
    <div className="min-h-screen bg-[#0e0e0e] text-white">
      <Navigation />
      <main className="mx-auto max-w-4xl px-6 py-12">
        <div className="mb-6">
          <div className="mb-1 flex items-center gap-2 text-sm text-purple-300">
            {d.projectType === "voice_ai_agent" && <Bot className="h-4 w-4" />}
            {d.projectType.replace(/_/g, " ")}
          </div>
          <h1 className="text-3xl font-bold">{d.title}</h1>
          <p className="mt-1 text-sm text-gray-400">
            Client: {d.clientName || "—"} {d.clientEmail ? `· ${d.clientEmail}` : ""} · Status: {d.status.replace(/_/g, " ")}
          </p>
        </div>

        {/* Add items */}
        <section className="mb-8 rounded-2xl border border-white/10 bg-white/[0.02] p-6">
          <h2 className="mb-4 text-sm font-medium text-gray-300">Add to this delivery</h2>
          <div className="mb-4 grid gap-2 sm:grid-cols-[140px_1fr_1fr_auto]">
            <select value={linkKind} onChange={(e) => setLinkKind(e.target.value)} className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none">
              <option value="link" className="bg-[#161616]">Link</option>
              <option value="voice_agent" className="bg-[#161616]">Voice AI agent</option>
            </select>
            <input value={linkTitle} onChange={(e) => setLinkTitle(e.target.value)} placeholder="Label (optional)" className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none" />
            <input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://…" className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none" />
            <button onClick={addLink} disabled={busy} className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-sm hover:bg-white/5 disabled:opacity-50">
              <Link2 className="h-4 w-4" /> Add
            </button>
          </div>
          <label className="flex w-fit cursor-pointer items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm text-gray-300 hover:bg-white/5">
            <FileUp className="h-4 w-4" /> Upload a file (document, video — any size)
            <input type="file" className="hidden" onChange={(e) => addFile(e.target.files?.[0])} />
          </label>
          {uploadPct !== null && (
            <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-white/10">
              <div className="h-full bg-purple-500 transition-all" style={{ width: `${uploadPct}%` }} />
            </div>
          )}
        </section>

        {/* Items */}
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-medium text-gray-300">Included ({items.length})</h2>
          {items.length === 0 ? (
            <p className="text-sm text-gray-500">No items yet.</p>
          ) : (
            <div className="space-y-2">
              {items.map((it: any) => (
                <div key={it.id} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3">
                  <div className="flex items-center gap-3">
                    {it.kind === "voice_agent" ? <Bot className="h-4 w-4 text-purple-400" /> : <Link2 className="h-4 w-4 text-blue-400" />}
                    <div>
                      <div className="text-sm">{it.title}</div>
                      <div className="text-[11px] uppercase text-gray-500">{it.kind.replace(/_/g, " ")} · {it.status}</div>
                    </div>
                  </div>
                  {it.url && (
                    <a href={it.url} target="_blank" className="text-gray-400 hover:text-blue-400"><ExternalLink className="h-4 w-4" /></a>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Deliver */}
        <section className="mb-8 rounded-2xl border border-white/10 bg-white/[0.02] p-6">
          <button onClick={deliver} disabled={busy || items.length === 0} className="flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-semibold text-black hover:bg-gray-200 disabled:opacity-50">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {d.clientEmail ? "Deliver & email client" : "Deliver (get review link)"}
          </button>
          {delivered && (
            <div className="mt-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm">
              <p className="text-emerald-300">
                Delivered.{delivered.emailedClient ? " The client has been emailed." : ""} Share this review link:
              </p>
              <div className="mt-2 flex items-center gap-2">
                <code className="flex-1 truncate rounded bg-black/50 px-2 py-1 text-xs text-gray-300">{delivered.reviewUrl}</code>
                <button onClick={() => navigator.clipboard.writeText(delivered.reviewUrl)} className="rounded border border-white/10 p-1.5 hover:bg-white/5">
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Client reviews */}
        {reviews.length > 0 && (
          <section>
            <h2 className="mb-3 text-sm font-medium text-gray-300">Client decisions</h2>
            <div className="space-y-2">
              {reviews.map((r: any) => (
                <div key={r.id} className={`rounded-lg border p-3 text-sm ${r.decision === "approved" ? "border-emerald-500/30 bg-emerald-500/5" : "border-amber-500/30 bg-amber-500/5"}`}>
                  <div className="flex items-center gap-2">
                    {r.decision === "approved" ? <Check className="h-4 w-4 text-emerald-400" /> : <RotateCcw className="h-4 w-4 text-amber-400" />}
                    <span className="font-medium">{r.reviewerName}</span>
                    <span className="text-gray-500">{r.decision === "approved" ? "approved" : "requested a revision"}</span>
                  </div>
                  {r.revisionDetail && <p className="mt-1 pl-6 text-gray-300">“{r.revisionDetail}”</p>}
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

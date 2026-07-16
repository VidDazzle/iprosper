"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Navigation from "@/components/sections/navigation";
import { Package, Plus, Loader2, ExternalLink, Bot } from "lucide-react";

interface Deliverable {
  id: number;
  publicId: string;
  title: string;
  clientName: string | null;
  clientEmail: string | null;
  projectType: string;
  status: string;
  createdAt: string;
}

const TYPES = [
  { v: "voice_ai_agent", label: "Voice AI agent" },
  { v: "website", label: "Website" },
  { v: "document", label: "Document" },
  { v: "video", label: "Video" },
  { v: "design", label: "Design" },
  { v: "other", label: "Other" },
];

const statusStyle: Record<string, string> = {
  draft: "border-gray-600 bg-gray-500/10 text-gray-400",
  delivered: "border-blue-500/40 bg-blue-500/10 text-blue-300",
  approved: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  revision_requested: "border-amber-500/40 bg-amber-500/10 text-amber-300",
};

export default function DeliverablesPage() {
  const [rows, setRows] = useState<Deliverable[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [projectType, setProjectType] = useState("voice_ai_agent");
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/deliverables");
    const data = await res.json();
    setRows(data.deliverables || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function create() {
    if (!title.trim()) return;
    setCreating(true);
    const res = await fetch("/api/deliverables", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, clientName, clientEmail, projectType }),
    });
    const data = await res.json();
    setCreating(false);
    if (data.deliverable) window.location.href = `/deliverables/${data.deliverable.id}`;
  }

  return (
    <div className="min-h-screen bg-[#0e0e0e] text-white">
      <Navigation />
      <main className="mx-auto max-w-5xl px-6 py-12">
        <div className="mb-8">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-purple-500/40 bg-purple-500/10 px-3 py-1 text-xs font-medium text-purple-300">
            <Package className="h-3.5 w-3.5" /> Client project delivery
          </div>
          <h1 className="text-4xl font-bold tracking-tight">Deliverables</h1>
          <p className="mt-2 max-w-2xl text-gray-400">
            Package a finished project — a Voice AI agent, website, documents, videos, or links —
            and send the client a review link to approve or request revisions.
          </p>
        </div>

        <div className="mb-10 rounded-2xl border border-white/10 bg-gradient-to-br from-purple-500/10 to-blue-500/5 p-6">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-medium text-purple-200">
            <Plus className="h-4 w-4" /> New delivery
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Project title" className="rounded-lg border border-white/10 bg-black/40 px-4 py-3 text-sm outline-none focus:border-purple-500/60" />
            <select value={projectType} onChange={(e) => setProjectType(e.target.value)} className="rounded-lg border border-white/10 bg-black/40 px-4 py-3 text-sm outline-none focus:border-purple-500/60">
              {TYPES.map((t) => (
                <option key={t.v} value={t.v} className="bg-[#161616]">{t.label}</option>
              ))}
            </select>
            <input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Client name" className="rounded-lg border border-white/10 bg-black/40 px-4 py-3 text-sm outline-none focus:border-purple-500/60" />
            <input value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} placeholder="Client email" className="rounded-lg border border-white/10 bg-black/40 px-4 py-3 text-sm outline-none focus:border-purple-500/60" />
          </div>
          <button onClick={create} disabled={creating} className="mt-3 flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-semibold text-black hover:bg-gray-200 disabled:opacity-60">
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Package className="h-4 w-4" />}
            Create & add items
          </button>
        </div>

        <h2 className="mb-4 text-lg font-semibold">Recent deliveries</h2>
        {loading ? (
          <div className="flex h-24 items-center justify-center text-gray-500"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-gray-500">No deliveries yet.</p>
        ) : (
          <div className="space-y-2">
            {rows.map((d) => (
              <Link key={d.id} href={`/deliverables/${d.id}`} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3 hover:border-white/20">
                <div className="flex items-center gap-3">
                  {d.projectType === "voice_ai_agent" && <Bot className="h-4 w-4 text-purple-400" />}
                  <div>
                    <div className="font-medium">{d.title}</div>
                    <div className="text-xs text-gray-500">
                      {d.clientName || "—"} · {d.projectType.replace(/_/g, " ")}
                    </div>
                  </div>
                </div>
                <span className={`rounded-full border px-2 py-0.5 text-xs capitalize ${statusStyle[d.status] || statusStyle.draft}`}>
                  {d.status.replace(/_/g, " ")}
                </span>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

"use client";

import { useEffect, useState, useCallback } from "react";
import Navigation from "@/components/sections/navigation";
import {
  Loader2,
  Plus,
  ChevronLeft,
  ChevronRight,
  Trash2,
  UserPlus,
  ArrowRight,
  DollarSign,
} from "lucide-react";

function money(cents: number, currency = "usd") {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format(cents / 100);
  } catch {
    return `$${(cents / 100).toFixed(2)}`;
  }
}

export default function CrmPage() {
  const [board, setBoard] = useState<any>(null);
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [value, setValue] = useState("");
  const [contact, setContact] = useState("");

  const load = useCallback(async () => {
    const [p, l] = await Promise.all([
      fetch("/api/crm/pipelines").then((r) => r.json()),
      fetch("/api/crm/leads").then((r) => r.json()),
    ]);
    setBoard(p);
    setLeads(l.leads || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function addDeal() {
    if (!title.trim()) return;
    await fetch("/api/crm/deals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        valueCents: value ? Math.round(parseFloat(value) * 100) : 0,
        contactName: contact || undefined,
      }),
    });
    setTitle("");
    setValue("");
    setContact("");
    load();
  }

  async function move(deal: any, dir: -1 | 1) {
    const stages = board.stages;
    const idx = stages.findIndex((s: any) => s.id === deal.stageId);
    const next = stages[idx + dir];
    if (!next) return;
    await fetch(`/api/crm/deals/${deal.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stageId: next.id }),
    });
    load();
  }

  async function removeDeal(id: number) {
    await fetch(`/api/crm/deals/${id}`, { method: "DELETE" });
    load();
  }

  async function convertLead(id: number) {
    await fetch(`/api/crm/leads/${id}/convert`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    load();
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0e0e0e] text-gray-400">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0e0e0e] text-white">
      <Navigation />
      <main className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
              <DollarSign className="h-3.5 w-3.5" /> Agentic CRM
            </div>
            <h1 className="text-3xl font-bold">Pipeline</h1>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-500">Open pipeline value</div>
            <div className="text-2xl font-bold text-emerald-400">{money(board?.totalValueCents || 0)}</div>
          </div>
        </div>

        {/* New deal */}
        <div className="mb-6 flex flex-wrap gap-2 rounded-xl border border-white/10 bg-white/[0.02] p-3">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Deal title" className="flex-1 min-w-[160px] rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none" />
          <input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Contact" className="w-40 rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none" />
          <input value={value} onChange={(e) => setValue(e.target.value)} placeholder="Value $" type="number" className="w-28 rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none" />
          <button onClick={addDeal} className="flex items-center gap-1.5 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-gray-200">
            <Plus className="h-4 w-4" /> Add deal
          </button>
        </div>

        {/* Kanban */}
        <div className="mb-10 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          {board?.stages?.map((stage: any) => (
            <div key={stage.id} className="rounded-xl border border-white/10 bg-white/[0.02] p-2">
              <div className="mb-2 flex items-center justify-between px-1">
                <span className={`text-xs font-medium ${stage.kind === "won" ? "text-emerald-400" : stage.kind === "lost" ? "text-red-400" : "text-gray-300"}`}>
                  {stage.name}
                </span>
                <span className="text-[10px] text-gray-500">{stage.deals.length}</span>
              </div>
              <div className="space-y-2">
                {stage.deals.map((deal: any) => (
                  <div key={deal.id} className="group rounded-lg border border-white/10 bg-black/40 p-2.5">
                    <div className="text-sm font-medium">{deal.title}</div>
                    {deal.contactName && <div className="text-[11px] text-gray-500">{deal.contactName}</div>}
                    {deal.valueCents > 0 && <div className="mt-1 text-xs text-emerald-400">{money(deal.valueCents)}</div>}
                    <div className="mt-2 flex items-center justify-between opacity-0 transition group-hover:opacity-100">
                      <div className="flex gap-1">
                        <button onClick={() => move(deal, -1)} className="rounded p-1 hover:bg-white/10"><ChevronLeft className="h-3.5 w-3.5" /></button>
                        <button onClick={() => move(deal, 1)} className="rounded p-1 hover:bg-white/10"><ChevronRight className="h-3.5 w-3.5" /></button>
                      </div>
                      <button onClick={() => removeDeal(deal.id)} className="rounded p-1 text-gray-500 hover:bg-red-500/10 hover:text-red-400"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Leads inbox */}
        <div>
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
            <UserPlus className="h-5 w-5 text-blue-400" /> Captured leads
          </h2>
          {leads.length === 0 ? (
            <p className="text-sm text-gray-500">
              No leads yet. Capture them by POSTing to <code className="rounded bg-white/10 px-1">/api/crm/leads</code> from any form or webinar.
            </p>
          ) : (
            <div className="space-y-2">
              {leads.map((lead) => (
                <div key={lead.id} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3">
                  <div>
                    <div className="text-sm font-medium">{lead.name}</div>
                    <div className="text-xs text-gray-500">
                      {[lead.email, lead.company, lead.source].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                  {lead.status === "converted" ? (
                    <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-300">converted</span>
                  ) : (
                    <button onClick={() => convertLead(lead.id)} className="flex items-center gap-1 rounded-lg border border-white/10 px-3 py-1.5 text-xs hover:bg-white/5">
                      Convert to deal <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

"use client";

import { useEffect, useState, useCallback } from "react";
import Navigation from "@/components/sections/navigation";
import { Bell, Loader2, Check } from "lucide-react";

interface Note { id: number; type: string; title: string; body: string | null; link: string | null; readAt: string | null; createdAt: string; }
const ICON: Record<string, string> = { reminder: "⏰", tap: "👋", match: "🎉", meetup: "📅", message: "💬", system: "⚙️", general: "🔔" };

function when(iso: string) { return new Date(iso).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }); }

export default function NotificationsPage() {
  const [items, setItems] = useState<Note[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try { const d = await (await fetch("/api/notifications")).json(); setItems(d.notifications || []); setUnread(d.unread || 0); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const markAll = async () => { await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: "{}" }); load(); };
  const open = async (n: Note) => {
    await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: n.id }) });
    if (n.link) window.location.href = n.link; else load();
  };

  return (
    <div className="min-h-screen bg-[#070a10] text-white font-sans"><Navigation />
      <main className="max-w-2xl mx-auto px-5 py-10">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3"><Bell className="w-6 h-6 text-emerald-400" /><h1 className="text-3xl font-bold tracking-tight">Notifications</h1>{unread > 0 && <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-rose-400/20 text-rose-300">{unread} new</span>}</div>
          {unread > 0 && <button onClick={markAll} className="text-sm text-emerald-400 flex items-center gap-1"><Check className="w-4 h-4" /> Mark all read</button>}
        </div>

        {loading ? <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-emerald-400" /></div>
          : items.length === 0 ? <p className="text-slate-500 text-center py-20">You're all caught up.</p>
          : <div className="space-y-2">
              {items.map((n) => (
                <button key={n.id} onClick={() => open(n)}
                  className={`w-full text-left flex gap-3 rounded-xl border p-4 transition ${n.readAt ? "border-white/10 bg-white/[0.02]" : "border-emerald-400/20 bg-emerald-400/[0.06]"} hover:border-white/25`}>
                  <span className="text-lg" aria-hidden>{ICON[n.type] || "🔔"}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between gap-3">
                      <span className="font-medium">{n.title}</span>
                      <span className="text-xs text-slate-500 font-mono shrink-0">{when(n.createdAt)}</span>
                    </div>
                    {n.body && <p className="text-sm text-slate-400 mt-0.5">{n.body}</p>}
                  </div>
                  {!n.readAt && <span className="w-2 h-2 rounded-full bg-emerald-400 mt-2 shrink-0" />}
                </button>
              ))}
            </div>}
      </main>
    </div>
  );
}

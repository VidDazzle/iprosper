"use client";

import { useEffect, useState, useCallback } from "react";
import Navigation from "@/components/sections/navigation";
import { CalendarDays, Loader2, Plus, Trash2, MapPin, Bell, RefreshCw, Lock, Clock } from "lucide-react";

interface Ev { id: number; title: string; description: string | null; location: string | null; startsAt: string; endsAt: string; timezone: string; allDay: boolean; category: string; source: string; reminderMinutes: number | null; }
interface Sync { subscribed: boolean; syncing: boolean; }

const CAT_COLOR: Record<string, string> = { personal: "#38E4C9", health: "#5BC8FF", fitness: "#FF8A3D", family: "#FFC46B", social: "#8B7BFF", date: "#FF6B8A", errand: "#93A1B4", other: "#93A1B4" };
function toLocalInput(d: Date) { const p = (n: number) => String(n).padStart(2, "0"); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; }
function dayKey(iso: string, tz: string) { return new Date(iso).toLocaleDateString("en-US", { timeZone: tz, weekday: "long", month: "long", day: "numeric" }); }
function timeOnly(iso: string, tz: string) { return new Date(iso).toLocaleTimeString("en-US", { timeZone: tz, hour: "numeric", minute: "2-digit" }); }

export default function OrbitPage() {
  const [events, setEvents] = useState<Ev[]>([]);
  const [sync, setSync] = useState<Sync | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const tz = "America/New_York";

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [e, s] = await Promise.all([fetch("/api/orbit/events").then((r) => r.json()), fetch("/api/orbit/sync").then((r) => r.json())]);
      setEvents(e.events || []); setSync(s);
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const del = async (id: number) => { await fetch(`/api/orbit/events/${id}`, { method: "DELETE" }); load(); };
  const toggleSync = async () => {
    const res = await fetch("/api/orbit/sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ on: !sync?.syncing }) });
    const d = await res.json();
    if (d.error) alert(d.message || d.error);
    load();
  };

  // group by day
  const groups: Record<string, Ev[]> = {};
  for (const e of events) { const k = dayKey(e.startsAt, tz); (groups[k] ||= []).push(e); }

  return (
    <div className="min-h-screen bg-[#070a10] text-white font-sans"><Navigation />
      <main className="max-w-3xl mx-auto px-5 py-10">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-2">
          <div className="flex items-center gap-3"><CalendarDays className="w-6 h-6 text-aqua" style={{ color: "#38E4C9" }} /><h1 className="text-3xl font-bold tracking-tight">Orbit</h1><span className="text-xs font-mono uppercase tracking-widest text-slate-500">personal calendar</span></div>
          <button onClick={() => setShowAdd((v) => !v)} className="px-4 py-2 rounded-lg bg-emerald-400 text-black text-sm font-medium flex items-center gap-1.5"><Plus className="w-4 h-4" /> New event</button>
        </div>
        <p className="text-slate-400 mb-6">Your personal life, organized — separate from your Evolve business calendar.</p>

        {/* sync banner */}
        {sync && (
          <div className={`rounded-xl border p-3 mb-6 flex items-center justify-between gap-3 ${sync.syncing ? "border-emerald-400/30 bg-emerald-400/[0.06]" : "border-white/10 bg-white/[0.03]"}`}>
            <div className="flex items-center gap-2 text-sm">
              {sync.subscribed ? <RefreshCw className="w-4 h-4 text-emerald-400" /> : <Lock className="w-4 h-4 text-slate-500" />}
              <span className="text-slate-300">{sync.syncing ? "Syncing with your Evolve business calendar" : sync.subscribed ? "Sync with your Evolve business calendar" : "Sync with Evolve requires an Evolve subscription"}</span>
            </div>
            <button onClick={toggleSync} disabled={!sync.subscribed && !sync.syncing}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium ${sync.syncing ? "bg-emerald-400 text-black" : sync.subscribed ? "border border-white/15 text-slate-200" : "border border-white/10 text-slate-600 cursor-not-allowed"}`}>
              {sync.syncing ? "Sync ON" : sync.subscribed ? "Turn on sync" : "Subscribe to Evolve"}
            </button>
          </div>
        )}

        {showAdd && <AddEvent tz={tz} onDone={() => { setShowAdd(false); load(); }} />}

        {loading ? <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-emerald-400" /></div>
          : events.length === 0 ? <p className="text-slate-500 text-center py-16">Nothing scheduled. Add an event, or let Life, Fitness & Together fill it in.</p>
          : <div className="space-y-6">
              {Object.entries(groups).map(([d, evs]) => (
                <div key={d}>
                  <h3 className="text-sm font-mono uppercase tracking-widest text-slate-500 mb-2">{d}</h3>
                  <div className="space-y-2">
                    {evs.map((e) => (
                      <div key={e.id} className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
                        <div className="w-1 self-stretch rounded-full" style={{ background: CAT_COLOR[e.category] || "#38E4C9" }} />
                        <div className="text-xs font-mono text-slate-400 w-20 shrink-0 pt-0.5">{e.allDay ? "All day" : timeOnly(e.startsAt, tz)}</div>
                        <div className="min-w-0 flex-1">
                          <div className="font-medium">{e.title}</div>
                          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-0.5">
                            {e.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{e.location}</span>}
                            {e.reminderMinutes != null && <span className="flex items-center gap-1"><Bell className="w-3 h-3" />{e.reminderMinutes}m before</span>}
                            <span className="px-1.5 py-0.5 rounded" style={{ background: `${CAT_COLOR[e.category]}22`, color: CAT_COLOR[e.category] }}>{e.category}</span>
                          </div>
                        </div>
                        <button onClick={() => del(e.id)} className="text-slate-500 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>}
      </main>
    </div>
  );
}

function AddEvent({ tz, onDone }: { tz: string; onDone: () => void }) {
  const [title, setTitle] = useState("");
  const [start, setStart] = useState(toLocalInput(new Date(Date.now() + 3600_000)));
  const [durMin, setDurMin] = useState(60);
  const [location, setLocation] = useState("");
  const [category, setCategory] = useState("personal");
  const [reminder, setReminder] = useState(30);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!title.trim()) return; setBusy(true);
    try {
      const s = new Date(start); const e = new Date(s.getTime() + durMin * 60_000);
      await fetch("/api/orbit/events", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, startsAt: s.toISOString(), endsAt: e.toISOString(), location, category, reminderMinutes: reminder || null, timezone: tz }) });
      onDone();
    } finally { setBusy(false); }
  };
  const CATS = ["personal", "health", "fitness", "family", "social", "date", "errand"];
  return (
    <div className="rounded-xl border border-white/10 bg-black/30 p-4 mb-6 space-y-3">
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Event title" className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-400/60" />
      <div className="grid sm:grid-cols-2 gap-2">
        <input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-400/60 [color-scheme:dark]" />
        <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Location (optional)" className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-400/60" />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm [color-scheme:dark]">{CATS.map((c) => <option key={c} value={c}>{c}</option>)}</select>
        <label className="text-xs text-slate-500 flex items-center gap-1"><Clock className="w-3 h-3" /> for
          <select value={durMin} onChange={(e) => setDurMin(Number(e.target.value))} className="bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-sm [color-scheme:dark]">{[30, 60, 90, 120, 180].map((m) => <option key={m} value={m}>{m}m</option>)}</select>
        </label>
        <label className="text-xs text-slate-500 flex items-center gap-1"><Bell className="w-3 h-3" /> remind
          <select value={reminder} onChange={(e) => setReminder(Number(e.target.value))} className="bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-sm [color-scheme:dark]">{[0, 15, 30, 60, 120].map((m) => <option key={m} value={m}>{m === 0 ? "off" : `${m}m`}</option>)}</select>
        </label>
        <button onClick={save} disabled={busy} className="ml-auto px-4 py-2 rounded-lg bg-emerald-400 text-black text-sm font-medium flex items-center gap-1.5">{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Add</button>
      </div>
    </div>
  );
}

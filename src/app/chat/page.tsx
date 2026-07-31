"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Navigation from "@/components/sections/navigation";
import { MessageSquare, Loader2, Send, Users, ArrowLeft } from "lucide-react";

interface Thread { profileId: number; name: string; photoUrl: string | null; lastMessage: string | null; lastAt: string | null; unread: number; }
interface Msg { id: number; mine: boolean; body: string; at: string; }

function ago(iso: string | null) { if (!iso) return ""; const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000); if (s < 60) return "now"; if (s < 3600) return `${Math.floor(s / 60)}m`; if (s < 86400) return `${Math.floor(s / 3600)}h`; return `${Math.floor(s / 86400)}d`; }

export default function ChatPage() {
  const [actingAs, setActingAs] = useState("");
  const [threads, setThreads] = useState<Thread[]>([]);
  const [active, setActive] = useState<Thread | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const endRef = useRef<HTMLDivElement>(null);

  const q = actingAs ? `&email=${encodeURIComponent(actingAs)}` : "";
  const withEmail = (b: Record<string, unknown>) => (actingAs ? { ...b, email: actingAs } : b);

  const loadThreads = useCallback(async () => {
    setLoading(true);
    try { const d = await (await fetch(`/api/chat/threads?_=1${q}`)).json(); setThreads(d.threads || []); }
    finally { setLoading(false); }
  }, [q]);
  useEffect(() => { loadThreads(); }, [loadThreads]);

  const loadMsgs = useCallback(async (t: Thread) => {
    const d = await (await fetch(`/api/chat/messages?withProfileId=${t.profileId}${q}`)).json();
    setMsgs(d.messages || []);
    setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }, [q]);

  // Poll the open conversation.
  useEffect(() => {
    if (!active) return;
    loadMsgs(active);
    const t = setInterval(() => loadMsgs(active), 5000);
    return () => clearInterval(t);
  }, [active, loadMsgs]);

  const send = async () => {
    if (!text.trim() || !active) return;
    const body = text; setText("");
    const res = await fetch("/api/chat/messages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(withEmail({ toProfileId: active.profileId, body })) });
    const d = await res.json();
    if (!d.ok) { alert(d.message || "Couldn't send"); return; }
    loadMsgs(active); loadThreads();
  };

  return (
    <div className="min-h-screen bg-[#070a10] text-white font-sans"><Navigation />
      <main className="max-w-4xl mx-auto px-5 py-10">
        <div className="flex items-center gap-3 mb-4"><MessageSquare className="w-6 h-6 text-emerald-400" /><h1 className="text-3xl font-bold tracking-tight">Messages</h1></div>
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 mb-5 flex items-center gap-3">
          <Users className="w-4 h-4 text-slate-500" /><span className="text-sm text-slate-400">Acting as</span>
          <input value={actingAs} onChange={(e) => setActingAs(e.target.value)} onBlur={loadThreads} placeholder="you (owner) — or a test email"
            className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-emerald-400/60" />
        </div>

        <div className="grid md:grid-cols-[300px_1fr] gap-4 rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden min-h-[520px]">
          {/* thread list */}
          <div className={`border-r border-white/10 ${active ? "hidden md:block" : ""}`}>
            {loading ? <div className="flex justify-center py-16"><Loader2 className="w-5 h-5 animate-spin text-emerald-400" /></div>
              : threads.length === 0 ? <p className="text-sm text-slate-500 p-5">No conversations yet. Match with someone on Discover, or connect a partner on Together, to start chatting.</p>
              : threads.map((t) => (
                <button key={t.profileId} onClick={() => setActive(t)} className={`w-full text-left flex items-center gap-3 px-4 py-3 border-b border-white/5 hover:bg-white/[0.03] ${active?.profileId === t.profileId ? "bg-white/[0.05]" : ""}`}>
                  {t.photoUrl ? <img src={t.photoUrl} alt="" className="w-10 h-10 rounded-full object-cover" /> : <div className="w-10 h-10 rounded-full bg-emerald-400/20" />}
                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between gap-2"><span className="font-medium truncate">{t.name}</span><span className="text-xs text-slate-500 shrink-0">{ago(t.lastAt)}</span></div>
                    <div className="text-xs text-slate-500 truncate">{t.lastMessage || "Say hi 👋"}</div>
                  </div>
                  {t.unread > 0 && <span className="w-5 h-5 rounded-full bg-rose-400 text-black text-[11px] font-bold grid place-items-center">{t.unread}</span>}
                </button>
              ))}
          </div>

          {/* conversation */}
          <div className={`flex flex-col ${active ? "" : "hidden md:flex"}`}>
            {!active ? <div className="flex-1 grid place-items-center text-slate-600 text-sm">Pick a conversation</div>
              : <>
                  <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
                    <button onClick={() => setActive(null)} className="md:hidden text-slate-400"><ArrowLeft className="w-5 h-5" /></button>
                    {active.photoUrl ? <img src={active.photoUrl} alt="" className="w-8 h-8 rounded-full object-cover" /> : <div className="w-8 h-8 rounded-full bg-emerald-400/20" />}
                    <span className="font-medium">{active.name}</span>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-2 max-h-[380px]">
                    {msgs.length === 0 && <p className="text-center text-slate-600 text-sm py-10">No messages yet — say hello.</p>}
                    {msgs.map((m) => (
                      <div key={m.id} className={`flex ${m.mine ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[75%] px-3.5 py-2 rounded-2xl text-sm ${m.mine ? "bg-emerald-400 text-black rounded-br-sm" : "bg-white/10 text-white rounded-bl-sm"}`}>{m.body}</div>
                      </div>
                    ))}
                    <div ref={endRef} />
                  </div>
                  <div className="p-3 border-t border-white/10 flex gap-2">
                    <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Message…" className="flex-1 bg-black/40 border border-white/10 rounded-full px-4 py-2 text-sm outline-none focus:border-emerald-400/60" />
                    <button onClick={send} className="w-10 h-10 rounded-full bg-emerald-400 text-black grid place-items-center"><Send className="w-4 h-4" /></button>
                  </div>
                </>}
          </div>
        </div>
      </main>
    </div>
  );
}

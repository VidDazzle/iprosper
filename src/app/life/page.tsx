"use client";

import { useEffect, useState, useCallback } from "react";
import Navigation from "@/components/sections/navigation";
import {
  Sparkles, Loader2, Bell, Mail, MessageSquare, Smartphone, Phone,
  Clock, MapPin, Star, ExternalLink, Check, X, Film, Utensils,
  Bike, Dumbbell, Music, ShoppingBag, CalendarClock, ChevronRight, Zap, ArrowUpRight,
} from "lucide-react";

// ---- types ---------------------------------------------------------------
interface Question { category: string; question: string; hint: string; options: string[]; freeText?: boolean; icon: string; }
interface Profile {
  id: number; email: string; name: string | null; city: string | null;
  timezone: string; reminderChannel: string; phone: string | null;
  quietHoursStart: string | null; quietHoursEnd: string | null; onboarded: boolean;
}
interface Suggestion {
  kind: string; title: string; subtitle: string | null; rating: number | null;
  reviewCount: number | null; distanceKm: number | null; url: string | null;
  detail: string | null; showtimes?: string[]; why: string | null;
}
interface FreeSlot { start: string; end: string; label: string; }
interface ConciergeResult { category: string; freeSlots: FreeSlot[]; suggestions: Suggestion[]; message: string; }
interface Reminder {
  id: number; title: string; detail: string | null; category: string;
  whenAt: string; channel: string; recurrence: string; status: string;
}

const CHANNELS = [
  { key: "email", label: "Email", icon: Mail },
  { key: "sms", label: "Text", icon: MessageSquare },
  { key: "push", label: "Notification", icon: Smartphone },
  { key: "voice", label: "Voice agent", icon: Phone },
];

function fmt(iso: string, tz = "America/New_York") {
  return new Date(iso).toLocaleString("en-US", { timeZone: tz, weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}
function toLocalInput(d: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export default function LifePage() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [prefs, setPrefs] = useState<Record<string, string[]>>({});
  const [reminders, setReminders] = useState<Reminder[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, cRes, rRes] = await Promise.all([
        fetch("/api/life/profile"), fetch("/api/life/catalog"), fetch("/api/life/reminders"),
      ]);
      const p = await pRes.json(); const c = await cRes.json(); const r = await rRes.json();
      setProfile(p.profile); setPrefs(p.preferences || {}); setQuestions(c.questions || []); setReminders(r.reminders || []);
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070a10] text-white"><Navigation />
        <div className="flex items-center justify-center py-40"><Loader2 className="w-6 h-6 animate-spin text-emerald-400" /></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070a10] text-white font-sans"><Navigation />
      <main className="max-w-5xl mx-auto px-5 py-10">
        <div className="flex items-center gap-3 mb-2">
          <Sparkles className="w-6 h-6 text-emerald-400" />
          <h1 className="text-3xl font-bold tracking-tight">Orbit Life</h1>
        </div>
        <p className="text-slate-400 mb-8">Your personal concierge — entertainment, food, recreation, health, and reminders, tuned to you. Part of Orbit, your casual life app; on your computer and your phone, always in sync.</p>

        {profile && !profile.onboarded
          ? <Onboarding questions={questions} initialPrefs={prefs} profile={profile} onDone={load} />
          : profile && <Dashboard profile={profile} prefs={prefs} reminders={reminders} onChange={load} />}
      </main>
    </div>
  );
}

// ---- onboarding ----------------------------------------------------------
function Onboarding({ questions, initialPrefs, profile, onDone }: { questions: Question[]; initialPrefs: Record<string, string[]>; profile: Profile; onDone: () => void; }) {
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<Record<string, string[]>>(initialPrefs);
  const [freeText, setFreeText] = useState("");
  const [city, setCity] = useState(profile.city || "");
  const [channel, setChannel] = useState(profile.reminderChannel || "email");
  const [saving, setSaving] = useState(false);
  const total = questions.length + 1; // +1 for the "where + how" step

  const q = questions[step];
  const toggle = (cat: string, opt: string) => setSelected((s) => {
    const cur = s[cat] || []; return { ...s, [cat]: cur.includes(opt) ? cur.filter((x) => x !== opt) : [...cur, opt] };
  });

  const next = async () => {
    if (q?.freeText) {
      const values = freeText.split(",").map((x) => x.trim()).filter(Boolean);
      setSelected((s) => ({ ...s, [q.category]: values }));
    }
    if (step < questions.length - 1) { setStep(step + 1); return; }
    setStep(questions.length); // final settings step
  };

  const finish = async () => {
    setSaving(true);
    try {
      for (const [category, values] of Object.entries(selected)) {
        if (!values || !values.length) continue;
        await fetch("/api/life/preferences", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ category, values }) });
      }
      await fetch("/api/life/profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ city, reminderChannel: channel, onboarded: true }) });
      onDone();
    } finally { setSaving(false); }
  };

  const onSettings = step >= questions.length;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-7">
      <div className="flex items-center gap-2 mb-6">
        {Array.from({ length: total }).map((_, i) => (
          <div key={i} className={`h-1.5 rounded-full flex-1 ${i <= step ? "bg-emerald-400" : "bg-white/10"}`} />
        ))}
      </div>

      {!onSettings ? (
        <>
          <div className="text-xs font-mono uppercase tracking-widest text-emerald-400 mb-2">Step {step + 1} of {total}</div>
          <h2 className="text-2xl font-semibold mb-1">{q.question}</h2>
          <p className="text-slate-400 mb-6">{q.hint}</p>
          {q.freeText ? (
            <input value={freeText} onChange={(e) => setFreeText(e.target.value)} placeholder="e.g. Joe's Pizza, The Coffee Bar, Rosa's Cantina"
              className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-3 outline-none focus:border-emerald-400" />
          ) : (
            <div className="flex flex-wrap gap-2.5">
              {q.options.map((opt) => {
                const on = (selected[q.category] || []).includes(opt);
                return (
                  <button key={opt} onClick={() => toggle(q.category, opt)}
                    className={`px-4 py-2 rounded-full border text-sm transition ${on ? "bg-emerald-400 text-black border-emerald-400 font-medium" : "border-white/15 text-slate-200 hover:border-emerald-400/60"}`}>
                    {opt}{on && <Check className="inline w-3.5 h-3.5 ml-1.5" />}
                  </button>
                );
              })}
            </div>
          )}
        </>
      ) : (
        <>
          <div className="text-xs font-mono uppercase tracking-widest text-emerald-400 mb-2">Last step</div>
          <h2 className="text-2xl font-semibold mb-1">Where are you, and how should we reach you?</h2>
          <p className="text-slate-400 mb-6">So we can find what's closest and remind you the way you like.</p>
          <label className="block text-sm text-slate-300 mb-1.5">Your city / area</label>
          <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Austin, TX"
            className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-3 outline-none focus:border-emerald-400 mb-5" />
          <label className="block text-sm text-slate-300 mb-2">Remind me by</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {CHANNELS.map(({ key, label, icon: Icon }) => (
              <button key={key} onClick={() => setChannel(key)}
                className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border transition ${channel === key ? "bg-emerald-400/10 border-emerald-400 text-emerald-300" : "border-white/10 text-slate-300 hover:border-white/25"}`}>
                <Icon className="w-5 h-5" /><span className="text-sm">{label}</span>
              </button>
            ))}
          </div>
        </>
      )}

      <div className="flex justify-between mt-8">
        <button onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}
          className="px-4 py-2 rounded-lg text-slate-400 disabled:opacity-30 hover:text-white">Back</button>
        {!onSettings ? (
          <button onClick={next} className="px-6 py-2.5 rounded-lg bg-white text-black font-medium flex items-center gap-1.5">
            Continue <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button onClick={finish} disabled={saving} className="px-6 py-2.5 rounded-lg bg-emerald-400 text-black font-medium flex items-center gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} Start using Orbit
          </button>
        )}
      </div>
    </div>
  );
}

// ---- dashboard -----------------------------------------------------------
const CAT_ICON: Record<string, typeof Film> = {
  movie: Film, dining: Utensils, recreation: Bike, fitness: Dumbbell, entertainment: Music, errand: ShoppingBag,
};

function Dashboard({ profile, prefs, reminders, onChange }: { profile: Profile; prefs: Record<string, string[]>; reminders: Reminder[]; onChange: () => void; }) {
  const [text, setText] = useState("");
  const [asking, setAsking] = useState(false);
  const [result, setResult] = useState<ConciergeResult | null>(null);
  const [capped, setCapped] = useState<string | null>(null);
  const [buying, setBuying] = useState(false);

  const ask = async (preset?: string) => {
    const q = preset || text; if (!q.trim()) return;
    setAsking(true); setResult(null); setCapped(null);
    try {
      const res = await fetch("/api/life/concierge", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: q }) });
      if (res.status === 402) {
        const d = await res.json().catch(() => ({}));
        setCapped(d.error || "You've used all your Orbit credits for this month.");
        return;
      }
      setResult(await res.json());
    } finally { setAsking(false); }
  };

  const buyCredits = async (units: number) => {
    setBuying(true);
    try {
      const res = await fetch("/api/billing/credits/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ product: "orbit", units }) });
      const d = await res.json();
      if (d.checkoutUrl) { window.location.href = d.checkoutUrl; return; }
      setCapped(d.note || "Order recorded — credits are granted once payment is confirmed.");
    } finally { setBuying(false); }
  };

  const remind = async (title: string, whenAt?: string) => {
    await fetch("/api/life/reminders", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, whenAt: whenAt || new Date(Date.now() + 3600_000).toISOString(), category: result?.category || "personal" }) });
    onChange();
  };

  const Icon = result ? (CAT_ICON[result.category] || Sparkles) : Sparkles;
  const presets = ["I want to see a movie tonight", "Where's the closest place for tacos", "I feel like biking this weekend", "Find me a gym class tomorrow"];

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      {/* concierge column */}
      <div className="lg:col-span-2 space-y-6">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <label className="block text-sm text-slate-300 mb-2">What do you feel like doing?</label>
          <div className="flex gap-2">
            <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && ask()}
              placeholder="e.g. I want to see a movie…"
              className="flex-1 rounded-xl bg-black/40 border border-white/10 px-4 py-3 outline-none focus:border-emerald-400" />
            <button onClick={() => ask()} disabled={asking} className="px-5 rounded-xl bg-emerald-400 text-black font-medium flex items-center gap-2">
              {asking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} Ask
            </button>
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            {presets.map((p) => (
              <button key={p} onClick={() => { setText(p); ask(p); }} className="text-xs px-3 py-1.5 rounded-full border border-white/10 text-slate-400 hover:border-emerald-400/50 hover:text-slate-200">{p}</button>
            ))}
          </div>
        </div>

        {capped && (
          <div className="rounded-2xl border border-amber-400/30 bg-amber-400/[0.06] p-6">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-400/15 flex items-center justify-center shrink-0"><Zap className="w-5 h-5 text-amber-300" /></div>
              <div className="min-w-0">
                <div className="font-semibold text-amber-100">Out of Orbit credits</div>
                <p className="text-sm text-slate-300 mt-1">{capped}</p>
                <div className="flex flex-wrap gap-2 mt-4">
                  <button onClick={() => buyCredits(50)} disabled={buying} className="px-4 py-2 rounded-lg bg-amber-400 text-black text-sm font-medium flex items-center gap-1.5 disabled:opacity-50">
                    {buying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />} Buy 50 credits
                  </button>
                  <a href="/plans" className="px-4 py-2 rounded-lg border border-white/15 text-slate-200 text-sm flex items-center gap-1.5">Upgrade plan <ArrowUpRight className="w-4 h-4" /></a>
                </div>
              </div>
            </div>
          </div>
        )}

        {result && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <div className="flex items-start gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-emerald-400/10 flex items-center justify-center"><Icon className="w-5 h-5 text-emerald-400" /></div>
              <p className="text-slate-200 leading-relaxed pt-1">{result.message}</p>
            </div>

            {result.freeSlots.length > 0 && (
              <div className="mb-5">
                <div className="text-xs font-mono uppercase tracking-widest text-slate-500 mb-2 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> You're free</div>
                <div className="flex flex-wrap gap-2">
                  {result.freeSlots.map((s) => (
                    <span key={s.start} className="px-3 py-1.5 rounded-lg bg-black/40 border border-white/10 text-sm text-slate-200">{s.label}</span>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-3">
              {result.suggestions.map((s, i) => (
                <div key={i} className="rounded-xl border border-white/10 bg-black/30 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold text-white flex items-center gap-2">{s.title}</div>
                      {s.subtitle && <div className="text-sm text-slate-400 truncate">{s.subtitle}</div>}
                      <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-400">
                        {s.rating != null && <span className="flex items-center gap-1 text-amber-300"><Star className="w-3.5 h-3.5 fill-amber-300" />{s.rating}{s.reviewCount ? ` (${s.reviewCount})` : ""}</span>}
                        {s.distanceKm != null && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{s.distanceKm} km</span>}
                        {s.why && <span className="text-emerald-400">{s.why}</span>}
                      </div>
                      {s.showtimes && s.showtimes.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {s.showtimes.map((t) => <span key={t} className="px-2 py-0.5 rounded bg-violet-500/15 text-violet-300 text-xs">{t}</span>)}
                        </div>
                      )}
                      {s.detail && <p className="text-sm text-slate-400 mt-2">{s.detail}</p>}
                    </div>
                    <div className="flex flex-col gap-2 shrink-0">
                      {s.url && <a href={s.url} target="_blank" rel="noreferrer" className="p-2 rounded-lg border border-white/10 hover:border-white/25" title="Open"><ExternalLink className="w-4 h-4" /></a>}
                      <button onClick={() => remind(s.title, result.freeSlots[0]?.start)} className="p-2 rounded-lg border border-emerald-400/40 text-emerald-300 hover:bg-emerald-400/10" title="Remind me"><Bell className="w-4 h-4" /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* sidebar: reminders + you */}
      <div className="space-y-6">
        <Reminders profile={profile} reminders={reminders} onChange={onChange} />
        <YouCard profile={profile} prefs={prefs} onChange={onChange} />
      </div>
    </div>
  );
}

function Reminders({ profile, reminders, onChange }: { profile: Profile; reminders: Reminder[]; onChange: () => void; }) {
  const [title, setTitle] = useState("");
  const [when, setWhen] = useState(toLocalInput(new Date(Date.now() + 3600_000)));
  const [channel, setChannel] = useState("inherit");
  const [adding, setAdding] = useState(false);
  const upcoming = reminders.filter((r) => r.status === "scheduled");

  const add = async () => {
    if (!title.trim()) return;
    setAdding(true);
    try {
      await fetch("/api/life/reminders", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, whenAt: new Date(when).toISOString(), channel }) });
      setTitle(""); onChange();
    } finally { setAdding(false); }
  };
  const setStatus = async (id: number, status: string) => {
    await fetch("/api/life/reminders", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status }) });
    onChange();
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="flex items-center gap-2 mb-4"><Bell className="w-4 h-4 text-emerald-400" /><h3 className="font-semibold">Reminders</h3></div>
      <div className="space-y-2 mb-4">
        {upcoming.length === 0 && <p className="text-sm text-slate-500">Nothing scheduled yet.</p>}
        {upcoming.map((r) => (
          <div key={r.id} className="flex items-start justify-between gap-2 rounded-lg bg-black/30 border border-white/10 p-3">
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">{r.title}</div>
              <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5"><CalendarClock className="w-3 h-3" />{fmt(r.whenAt, profile.timezone)} · {r.channel === "inherit" ? profile.reminderChannel : r.channel}</div>
            </div>
            <div className="flex gap-1 shrink-0">
              <button onClick={() => setStatus(r.id, "done")} className="p-1.5 rounded hover:bg-emerald-400/10 text-emerald-400" title="Done"><Check className="w-3.5 h-3.5" /></button>
              <button onClick={() => setStatus(r.id, "cancelled")} className="p-1.5 rounded hover:bg-red-400/10 text-red-400" title="Cancel"><X className="w-3.5 h-3.5" /></button>
            </div>
          </div>
        ))}
      </div>
      <div className="space-y-2 border-t border-white/10 pt-4">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Remind me to…" className="w-full rounded-lg bg-black/40 border border-white/10 px-3 py-2 text-sm outline-none focus:border-emerald-400" />
        <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} className="w-full rounded-lg bg-black/40 border border-white/10 px-3 py-2 text-sm outline-none focus:border-emerald-400 [color-scheme:dark]" />
        <div className="flex gap-2">
          <select value={channel} onChange={(e) => setChannel(e.target.value)} className="flex-1 rounded-lg bg-black/40 border border-white/10 px-3 py-2 text-sm outline-none [color-scheme:dark]">
            <option value="inherit">My default ({profile.reminderChannel})</option>
            {CHANNELS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
          </select>
          <button onClick={add} disabled={adding} className="px-4 rounded-lg bg-emerald-400 text-black text-sm font-medium flex items-center gap-1">{adding ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add"}</button>
        </div>
      </div>
    </div>
  );
}

function YouCard({ profile, prefs, onChange }: { profile: Profile; prefs: Record<string, string[]>; onChange: () => void; }) {
  const [channel, setChannel] = useState(profile.reminderChannel);
  const save = async (ch: string) => {
    setChannel(ch);
    await fetch("/api/life/profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reminderChannel: ch }) });
    onChange();
  };
  const chips = Object.entries(prefs).flatMap(([, vals]) => vals).slice(0, 12);
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <h3 className="font-semibold mb-3">You</h3>
      {profile.city && <div className="text-sm text-slate-400 flex items-center gap-1.5 mb-3"><MapPin className="w-3.5 h-3.5" />{profile.city}</div>}
      <div className="text-xs font-mono uppercase tracking-widest text-slate-500 mb-2">Remind me by</div>
      <div className="grid grid-cols-2 gap-2 mb-4">
        {CHANNELS.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => save(key)} className={`flex items-center justify-center gap-1.5 py-2 rounded-lg border text-sm transition ${channel === key ? "bg-emerald-400/10 border-emerald-400 text-emerald-300" : "border-white/10 text-slate-300 hover:border-white/25"}`}>
            <Icon className="w-4 h-4" />{label}
          </button>
        ))}
      </div>
      {chips.length > 0 && (
        <>
          <div className="text-xs font-mono uppercase tracking-widest text-slate-500 mb-2">Your tastes</div>
          <div className="flex flex-wrap gap-1.5">
            {chips.map((c) => <span key={c} className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-slate-300">{c}</span>)}
          </div>
        </>
      )}
    </div>
  );
}

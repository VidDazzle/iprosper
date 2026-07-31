"use client";

import { useEffect, useState, useCallback } from "react";
import Navigation from "@/components/sections/navigation";
import {
  Compass, Loader2, MapPin, ShieldCheck, ShieldAlert, Lock, Sparkles,
  Users, Hand, Heart, Eye, Radar, Phone, CalendarClock, Check, X,
  Flag, Ban, UserX, MessageSquare,
} from "lucide-react";

interface Settings { discoverable: boolean; discoveryRadiusMiles: number; discoveryPhotoUrl: string | null; displayName: string | null; hasLocation: boolean; verified: boolean; }
interface Person { profileId: number; name: string; distance: string; sharedInterests: string[]; photoUrl: string | null; theyTappedMe: boolean; iTappedThem: boolean; matched: boolean; }
interface Meetup { id: number; fromMe: boolean; whenAt: string; note: string | null; status: string; }
interface Match { profileId: number; name: string; photoUrl: string | null; iSharedPhone: boolean; partnerPhone: string | null; meetups: Meetup[]; }

function toLocalInput(d: Date) { const p = (n: number) => String(n).padStart(2, "0"); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; }
function fmtWhen(iso: string) { return new Date(iso).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }); }

export default function DiscoverPage() {
  const [actingAs, setActingAs] = useState("");
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [people, setPeople] = useState<Person[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [needsLocation, setNeedsLocation] = useState(false);
  const [busy, setBusy] = useState(false);

  const q = actingAs ? `?email=${encodeURIComponent(actingAs)}` : "";
  const withEmail = (b: Record<string, unknown>) => (actingAs ? { ...b, email: actingAs } : b);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, n, m] = await Promise.all([
        fetch(`/api/discovery/settings${q}`).then((r) => r.json()),
        fetch(`/api/discovery/nearby${q}`).then((r) => r.json()),
        fetch(`/api/discovery/matches${q}`).then((r) => r.json()),
      ]);
      setSettings(s); setPeople(n.people || []); setNeedsLocation(!!n.needsLocation); setMatches(m.matches || []);
    } finally { setLoading(false); }
  }, [q]);
  useEffect(() => { load(); }, [load]);

  const put = async (patch: Record<string, unknown>) => {
    const res = await fetch("/api/discovery/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(withEmail(patch)) });
    const d = await res.json();
    if (d.error) alert(d.message || d.error);
    load();
  };
  const shareLocation = () => {
    if (!navigator.geolocation) { alert("Geolocation not available"); return; }
    navigator.geolocation.getCurrentPosition((pos) => put({ lat: pos.coords.latitude, lng: pos.coords.longitude }), () => alert("Couldn't get location"));
  };
  const verify = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/together/identity/start", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(withEmail({})) });
      const d = await res.json();
      if (d.url) window.open(d.url, "_blank");
      else if (d.sandbox) await fetch("/api/together/identity/webhook", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sandbox: true, email: actingAs || undefined }) });
      load();
    } finally { setBusy(false); }
  };
  const tap = async (toProfileId: number) => {
    const res = await fetch("/api/discovery/tap", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(withEmail({ toProfileId })) });
    const d = await res.json();
    if (d.error) alert(d.message || d.error); else if (d.matched) alert(d.message);
    load();
  };
  const block = async (toProfileId: number) => {
    if (!confirm("Block this person? They’ll be hidden from you both ways and unmatched.")) return;
    await fetch("/api/discovery/block", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(withEmail({ toProfileId })) });
    load();
  };
  const report = async (toProfileId: number) => {
    const reason = prompt("What's wrong? (e.g. harassment, fake profile, inappropriate)");
    if (!reason) return;
    const res = await fetch("/api/discovery/report", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(withEmail({ toProfileId, reason })) });
    const d = await res.json(); alert(d.message || "Reported."); load();
  };

  return (
    <div className="min-h-screen bg-[#070a10] text-white font-sans"><Navigation />
      <main className="max-w-5xl mx-auto px-5 py-10">
        <div className="flex items-center gap-3 mb-2"><Compass className="w-6 h-6 text-cyan-400" /><h1 className="text-3xl font-bold tracking-tight">Evolve Discover</h1></div>
        <p className="text-slate-400 mb-6">Meet people near you who love the same things — fishing, hunting, ball games, whatever’s your thing. Your exact location is never shared; only a rough distance. Tap someone to reveal your photo to them — if they tap back, it’s a match.</p>

        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 mb-6 flex items-center gap-3">
          <Users className="w-4 h-4 text-slate-500" /><span className="text-sm text-slate-400">Acting as</span>
          <input value={actingAs} onChange={(e) => setActingAs(e.target.value)} onBlur={load} placeholder="you (owner) — or a test email"
            className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-cyan-400/60" />
        </div>

        {loading || !settings ? <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-cyan-400" /></div> : (
          <div className="space-y-6">
            {/* settings */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h3 className="font-semibold flex items-center gap-2"><Radar className="w-4 h-4 text-cyan-400" /> Your discovery</h3>
                  <p className="text-sm text-slate-400 mt-1">Turn this on to appear to nearby people with shared interests.</p>
                </div>
                <button
                  onClick={() => put({ discoverable: !settings.discoverable })}
                  className={`px-4 py-2 rounded-lg text-sm font-medium ${settings.discoverable ? "bg-cyan-400 text-black" : "border border-white/15 text-slate-200"}`}>
                  {settings.discoverable ? "Discoverable · ON" : "Go discoverable"}
                </button>
              </div>

              {/* prerequisites */}
              <div className="grid sm:grid-cols-3 gap-3 mt-5">
                <div className={`rounded-lg border p-3 ${settings.verified ? "border-emerald-400/30 bg-emerald-400/5" : "border-amber-400/30 bg-amber-400/5"}`}>
                  <div className="flex items-center gap-2 text-sm">{settings.verified ? <ShieldCheck className="w-4 h-4 text-emerald-400" /> : <ShieldAlert className="w-4 h-4 text-amber-300" />} Identity</div>
                  {settings.verified ? <div className="text-xs text-emerald-300 mt-1">Verified</div> : <button onClick={verify} disabled={busy} className="text-xs mt-1.5 px-2 py-1 rounded bg-amber-400 text-black font-medium">{busy ? "…" : "Verify now"}</button>}
                </div>
                <div className={`rounded-lg border p-3 ${settings.hasLocation ? "border-emerald-400/30 bg-emerald-400/5" : "border-white/10"}`}>
                  <div className="flex items-center gap-2 text-sm"><MapPin className="w-4 h-4 text-slate-400" /> Location</div>
                  {settings.hasLocation ? <div className="text-xs text-emerald-300 mt-1">Shared (coarse only)</div> : <button onClick={shareLocation} className="text-xs mt-1.5 px-2 py-1 rounded border border-white/15">Share</button>}
                </div>
                <div className="rounded-lg border border-white/10 p-3">
                  <div className="text-sm">Radius: <span className="text-cyan-300">{settings.discoveryRadiusMiles} mi</span></div>
                  <input type="range" min={1} max={25} value={settings.discoveryRadiusMiles} onChange={(e) => put({ discoveryRadiusMiles: Number(e.target.value) })} className="w-full mt-2 accent-cyan-400" />
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-3 mt-3">
                <input defaultValue={settings.displayName || ""} onBlur={(e) => put({ displayName: e.target.value })} placeholder="Display name" className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-cyan-400/60" />
                <input defaultValue={settings.discoveryPhotoUrl || ""} onBlur={(e) => put({ discoveryPhotoUrl: e.target.value })} placeholder="Discovery photo URL" className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-cyan-400/60" />
              </div>
            </div>

            {/* matches */}
            {matches.length > 0 && (
              <div className="rounded-2xl border border-rose-400/20 bg-rose-400/5 p-6">
                <h3 className="font-semibold flex items-center gap-2 mb-4"><Heart className="w-4 h-4 text-rose-400" /> Your matches</h3>
                <div className="space-y-4">
                  {matches.map((m) => <MatchCard key={m.profileId} m={m} withEmail={withEmail} onChange={load} onBlock={block} onReport={report} />)}
                </div>
              </div>
            )}

            {/* nearby */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <h3 className="font-semibold flex items-center gap-2 mb-4"><Sparkles className="w-4 h-4 text-cyan-400" /> Nearby, with shared interests</h3>
              {needsLocation ? <p className="text-sm text-slate-500">Share your location to see who’s nearby.</p>
                : people.length === 0 ? <p className="text-sm text-slate-500">No one nearby with matching interests yet. Widen your radius or check back.</p>
                : <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {people.map((p) => (
                      <div key={p.profileId} className="rounded-xl border border-white/10 bg-black/30 overflow-hidden">
                        <div className="aspect-[4/3] bg-black/50 flex items-center justify-center relative">
                          {p.photoUrl ? <img src={p.photoUrl} alt={p.name} className="w-full h-full object-cover" />
                            : <div className="text-center text-slate-500"><Lock className="w-6 h-6 mx-auto mb-1" /><div className="text-xs">photo hidden</div>{p.theyTappedMe && <div className="text-[10px] text-cyan-400 mt-0.5">they tapped you</div>}</div>}
                          {p.matched && <span className="absolute top-2 right-2 text-[10px] px-2 py-0.5 rounded-full bg-rose-400 text-black font-medium">match</span>}
                        </div>
                        <div className="p-3">
                          <div className="flex items-center justify-between">
                            <div className="font-medium">{p.name}</div>
                            <div className="text-xs text-slate-500 flex items-center gap-1"><MapPin className="w-3 h-3" />{p.distance}</div>
                          </div>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {p.sharedInterests.slice(0, 4).map((i) => <span key={i} className="text-[11px] px-2 py-0.5 rounded-full bg-cyan-400/10 text-cyan-300">{i}</span>)}
                          </div>
                          <div className="flex items-center gap-2 mt-3">
                            <button onClick={() => tap(p.profileId)} disabled={p.iTappedThem}
                              className={`flex-1 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-1.5 ${p.matched ? "bg-rose-400 text-black" : p.iTappedThem ? "border border-white/10 text-slate-500" : "bg-cyan-400 text-black"}`}>
                              {p.matched ? <><Heart className="w-4 h-4" /> Matched</> : p.iTappedThem ? <><Eye className="w-4 h-4" /> Tapped — photo shared</> : <><Hand className="w-4 h-4" /> Tap {p.theyTappedMe ? "back" : ""}</>}
                            </button>
                            <button onClick={() => report(p.profileId)} title="Report" className="p-2 rounded-lg border border-white/10 text-slate-400 hover:text-amber-300 hover:border-amber-300/40"><Flag className="w-4 h-4" /></button>
                            <button onClick={() => block(p.profileId)} title="Block" className="p-2 rounded-lg border border-white/10 text-slate-400 hover:text-red-300 hover:border-red-300/40"><Ban className="w-4 h-4" /></button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>}
              <p className="text-xs text-slate-600 mt-4">Tapping reveals your photo to that person only. We never show anyone your exact location — just a rough distance.</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function MatchCard({ m, withEmail, onChange, onBlock, onReport }: { m: Match; withEmail: (b: Record<string, unknown>) => Record<string, unknown>; onChange: () => void; onBlock: (id: number) => void; onReport: (id: number) => void; }) {
  const [when, setWhen] = useState(toLocalInput(new Date(Date.now() + 86400_000)));
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const unmatch = async () => {
    if (!confirm(`Unmatch with ${m.name}?`)) return;
    await fetch("/api/discovery/unmatch", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(withEmail({ toProfileId: m.profileId })) });
    onChange();
  };

  const sharePhone = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/discovery/share-phone", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(withEmail({ toProfileId: m.profileId })) });
      const d = await res.json(); if (d.message && !d.ok) alert(d.message);
      onChange();
    } finally { setBusy(false); }
  };
  const requestTime = async () => {
    setBusy(true);
    try {
      await fetch("/api/discovery/meetup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(withEmail({ toProfileId: m.profileId, whenAt: new Date(when).toISOString(), note })) });
      setNote(""); onChange();
    } finally { setBusy(false); }
  };
  const respond = async (id: number, action: string) => {
    await fetch("/api/discovery/meetup", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(withEmail({ id, action })) });
    onChange();
  };

  return (
    <div className="rounded-xl border border-white/10 bg-black/30 p-4">
      <div className="flex items-center gap-3">
        {m.photoUrl ? <img src={m.photoUrl} alt={m.name} className="w-11 h-11 rounded-full object-cover" /> : <div className="w-11 h-11 rounded-full bg-rose-400/20" />}
        <div className="flex-1 min-w-0">
          <div className="font-medium">{m.name}</div>
          <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
            {m.partnerPhone ? <span className="flex items-center gap-1 text-emerald-300"><Phone className="w-3 h-3" />{m.partnerPhone}</span> : <span className="text-slate-600">number not shared yet</span>}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <a href="/chat" title="Message" className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-400 text-black flex items-center gap-1"><MessageSquare className="w-3.5 h-3.5" /> Message</a>
          <button onClick={sharePhone} disabled={busy || m.iSharedPhone}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 ${m.iSharedPhone ? "border border-white/10 text-slate-500" : "bg-cyan-400 text-black"}`}>
            <Phone className="w-3.5 h-3.5" />{m.iSharedPhone ? "Number shared" : "Share my number"}
          </button>
          <button onClick={unmatch} title="Unmatch" className="p-1.5 rounded-lg border border-white/10 text-slate-400 hover:text-slate-200"><UserX className="w-4 h-4" /></button>
          <button onClick={() => onReport(m.profileId)} title="Report" className="p-1.5 rounded-lg border border-white/10 text-slate-400 hover:text-amber-300"><Flag className="w-4 h-4" /></button>
          <button onClick={() => onBlock(m.profileId)} title="Block" className="p-1.5 rounded-lg border border-white/10 text-slate-400 hover:text-red-300"><Ban className="w-4 h-4" /></button>
        </div>
      </div>

      {/* incoming/outgoing meetup requests */}
      {m.meetups.length > 0 && (
        <div className="mt-3 space-y-2">
          {m.meetups.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-2 rounded-lg bg-white/[0.03] border border-white/10 px-3 py-2">
              <div className="text-sm flex items-center gap-2"><CalendarClock className="w-3.5 h-3.5 text-slate-400" />{fmtWhen(r.whenAt)}{r.note && <span className="text-slate-500">· “{r.note}”</span>}</div>
              {r.status === "proposed" ? (
                r.fromMe ? <span className="text-xs text-slate-500">waiting…</span>
                  : <div className="flex gap-1">
                      <button onClick={() => respond(r.id, "accept")} className="p-1.5 rounded bg-emerald-400/15 text-emerald-300"><Check className="w-3.5 h-3.5" /></button>
                      <button onClick={() => respond(r.id, "decline")} className="p-1.5 rounded border border-white/10 text-slate-400"><X className="w-3.5 h-3.5" /></button>
                    </div>
              ) : <span className={`text-xs px-2 py-0.5 rounded-full ${r.status === "accepted" ? "bg-emerald-400/15 text-emerald-300" : "bg-slate-500/20 text-slate-400"}`}>{r.status}</span>}
            </div>
          ))}
        </div>
      )}

      {/* request a time */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} className="bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-cyan-400/60 [color-scheme:dark]" />
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Idea (optional)" className="flex-1 min-w-[120px] bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-cyan-400/60" />
        <button onClick={requestTime} disabled={busy} className="px-3 py-1.5 rounded-lg bg-rose-400 text-black text-sm font-medium flex items-center gap-1"><CalendarClock className="w-3.5 h-3.5" /> Request a time</button>
      </div>
    </div>
  );
}

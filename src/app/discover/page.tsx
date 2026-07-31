"use client";

import { useEffect, useState, useCallback } from "react";
import Navigation from "@/components/sections/navigation";
import {
  Compass, Loader2, MapPin, ShieldCheck, ShieldAlert, Lock, Sparkles,
  Users, Hand, Heart, Eye, Radar,
} from "lucide-react";

interface Settings { discoverable: boolean; discoveryRadiusMiles: number; discoveryPhotoUrl: string | null; displayName: string | null; hasLocation: boolean; verified: boolean; }
interface Person { profileId: number; name: string; distance: string; sharedInterests: string[]; photoUrl: string | null; theyTappedMe: boolean; iTappedThem: boolean; matched: boolean; }
interface Match { profileId: number; name: string; photoUrl: string | null; }

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
                <h3 className="font-semibold flex items-center gap-2 mb-3"><Heart className="w-4 h-4 text-rose-400" /> Your matches</h3>
                <div className="flex flex-wrap gap-3">
                  {matches.map((m) => (
                    <div key={m.profileId} className="flex items-center gap-2 rounded-full bg-black/40 border border-white/10 pl-1 pr-3 py-1">
                      {m.photoUrl ? <img src={m.photoUrl} alt={m.name} className="w-7 h-7 rounded-full object-cover" /> : <div className="w-7 h-7 rounded-full bg-rose-400/20" />}
                      <span className="text-sm">{m.name}</span>
                    </div>
                  ))}
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
                          <button onClick={() => tap(p.profileId)} disabled={p.iTappedThem}
                            className={`mt-3 w-full py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-1.5 ${p.matched ? "bg-rose-400 text-black" : p.iTappedThem ? "border border-white/10 text-slate-500" : "bg-cyan-400 text-black"}`}>
                            {p.matched ? <><Heart className="w-4 h-4" /> Matched</> : p.iTappedThem ? <><Eye className="w-4 h-4" /> Tapped — photo shared</> : <><Hand className="w-4 h-4" /> Tap {p.theyTappedMe ? "back" : ""}</>}
                          </button>
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

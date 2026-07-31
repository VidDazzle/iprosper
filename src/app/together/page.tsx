"use client";

import { useEffect, useState, useCallback } from "react";
import Navigation from "@/components/sections/navigation";
import {
  Heart, Loader2, MapPin, CalendarClock, Send, Check, X, RefreshCw,
  ShieldCheck, ShieldAlert, Lock, Eye, ImagePlus, HandHeart, UserPlus, Users,
} from "lucide-react";

interface Profile { id: number; email: string; }
interface Conn { id: number; status: string; shareLocation: boolean; shareCalendar: boolean; inviterProfileId: number; inviteeProfileId: number | null; inviteeEmail: string; }
interface Ev { id: number; title: string; startsAt: string; endsAt: string; location: string | null; status: string; }
interface Slot { start: string; end: string; label: string; }
interface Partner { id: number; name: string; city: string | null; timezone: string; location: { lat: number; lng: number; at: string | null } | null; locationShared: boolean; }
interface Proposal { id: number; fromProfileId: number; activity: string; location: string | null; startsAt: string; endsAt: string; note: string | null; status: string; parentId: number | null; }
interface Photo { id: number; mine: boolean; caption: string | null; revealed: boolean; revealRequested: boolean; locked: boolean; url: string | null; }

function fmt(iso: string, tz = "America/New_York") {
  return new Date(iso).toLocaleString("en-US", { timeZone: tz, weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}
function timeOnly(iso: string, tz = "America/New_York") {
  return new Date(iso).toLocaleString("en-US", { timeZone: tz, hour: "numeric", minute: "2-digit" });
}
function toLocalInput(d: Date) { const p = (n: number) => String(n).padStart(2, "0"); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; }

export default function TogetherPage() {
  const [actingAs, setActingAs] = useState("");
  const [loading, setLoading] = useState(true);
  const [conn, setConn] = useState<Conn | null>(null);
  const [me, setMe] = useState<Profile | null>(null);
  const [partnerBasic, setPartnerBasic] = useState<{ name: string; email: string } | null>(null);
  const [invites, setInvites] = useState<Conn[]>([]);
  const [outgoing, setOutgoing] = useState<Conn[]>([]);

  const q = actingAs ? `?email=${encodeURIComponent(actingAs)}` : "";
  const withEmail = (b: Record<string, unknown>) => (actingAs ? { ...b, email: actingAs } : b);

  const loadConn = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/together/connection${q}`);
      const d = await res.json();
      setConn(d.connection); setMe(d.me); setPartnerBasic(d.partner ? { name: d.partner.name, email: d.partner.email } : null);
      setInvites(d.invitesToMe || []); setOutgoing(d.outgoing || []);
    } finally { setLoading(false); }
  }, [q]);
  useEffect(() => { loadConn(); }, [loadConn]);

  return (
    <div className="min-h-screen bg-[#070a10] text-white font-sans"><Navigation />
      <main className="max-w-5xl mx-auto px-5 py-10">
        <div className="flex items-center gap-3 mb-2"><Heart className="w-6 h-6 text-rose-400" /><h1 className="text-3xl font-bold tracking-tight">Evolve Together</h1></div>
        <p className="text-slate-400 mb-6">Two people, two places — one shared view. See each other’s day and location, find when you’re both free, plan a date, and share private photos with consent.</p>

        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 mb-6 flex items-center gap-3">
          <Users className="w-4 h-4 text-slate-500" />
          <span className="text-sm text-slate-400">Acting as</span>
          <input value={actingAs} onChange={(e) => setActingAs(e.target.value)} onBlur={loadConn} placeholder="you (owner) — or type a partner's email to switch"
            className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-rose-400/60" />
          <span className="text-xs text-slate-600">each person uses their own login in production</span>
        </div>

        {loading ? <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-rose-400" /></div>
          : conn && conn.status === "active"
            ? <Active actingAs={actingAs} q={q} withEmail={withEmail} onChange={loadConn} />
            : <Setup me={me} invites={invites} outgoing={outgoing} withEmail={withEmail} onChange={loadConn} />}
      </main>
    </div>
  );
}

function Setup({ me, invites, outgoing, withEmail, onChange }: { me: Profile | null; invites: Conn[]; outgoing: Conn[]; withEmail: (b: Record<string, unknown>) => Record<string, unknown>; onChange: () => void; }) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const invite = async () => {
    if (!email.trim()) return; setBusy(true);
    try { await fetch("/api/together/connection", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(withEmail({ inviteeEmail: email })) }); setEmail(""); onChange(); }
    finally { setBusy(false); }
  };
  const respond = async (id: number, action: string) => {
    await fetch("/api/together/connection", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(withEmail({ id, action })) }); onChange();
  };
  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <div className="flex items-center gap-2 mb-3"><UserPlus className="w-4 h-4 text-rose-400" /><h3 className="font-semibold">Invite your partner</h3></div>
        <p className="text-sm text-slate-400 mb-4">Send an invite by email. Once they accept, you’ll share calendars and can plan dates together.</p>
        <div className="flex gap-2">
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="partner@email.com" className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-rose-400/60" />
          <button onClick={invite} disabled={busy} className="px-4 rounded-lg bg-rose-400 text-black text-sm font-medium flex items-center gap-1.5">{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Invite</button>
        </div>
        {outgoing.length > 0 && <div className="mt-4 text-xs text-slate-500">Pending invite to <span className="text-slate-300">{outgoing[0].inviteeEmail}</span> — waiting for them to accept.</div>}
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <h3 className="font-semibold mb-3">Invites to you</h3>
        {invites.length === 0 ? <p className="text-sm text-slate-500">No pending invites.</p> : invites.map((c) => (
          <div key={c.id} className="flex items-center justify-between rounded-lg bg-black/30 border border-white/10 p-3 mb-2">
            <span className="text-sm">Someone invited you to connect</span>
            <div className="flex gap-1.5">
              <button onClick={() => respond(c.id, "accept")} className="px-3 py-1.5 rounded-lg bg-emerald-400 text-black text-xs font-medium">Accept</button>
              <button onClick={() => respond(c.id, "decline")} className="px-3 py-1.5 rounded-lg border border-white/15 text-xs">Decline</button>
            </div>
          </div>
        ))}
        {me && <p className="text-xs text-slate-600 mt-4">You are: {me.email}</p>}
      </div>
    </div>
  );
}

function Active({ actingAs, q, withEmail, onChange }: { actingAs: string; q: string; withEmail: (b: Record<string, unknown>) => Record<string, unknown>; onChange: () => void; }) {
  const [ov, setOv] = useState<any>(null);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [meId, setMeId] = useState<number>(0);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [idStatus, setIdStatus] = useState<string>("unverified");
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [o, p, ph, id] = await Promise.all([
        fetch(`/api/together/overview${q}`).then((r) => r.json()),
        fetch(`/api/together/proposals${q}`).then((r) => r.json()),
        fetch(`/api/together/photos${q}`).then((r) => r.json()),
        fetch(`/api/together/identity/status${q}`).then((r) => r.json()),
      ]);
      setOv(o); setProposals(p.proposals || []); setMeId(p.meId || 0); setPhotos(ph.photos || []); setIdStatus(id.status || "unverified");
    } finally { setLoading(false); }
  }, [q]);
  useEffect(() => { reload(); }, [reload]);

  if (loading || !ov) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-rose-400" /></div>;
  const partner: Partner | null = ov.partner;
  const tz = ov.me?.timezone || "America/New_York";

  const shareLocation = async () => {
    if (!navigator.geolocation) { alert("Geolocation not available"); return; }
    navigator.geolocation.getCurrentPosition(async (pos) => {
      await fetch("/api/together/location", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(withEmail({ lat: pos.coords.latitude, lng: pos.coords.longitude, shareLocation: true })) });
      reload();
    }, () => alert("Couldn't get your location"));
  };

  return (
    <div className="space-y-6">
      {/* partner + location */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-rose-400/15 flex items-center justify-center"><Heart className="w-6 h-6 text-rose-400" /></div>
          <div>
            <div className="font-semibold text-lg">{partner?.name || "Your partner"}</div>
            <div className="text-sm text-slate-400 flex items-center gap-2">
              {partner?.city && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{partner.city}</span>}
              {partner?.location ? <a className="text-emerald-400 hover:underline" target="_blank" rel="noreferrer" href={`https://www.google.com/maps?q=${partner.location.lat},${partner.location.lng}`}>· live location {partner.location.at ? `(as of ${timeOnly(partner.location.at, tz)})` : ""}</a>
                : <span className="text-slate-600">· location not shared</span>}
            </div>
          </div>
        </div>
        <button onClick={shareLocation} className="px-4 py-2 rounded-lg border border-white/15 text-sm flex items-center gap-2 hover:border-emerald-400/60"><MapPin className="w-4 h-4" /> Share my location</button>
      </div>

      {/* schedules */}
      <div className="grid md:grid-cols-2 gap-6">
        <ScheduleCol title="Your day" events={ov.mySchedule} tz={tz} accent="emerald" />
        <ScheduleCol title={`${partner?.name?.split(" ")[0] || "Partner"}'s day`} events={ov.calendarShared ? ov.partnerSchedule : null} tz={partner?.timezone || tz} accent="rose" />
      </div>

      <PlanDate slots={ov.mutualSlots} tz={tz} withEmail={withEmail} onChange={reload} />
      <Proposals proposals={proposals} meId={meId} tz={tz} withEmail={withEmail} onChange={reload} />
      <Photos photos={photos} idStatus={idStatus} actingAs={actingAs} withEmail={withEmail} onChange={reload} providerConfigured={ov.providerConfigured} />
    </div>
  );
}

function ScheduleCol({ title, events, tz, accent }: { title: string; events: Ev[] | null; tz: string; accent: string }) {
  const dot = accent === "emerald" ? "bg-emerald-400" : "bg-rose-400";
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <h3 className="font-semibold mb-3 flex items-center gap-2"><span className={`w-2 h-2 rounded-full ${dot}`} /> {title}</h3>
      {events === null ? <p className="text-sm text-slate-500">Calendar sharing is off.</p>
        : events.length === 0 ? <p className="text-sm text-slate-500">Nothing scheduled — wide open.</p>
        : <div className="space-y-2">{events.map((e) => (
            <div key={e.id} className="flex items-center gap-3 rounded-lg bg-black/30 border border-white/10 p-2.5">
              <div className="text-xs font-mono text-slate-400 w-16 shrink-0">{timeOnly(e.startsAt, tz)}</div>
              <div className="min-w-0"><div className="text-sm font-medium truncate">{e.title}</div>{e.location && <div className="text-xs text-slate-500 truncate">{e.location}</div>}</div>
            </div>
          ))}</div>}
    </div>
  );
}

function PlanDate({ slots, tz, withEmail, onChange }: { slots: Slot[]; tz: string; withEmail: (b: Record<string, unknown>) => Record<string, unknown>; onChange: () => void; }) {
  const [activity, setActivity] = useState("");
  const [location, setLocation] = useState("");
  const [when, setWhen] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const send = async () => {
    if (!activity.trim() || !when) return; setBusy(true);
    try {
      const start = new Date(when); const end = new Date(start.getTime() + 2 * 3600_000);
      await fetch("/api/together/proposals", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(withEmail({ activity, location, startsAt: start.toISOString(), endsAt: end.toISOString(), note })) });
      setActivity(""); setLocation(""); setNote(""); setWhen(""); onChange();
    } finally { setBusy(false); }
  };
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
      <div className="flex items-center gap-2 mb-1"><HandHeart className="w-4 h-4 text-rose-400" /><h3 className="font-semibold">Plan a date</h3></div>
      <p className="text-sm text-slate-400 mb-4">Times you’re <span className="text-emerald-400">both free</span> — tap one, then propose it.</p>
      <div className="flex flex-wrap gap-2 mb-5">
        {slots.length === 0 ? <span className="text-sm text-slate-500">No mutual openings in the next week.</span>
          : slots.map((s) => (
            <button key={s.start} onClick={() => setWhen(toLocalInput(new Date(s.start)))}
              className={`px-3 py-1.5 rounded-lg border text-sm ${when === toLocalInput(new Date(s.start)) ? "bg-rose-400 text-black border-rose-400" : "border-white/10 text-slate-200 hover:border-rose-400/50"}`}>{s.label}</button>
          ))}
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <input value={activity} onChange={(e) => setActivity(e.target.value)} placeholder="Activity — e.g. dinner, weekend at a hotel" className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-rose-400/60" />
        <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Place / hotel (optional)" className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-rose-400/60" />
        <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-rose-400/60 [color-scheme:dark]" />
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)" className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-rose-400/60" />
      </div>
      <button onClick={send} disabled={busy} className="mt-4 px-5 py-2.5 rounded-lg bg-rose-400 text-black font-medium flex items-center gap-2">{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Propose date</button>
    </div>
  );
}

function Proposals({ proposals, meId, tz, withEmail, onChange }: { proposals: Proposal[]; meId: number; tz: string; withEmail: (b: Record<string, unknown>) => Record<string, unknown>; onChange: () => void; }) {
  const [counterId, setCounterId] = useState<number | null>(null);
  const [cActivity, setCActivity] = useState(""); const [cWhen, setCWhen] = useState(""); const [cLoc, setCLoc] = useState("");

  const respond = async (id: number, action: string, extra: Record<string, unknown> = {}) => {
    await fetch("/api/together/proposals", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(withEmail({ id, action, ...extra })) });
    setCounterId(null); setCActivity(""); setCWhen(""); setCLoc(""); onChange();
  };
  const badge = (s: string) => {
    const m: Record<string, string> = { proposed: "bg-amber-400/15 text-amber-300", confirmed: "bg-emerald-400/15 text-emerald-300", declined: "bg-red-400/15 text-red-300", countered: "bg-slate-500/20 text-slate-400", cancelled: "bg-slate-500/20 text-slate-400" };
    return m[s] || "bg-slate-500/20 text-slate-400";
  };
  if (proposals.length === 0) return null;
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
      <h3 className="font-semibold mb-4">Date proposals</h3>
      <div className="space-y-3">
        {proposals.map((p) => {
          const mine = p.fromProfileId === meId;
          const canRespond = !mine && p.status === "proposed";
          return (
            <div key={p.id} className="rounded-xl border border-white/10 bg-black/30 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-medium flex items-center gap-2">{p.activity}{p.location && <span className="text-slate-400 font-normal">· {p.location}</span>}</div>
                  <div className="text-sm text-slate-400 flex items-center gap-1.5 mt-1"><CalendarClock className="w-3.5 h-3.5" />{fmt(p.startsAt, tz)}</div>
                  {p.note && <div className="text-sm text-slate-500 mt-1">“{p.note}”</div>}
                  <div className="text-xs text-slate-600 mt-1">{mine ? "You proposed" : "Proposed to you"}{p.parentId ? " · counter" : ""}</div>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full ${badge(p.status)}`}>{p.status}</span>
              </div>
              {canRespond && (
                <div className="flex flex-wrap gap-2 mt-3">
                  <button onClick={() => respond(p.id, "accept")} className="px-3 py-1.5 rounded-lg bg-emerald-400 text-black text-sm font-medium flex items-center gap-1"><Check className="w-4 h-4" /> Accept</button>
                  <button onClick={() => respond(p.id, "decline")} className="px-3 py-1.5 rounded-lg border border-white/15 text-sm flex items-center gap-1"><X className="w-4 h-4" /> Decline</button>
                  <button onClick={() => { setCounterId(counterId === p.id ? null : p.id); setCWhen(toLocalInput(new Date(p.startsAt))); setCActivity(p.activity); setCLoc(p.location || ""); }} className="px-3 py-1.5 rounded-lg border border-white/15 text-sm flex items-center gap-1"><RefreshCw className="w-4 h-4" /> Counter</button>
                </div>
              )}
              {counterId === p.id && (
                <div className="mt-3 grid sm:grid-cols-3 gap-2">
                  <input value={cActivity} onChange={(e) => setCActivity(e.target.value)} placeholder="Activity" className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none" />
                  <input value={cLoc} onChange={(e) => setCLoc(e.target.value)} placeholder="Place" className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none" />
                  <input type="datetime-local" value={cWhen} onChange={(e) => setCWhen(e.target.value)} className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none [color-scheme:dark]" />
                  <button onClick={() => { const s = new Date(cWhen); respond(p.id, "counter", { activity: cActivity, location: cLoc, startsAt: s.toISOString(), endsAt: new Date(s.getTime() + 2 * 3600_000).toISOString() }); }} className="sm:col-span-3 px-3 py-2 rounded-lg bg-rose-400 text-black text-sm font-medium">Send counter-proposal</button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Photos({ photos, idStatus, actingAs, withEmail, onChange, providerConfigured }: { photos: Photo[]; idStatus: string; actingAs: string; withEmail: (b: Record<string, unknown>) => Record<string, unknown>; onChange: () => void; providerConfigured?: boolean; }) {
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState(""); const [caption, setCaption] = useState("");
  const verified = idStatus === "verified";

  const startVerify = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/together/identity/start", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(withEmail({})) });
      const d = await res.json();
      if (d.url) { window.open(d.url, "_blank"); }
      else if (d.sandbox) {
        // Sandbox: simulate the provider confirming the document + selfie match.
        await fetch("/api/together/identity/webhook", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sandbox: true, email: actingAs || undefined }) });
      }
      onChange();
    } finally { setBusy(false); }
  };
  const addPhoto = async () => {
    if (!url.trim()) return; setBusy(true);
    try { await fetch("/api/together/photos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(withEmail({ url, caption })) }); setUrl(""); setCaption(""); onChange(); }
    finally { setBusy(false); }
  };
  const photoAction = async (id: number, action: string) => {
    await fetch(`/api/together/photos/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(withEmail({ action })) }); onChange();
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
      <div className="flex items-center gap-2 mb-1"><ImagePlus className="w-4 h-4 text-rose-400" /><h3 className="font-semibold">Private photos</h3></div>
      <p className="text-sm text-slate-400 mb-4">Share photos with your partner. Each stays locked until you choose to reveal it — and your partner can ask you to.</p>

      {!verified ? (
        <div className="rounded-xl border border-amber-400/30 bg-amber-400/5 p-4 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-300 shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="font-medium text-amber-200">Identity check required</div>
            <p className="text-sm text-slate-400 mt-1">To keep this real and safe, you must verify your identity — a driver’s license scan plus a face match — before sharing photos. {providerConfigured ? "You’ll be taken to our verification partner." : "No verification provider is configured, so this runs in sandbox mode."} We never store your ID or face data; the provider does the match and returns only pass/fail.</p>
            <button onClick={startVerify} disabled={busy} className="mt-3 px-4 py-2 rounded-lg bg-amber-400 text-black text-sm font-medium flex items-center gap-2">{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />} Verify my identity</button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 text-sm text-emerald-300 mb-4"><ShieldCheck className="w-4 h-4" /> Identity verified</div>
          <div className="flex gap-2 mb-5">
            <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Photo URL" className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-rose-400/60" />
            <input value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Caption" className="w-40 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-rose-400/60" />
            <button onClick={addPhoto} disabled={busy} className="px-4 rounded-lg bg-rose-400 text-black text-sm font-medium">Add</button>
          </div>
        </>
      )}

      {photos.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-2">
          {photos.map((p) => (
            <div key={p.id} className="rounded-xl border border-white/10 bg-black/30 overflow-hidden">
              <div className="aspect-square flex items-center justify-center bg-black/50 relative">
                {p.locked ? (
                  <div className="text-center text-slate-500"><Lock className="w-6 h-6 mx-auto mb-1" /><div className="text-xs">Locked</div>{p.revealRequested && <div className="text-[10px] text-amber-400 mt-1">reveal requested</div>}</div>
                ) : p.url ? <img src={p.url} alt={p.caption || "photo"} className="w-full h-full object-cover" /> : <div className="text-slate-600 text-xs">no image</div>}
              </div>
              <div className="p-2">
                {p.caption && <div className="text-xs text-slate-400 truncate mb-1">{p.caption}</div>}
                <div className="flex gap-1">
                  {p.mine ? (
                    p.revealed
                      ? <button onClick={() => photoAction(p.id, "hide")} className="text-xs px-2 py-1 rounded border border-white/10 flex items-center gap-1"><Lock className="w-3 h-3" /> Hide</button>
                      : <button onClick={() => photoAction(p.id, "reveal")} className="text-xs px-2 py-1 rounded bg-emerald-400/15 text-emerald-300 flex items-center gap-1"><Eye className="w-3 h-3" /> Reveal{p.revealRequested ? " (asked)" : ""}</button>
                  ) : p.locked ? (
                    <button onClick={() => photoAction(p.id, "request")} className="text-xs px-2 py-1 rounded border border-white/10 flex items-center gap-1" disabled={p.revealRequested}><Eye className="w-3 h-3" /> {p.revealRequested ? "Requested" : "Ask to see"}</button>
                  ) : <span className="text-xs text-emerald-400">revealed</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import Navigation from "@/components/sections/navigation";
import { Loader2, ShieldAlert, Flag, ScanFace, UserX, RotateCcw, KeyRound } from "lucide-react";

interface Summary {
  openReports: { id: number; reason: string; detail: string | null; createdAt: string; reporter: string; reported: string; reportedId: number }[];
  screeningFlags: { profileId: number; name: string; flags: string[]; provider: string; at: string | null }[];
  suspended: { profileId: number; name: string; email: string }[];
  counts: { openReports: number; screeningFlags: number; suspended: number };
}

const SECRET_KEY = "orbit.moderation.secret";

export default function ModerationPage() {
  const [data, setData] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [secret, setSecret] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => { setSecret(localStorage.getItem(SECRET_KEY) || ""); }, []);

  const headers = useCallback((): HeadersInit => {
    const s = localStorage.getItem(SECRET_KEY) || "";
    return s ? { "x-moderation-secret": s, "content-type": "application/json" } : { "content-type": "application/json" };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/moderation/summary", { headers: headers() });
      if (res.status === 403) { setForbidden(true); setData(null); return; }
      setForbidden(false);
      setData(await res.json());
    } finally { setLoading(false); }
  }, [headers]);

  useEffect(() => { load(); }, [load]);

  async function actReport(id: number, action: "suspend" | "dismiss" | "reviewed") {
    setBusy(`r${id}`);
    try {
      await fetch("/api/moderation/report", { method: "PATCH", headers: headers(), body: JSON.stringify({ id, action }) });
      await load();
    } finally { setBusy(null); }
  }
  async function actUser(profileId: number, action: "suspend" | "unsuspend") {
    setBusy(`u${profileId}`);
    try {
      await fetch("/api/moderation/user", { method: "PATCH", headers: headers(), body: JSON.stringify({ profileId, action }) });
      await load();
    } finally { setBusy(null); }
  }
  function saveSecret() { localStorage.setItem(SECRET_KEY, secret); load(); }

  return (
    <div className="min-h-screen bg-[#070a10] text-white font-sans"><Navigation />
      <main className="max-w-4xl mx-auto px-5 py-10">
        <div className="flex items-center gap-2 mb-1"><ShieldAlert className="w-5 h-5 text-rose-400" /><span className="text-xs font-mono uppercase tracking-widest text-slate-500">Trust &amp; Safety</span></div>
        <h1 className="text-3xl font-bold tracking-tight mb-8">Moderation</h1>

        {loading ? <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-rose-400" /></div> : forbidden ? (
          <div className="max-w-md rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <div className="flex items-center gap-2 mb-3"><KeyRound className="w-4 h-4 text-amber-300" /><h3 className="font-semibold">Moderator access required</h3></div>
            <p className="text-sm text-slate-400 mb-4">Enter the moderation secret to review reports and screening flags.</p>
            <div className="flex gap-2">
              <input type="password" value={secret} onChange={(e) => setSecret(e.target.value)} placeholder="Moderation secret"
                className="flex-1 rounded-lg bg-black/40 border border-white/10 px-3 py-2 text-sm outline-none focus:border-rose-400/40" />
              <button onClick={saveSecret} className="rounded-lg bg-rose-500/90 hover:bg-rose-500 px-4 py-2 text-sm font-medium">Unlock</button>
            </div>
          </div>
        ) : data ? (
          <div className="space-y-8">
            <div className="grid grid-cols-3 gap-3">
              <Stat icon={Flag} label="Open reports" value={data.counts.openReports} hue="#FF6B8A" />
              <Stat icon={ScanFace} label="Screening flags" value={data.counts.screeningFlags} hue="#FFC46B" />
              <Stat icon={UserX} label="Suspended" value={data.counts.suspended} hue="#8B7BFF" />
            </div>

            {/* Open reports */}
            <section>
              <h3 className="font-semibold flex items-center gap-2 mb-4"><Flag className="w-4 h-4 text-rose-400" /> Open reports</h3>
              {data.openReports.length === 0 ? <p className="text-sm text-slate-500">No open reports. All clear.</p> : (
                <div className="space-y-3">
                  {data.openReports.map((r) => (
                    <div key={r.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                      <div className="flex flex-wrap items-center gap-2 text-sm mb-1">
                        <span className="font-medium text-rose-200">{r.reported}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/20">{r.reason}</span>
                        <span className="text-xs text-slate-500">reported by {r.reporter}</span>
                        <span className="text-xs text-slate-600 ml-auto font-mono">{new Date(r.createdAt).toLocaleDateString()}</span>
                      </div>
                      {r.detail && <p className="text-sm text-slate-400 mb-3">{r.detail}</p>}
                      <div className="flex gap-2">
                        <button disabled={busy === `r${r.id}`} onClick={() => actReport(r.id, "suspend")}
                          className="rounded-lg bg-rose-500/90 hover:bg-rose-500 disabled:opacity-50 px-3 py-1.5 text-xs font-medium">Suspend user</button>
                        <button disabled={busy === `r${r.id}`} onClick={() => actReport(r.id, "reviewed")}
                          className="rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-1.5 text-xs">Mark reviewed</button>
                        <button disabled={busy === `r${r.id}`} onClick={() => actReport(r.id, "dismiss")}
                          className="rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-1.5 text-xs text-slate-400">Dismiss</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Screening flags */}
            <section>
              <h3 className="font-semibold flex items-center gap-2 mb-4"><ScanFace className="w-4 h-4 text-amber-300" /> Background-screening flags</h3>
              {data.screeningFlags.length === 0 ? <p className="text-sm text-slate-500">No screening flags.</p> : (
                <div className="space-y-3">
                  {data.screeningFlags.map((f) => (
                    <div key={f.profileId} className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium text-amber-100">{f.name}</span>
                        <span className="text-xs text-slate-500">via {f.provider}</span>
                        {f.at && <span className="text-xs text-slate-600 ml-auto font-mono">{new Date(f.at).toLocaleDateString()}</span>}
                      </div>
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {f.flags.length === 0 ? <span className="text-xs text-slate-500">flagged</span> :
                          f.flags.map((fl) => <span key={fl} className="text-xs px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-200 border border-amber-500/20">{fl}</span>)}
                      </div>
                      <button disabled={busy === `u${f.profileId}`} onClick={() => actUser(f.profileId, "suspend")}
                        className="rounded-lg bg-rose-500/90 hover:bg-rose-500 disabled:opacity-50 px-3 py-1.5 text-xs font-medium">Suspend user</button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Suspended */}
            <section>
              <h3 className="font-semibold flex items-center gap-2 mb-4"><UserX className="w-4 h-4 text-violet-300" /> Suspended members</h3>
              {data.suspended.length === 0 ? <p className="text-sm text-slate-500">No suspended members.</p> : (
                <div className="space-y-2">
                  {data.suspended.map((s) => (
                    <div key={s.profileId} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5">
                      <div className="min-w-0"><div className="text-sm font-medium truncate">{s.name}</div><div className="text-xs text-slate-500 truncate">{s.email}</div></div>
                      <button disabled={busy === `u${s.profileId}`} onClick={() => actUser(s.profileId, "unsuspend")}
                        className="ml-auto rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 disabled:opacity-50 px-3 py-1.5 text-xs flex items-center gap-1.5"><RotateCcw className="w-3 h-3" /> Reinstate</button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        ) : null}
      </main>
    </div>
  );
}

function Stat({ icon: Icon, label, value, hue }: { icon: typeof Flag; label: string; value: number; hue: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-center justify-between">
        <Icon className="w-4 h-4" style={{ color: hue }} />
        <span className="text-2xl font-bold tabular-nums" style={{ color: value > 0 ? hue : undefined }}>{value}</span>
      </div>
      <div className="text-xs text-slate-500 mt-1">{label}</div>
    </div>
  );
}

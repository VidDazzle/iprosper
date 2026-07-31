"use client";

import { useEffect, useState, useCallback } from "react";
import Navigation from "@/components/sections/navigation";
import {
  Dumbbell, Loader2, Flame, CalendarCheck, Trophy, Plus, Target,
  Check, Archive, TrendingUp, Footprints, Scale, Timer,
} from "lucide-react";

interface GoalP { id: number; kind: string; label: string; unit: string | null; target: number; baseline: number | null; current: number; pct: number; status: string; deadline: string | null; achievedAt: string | null; }
interface LogRow { id: number; kind: string; label: string | null; value: number | null; unit: string | null; loggedAt: string; }
interface Best { label: string; value: number; unit: string | null; }
interface Summary { streakDays: number; workoutsThisWeek: number; totalWorkouts: number; latestWeight: number | null; goals: GoalP[]; recentLogs: LogRow[]; personalBests: Best[]; }

const KIND_ICON: Record<string, typeof Dumbbell> = { workout: Dumbbell, strength: Dumbbell, cardio: Timer, run: Footprints, weigh_in: Scale, steps: Footprints, custom: Check };
const QUICK = [
  { kind: "workout", label: "Workout", icon: Dumbbell },
  { kind: "run", label: "Run", icon: Footprints, ask: "miles" },
  { kind: "cardio", label: "Cardio", icon: Timer, ask: "minutes" },
  { kind: "weigh_in", label: "Weigh-in", icon: Scale, ask: "lbs" },
  { kind: "steps", label: "Steps", icon: Footprints, ask: "steps" },
];
function day(iso: string) { return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" }); }

export default function FitnessPage() {
  const [s, setS] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [showGoal, setShowGoal] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setS(await (await fetch("/api/life/fitness/summary")).json()); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const quickLog = async (kind: string, ask?: string) => {
    let value: number | undefined;
    if (ask) { const v = prompt(`Log ${kind} — ${ask}:`); if (v === null) return; value = Number(v) || undefined; }
    await fetch("/api/life/fitness/logs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind, value, unit: ask }) });
    load();
  };
  const archiveGoal = async (id: number) => { await fetch("/api/life/fitness/goals", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status: "archived" }) }); load(); };

  return (
    <div className="min-h-screen bg-[#070a10] text-white font-sans"><Navigation />
      <main className="max-w-4xl mx-auto px-5 py-10">
        <div className="flex items-center gap-3 mb-2"><Dumbbell className="w-6 h-6 text-emerald-400" /><h1 className="text-3xl font-bold tracking-tight">Fitness</h1></div>
        <p className="text-slate-400 mb-8">Track your goals and celebrate what you accomplish.</p>

        {loading || !s ? <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-emerald-400" /></div> : (
          <div className="space-y-8">
            {/* stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Stat icon={Flame} label="Day streak" value={s.streakDays} hue="#FF8A3D" />
              <Stat icon={CalendarCheck} label="Workouts this week" value={s.workoutsThisWeek} hue="#38E4C9" />
              <Stat icon={Trophy} label="Total workouts" value={s.totalWorkouts} hue="#FFC46B" />
              <Stat icon={Scale} label="Latest weight" value={s.latestWeight ?? "—"} suffix={s.latestWeight != null ? " lb" : ""} hue="#8B7BFF" />
            </div>

            {/* quick log */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <h3 className="font-semibold mb-3 flex items-center gap-2"><Plus className="w-4 h-4 text-emerald-400" /> Log an accomplishment</h3>
              <div className="flex flex-wrap gap-2">
                {QUICK.map((q) => (
                  <button key={q.kind} onClick={() => quickLog(q.kind, q.ask)} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 hover:border-emerald-400/50 text-sm">
                    <q.icon className="w-4 h-4 text-emerald-400" /> {q.label}
                  </button>
                ))}
              </div>
            </div>

            {/* goals */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold flex items-center gap-2"><Target className="w-4 h-4 text-amber-300" /> Your goals</h3>
                <button onClick={() => setShowGoal((v) => !v)} className="text-sm text-emerald-400 flex items-center gap-1"><Plus className="w-4 h-4" /> New goal</button>
              </div>
              {showGoal && <NewGoal onDone={() => { setShowGoal(false); load(); }} />}
              {s.goals.length === 0 && !showGoal ? <p className="text-sm text-slate-500">No goals yet. Set one to start tracking progress.</p>
                : <div className="space-y-3">
                    {s.goals.map((g) => (
                      <div key={g.id} className={`rounded-xl border p-4 ${g.status === "achieved" ? "border-emerald-400/30 bg-emerald-400/[0.06]" : "border-white/10 bg-white/[0.03]"}`}>
                        <div className="flex items-center justify-between gap-3">
                          <div className="font-medium flex items-center gap-2">{g.status === "achieved" && <Trophy className="w-4 h-4 text-emerald-400" />}{g.label}</div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-slate-400">{g.current}{g.unit ? ` ${g.unit}` : ""} / {g.target}{g.unit ? ` ${g.unit}` : ""}</span>
                            <button onClick={() => archiveGoal(g.id)} title="Archive" className="text-slate-500 hover:text-slate-300"><Archive className="w-3.5 h-3.5" /></button>
                          </div>
                        </div>
                        <div className="mt-2 h-2 rounded-full bg-white/10 overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${g.pct}%`, background: g.status === "achieved" ? "#38E4C9" : "linear-gradient(90deg,#38E4C9,#FFC46B)" }} />
                        </div>
                        <div className="text-xs text-slate-500 mt-1">{g.pct}%{g.deadline ? ` · by ${day(g.deadline)}` : ""}{g.status === "achieved" ? " · achieved 🎉" : ""}</div>
                      </div>
                    ))}
                  </div>}
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* PRs */}
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <h3 className="font-semibold mb-3 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-emerald-400" /> Personal bests</h3>
                {s.personalBests.length === 0 ? <p className="text-sm text-slate-500">Log runs or lifts with a value to track PRs.</p>
                  : <div className="space-y-2">{s.personalBests.map((b) => (
                      <div key={b.label} className="flex justify-between text-sm rounded-lg bg-black/30 border border-white/10 px-3 py-2"><span>{b.label}</span><span className="font-mono text-emerald-300">{b.value}{b.unit ? ` ${b.unit}` : ""}</span></div>
                    ))}</div>}
              </div>
              {/* recent */}
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <h3 className="font-semibold mb-3 flex items-center gap-2"><CalendarCheck className="w-4 h-4 text-amber-300" /> Recent activity</h3>
                {s.recentLogs.length === 0 ? <p className="text-sm text-slate-500">Nothing logged yet.</p>
                  : <div className="space-y-2">{s.recentLogs.map((l) => {
                      const Icon = KIND_ICON[l.kind] || Check;
                      return (
                        <div key={l.id} className="flex items-center gap-3 text-sm rounded-lg bg-black/30 border border-white/10 px-3 py-2">
                          <Icon className="w-4 h-4 text-slate-400" />
                          <span className="flex-1 capitalize">{l.label || l.kind.replace("_", " ")}{l.value != null ? ` — ${l.value}${l.unit ? ` ${l.unit}` : ""}` : ""}</span>
                          <span className="text-xs text-slate-500">{day(l.loggedAt)}</span>
                        </div>
                      );
                    })}</div>}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function Stat({ icon: Icon, label, value, suffix, hue }: { icon: typeof Dumbbell; label: string; value: number | string; suffix?: string; hue: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <Icon className="w-4 h-4 mb-2" style={{ color: hue }} />
      <div className="text-2xl font-bold tabular-nums" style={{ color: typeof value === "number" && value > 0 ? hue : undefined }}>{value}{suffix}</div>
      <div className="text-xs text-slate-500 mt-0.5">{label}</div>
    </div>
  );
}

function NewGoal({ onDone }: { onDone: () => void }) {
  const KINDS = [
    { kind: "weight_loss", label: "Lose weight", unit: "lb", needsBaseline: true },
    { kind: "weight_gain", label: "Gain weight", unit: "lb", needsBaseline: true },
    { kind: "workouts", label: "Total workouts", unit: "" },
    { kind: "distance", label: "Run distance", unit: "mi" },
    { kind: "steps", label: "Daily steps", unit: "steps" },
    { kind: "custom", label: "Custom", unit: "" },
  ];
  const [kind, setKind] = useState(KINDS[0]);
  const [label, setLabel] = useState("");
  const [target, setTarget] = useState("");
  const [baseline, setBaseline] = useState("");
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!target) return; setBusy(true);
    try {
      await fetch("/api/life/fitness/goals", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: kind.kind, label: label || kind.label, targetValue: Number(target), baselineValue: kind.needsBaseline && baseline ? Number(baseline) : undefined, unit: kind.unit }) });
      onDone();
    } finally { setBusy(false); }
  };
  return (
    <div className="rounded-xl border border-white/10 bg-black/30 p-4 mb-4">
      <div className="flex flex-wrap gap-2 mb-3">
        {KINDS.map((k) => <button key={k.kind} onClick={() => setKind(k)} className={`px-3 py-1.5 rounded-lg text-sm border ${kind.kind === k.kind ? "bg-emerald-400 text-black border-emerald-400" : "border-white/15 text-slate-300"}`}>{k.label}</button>)}
      </div>
      <div className="grid sm:grid-cols-3 gap-2">
        <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder={`Label (e.g. ${kind.label})`} className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-400/60" />
        {kind.needsBaseline && <input value={baseline} onChange={(e) => setBaseline(e.target.value)} type="number" placeholder={`Starting (${kind.unit})`} className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-400/60" />}
        <input value={target} onChange={(e) => setTarget(e.target.value)} type="number" placeholder={`Target${kind.unit ? ` (${kind.unit})` : ""}`} className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-400/60" />
      </div>
      <button onClick={save} disabled={busy} className="mt-3 px-4 py-2 rounded-lg bg-emerald-400 text-black text-sm font-medium flex items-center gap-1.5">{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Target className="w-4 h-4" />} Set goal</button>
    </div>
  );
}

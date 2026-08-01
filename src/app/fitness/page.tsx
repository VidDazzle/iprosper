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
interface WeightPt { at: string; value: number; }
interface WeekVol { weekStart: string; label: string; count: number; }
interface Summary { streakDays: number; workoutsThisWeek: number; totalWorkouts: number; latestWeight: number | null; goals: GoalP[]; recentLogs: LogRow[]; personalBests: Best[]; weightSeries: WeightPt[]; weeklyVolume: WeekVol[]; }
interface PlanDay { day: string; focus: string; exercises: { name: string; detail: string }[]; }
interface Plan { goal: string; goalLabel: string; level: string; daysPerWeek: number; summary: string; days: PlanDay[]; tips: string[]; safety: string; }

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

            {/* trends */}
            {(s.weightSeries.length >= 2 || s.weeklyVolume.some((w) => w.count > 0)) && (
              <div className="grid md:grid-cols-2 gap-6">
                {s.weightSeries.length >= 2 && (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                    <h3 className="font-semibold mb-1 flex items-center gap-2"><Scale className="w-4 h-4 text-violet-400" /> Weight trend</h3>
                    <p className="text-xs text-slate-500 mb-3">Last {s.weightSeries.length} weigh-ins</p>
                    <WeightChart data={s.weightSeries} />
                  </div>
                )}
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                  <h3 className="font-semibold mb-1 flex items-center gap-2"><CalendarCheck className="w-4 h-4 text-emerald-400" /> Weekly volume</h3>
                  <p className="text-xs text-slate-500 mb-3">Workouts per week · last 8 weeks</p>
                  <VolumeChart data={s.weeklyVolume} />
                </div>
              </div>
            )}

            {/* workout plans */}
            <Plans onLogged={load} />

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

// ---- charts (single-series; recessive grid, emphasized endpoint, hover titles) ----
function WeightChart({ data }: { data: WeightPt[] }) {
  const W = 460, H = 150, padX = 8, padTop = 12, padBot = 20;
  const vals = data.map((d) => d.value);
  const min = Math.min(...vals), max = Math.max(...vals);
  const span = max - min || 1;
  const x = (i: number) => padX + (i / (data.length - 1)) * (W - padX * 2);
  const y = (v: number) => padTop + (1 - (v - min) / span) * (H - padTop - padBot);
  const line = data.map((d, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(d.value).toFixed(1)}`).join(" ");
  const area = `${line} L${x(data.length - 1).toFixed(1)},${H - padBot} L${x(0).toFixed(1)},${H - padBot} Z`;
  const last = data[data.length - 1];
  const gridY = [min, (min + max) / 2, max];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ overflow: "visible" }} role="img" aria-label="Weight over time">
      <defs><linearGradient id="wt" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#8B7BFF" stopOpacity="0.28" /><stop offset="100%" stopColor="#8B7BFF" stopOpacity="0" /></linearGradient></defs>
      {gridY.map((g, i) => (
        <g key={i}>
          <line x1={padX} x2={W - padX} y1={y(g)} y2={y(g)} stroke="#8494a8" strokeOpacity="0.16" />
          <text x={W - padX} y={y(g) - 3} textAnchor="end" fontSize="9" fill="#8494a8" fontFamily="ui-monospace,monospace">{Math.round(g)}</text>
        </g>
      ))}
      <path d={area} fill="url(#wt)" />
      <path d={line} fill="none" stroke="#8B7BFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {data.map((d, i) => <circle key={i} cx={x(i)} cy={y(d.value)} r="3" fill="#8B7BFF"><title>{new Date(d.at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}: {d.value} lb</title></circle>)}
      <circle cx={x(data.length - 1)} cy={y(last.value)} r="5" fill="#8B7BFF" stroke="#0E141E" strokeWidth="2" />
      <text x={x(data.length - 1)} y={y(last.value) - 9} textAnchor="end" fontSize="11" fontWeight="700" fill="#B3A6FF" fontFamily="ui-monospace,monospace">{last.value} lb</text>
    </svg>
  );
}

function VolumeChart({ data }: { data: WeekVol[] }) {
  const W = 460, H = 150, padX = 8, padTop = 14, padBot = 22;
  const max = Math.max(1, ...data.map((d) => d.count));
  const bw = (W - padX * 2) / data.length;
  const barW = Math.max(6, bw - 8);
  const h = (c: number) => (c / max) * (H - padTop - padBot);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Workouts per week">
      <line x1={padX} x2={W - padX} y1={H - padBot} y2={H - padBot} stroke="#8494a8" strokeOpacity="0.2" />
      {data.map((d, i) => {
        const bx = padX + i * bw + (bw - barW) / 2;
        const bh = h(d.count);
        const by = H - padBot - bh;
        return (
          <g key={i}>
            {d.count > 0 && <rect x={bx} y={by} width={barW} height={Math.max(bh, 3)} rx="4" fill="#38E4C9"><title>{d.label}: {d.count} workouts</title></rect>}
            {d.count > 0 && <text x={bx + barW / 2} y={by - 4} textAnchor="middle" fontSize="9" fill="#8FEFE0" fontFamily="ui-monospace,monospace">{d.count}</text>}
            {i % 2 === 0 && <text x={bx + barW / 2} y={H - 7} textAnchor="middle" fontSize="8.5" fill="#8494a8" fontFamily="ui-monospace,monospace">{d.label}</text>}
          </g>
        );
      })}
    </svg>
  );
}

// ---- workout plans linked to the tracker ----
const PLAN_GOALS = [
  { key: "lose_weight", label: "Lose weight" },
  { key: "gain_muscle", label: "Gain muscle" },
  { key: "both", label: "Both" },
  { key: "cardio", label: "Cardio" },
];
function Plans({ onLogged }: { onLogged: () => void }) {
  const [goal, setGoal] = useState("gain_muscle");
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(false);
  const [tracking, setTracking] = useState(false);

  const loadPlan = useCallback(async (g: string) => {
    setLoading(true);
    try { setPlan(await (await fetch(`/api/life/workouts?goal=${g}`)).json()); } finally { setLoading(false); }
  }, []);
  useEffect(() => { loadPlan(goal); }, [goal, loadPlan]);

  const track = async () => {
    setTracking(true);
    try { await fetch("/api/life/fitness/start-plan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ goal }) }); onLogged(); alert("Plan started — a goal was added to track it."); }
    finally { setTracking(false); }
  };
  const schedule = async () => {
    setTracking(true);
    try { const d = await (await fetch("/api/life/fitness/schedule-plan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ goal, weeks: 4 }) })).json(); alert(`Added ${d.created} sessions to your Orbit calendar with reminders.`); }
    finally { setTracking(false); }
  };
  const logDay = async (focus: string) => {
    await fetch("/api/life/fitness/logs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: "workout", label: `${plan?.goalLabel} — ${focus}` }) });
    onLogged();
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <h3 className="font-semibold mb-3 flex items-center gap-2"><Dumbbell className="w-4 h-4 text-emerald-400" /> Workout plans</h3>
      <div className="flex flex-wrap gap-2 mb-4">
        {PLAN_GOALS.map((g) => <button key={g.key} onClick={() => setGoal(g.key)} className={`px-3 py-1.5 rounded-lg text-sm border ${goal === g.key ? "bg-emerald-400 text-black border-emerald-400" : "border-white/15 text-slate-300"}`}>{g.label}</button>)}
      </div>
      {loading || !plan ? <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-emerald-400" /></div> : (
        <>
          <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
            <p className="text-sm text-slate-400 max-w-xl">{plan.summary}</p>
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={track} disabled={tracking} className="px-4 py-2 rounded-lg bg-emerald-400 text-black text-sm font-medium flex items-center gap-1.5">{tracking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Target className="w-4 h-4" />} Track this plan</button>
              <button onClick={schedule} disabled={tracking} className="px-4 py-2 rounded-lg border border-white/15 text-slate-200 text-sm font-medium flex items-center gap-1.5">📅 Schedule to Orbit</button>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-2">
            {plan.days.map((d) => (
              <div key={d.day} className="rounded-lg border border-white/10 bg-black/30 p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="text-sm font-medium">{d.day} · {d.focus}</div>
                  <button onClick={() => logDay(d.focus)} title="Log this session" className="text-xs px-2 py-1 rounded bg-emerald-400/15 text-emerald-300 flex items-center gap-1"><Check className="w-3 h-3" /> Done</button>
                </div>
                <ul className="text-xs text-slate-400 space-y-0.5">{d.exercises.map((e) => <li key={e.name}>• {e.name} <span className="text-slate-600">{e.detail}</span></li>)}</ul>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-600 mt-3">{plan.safety}</p>
        </>
      )}
    </div>
  );
}

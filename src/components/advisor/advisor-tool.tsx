"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Plus, Trash2, Sparkles, Lightbulb, TrendingDown, CheckCircle2, ArrowRight, PiggyBank } from "lucide-react";
import { buildPlan, simulatePayoff, formatDuration, type DebtInput, type DebtType, type Strategy } from "@/lib/advisor/payoff";
import { DEBT_TYPE_LABELS, strategiesForTypes, UNIVERSAL_STRATEGIES } from "@/lib/advisor/strategies";
import { EXPENSE_CATEGORIES, seedBudget, totalExpenses, foundMoney, type Budget } from "@/lib/advisor/budget";

const usd = (n: number) => "$" + Math.round(n).toLocaleString("en-US");
const uid = () => Math.random().toString(36).slice(2, 9);
const TYPE_OPTIONS = Object.entries(DEBT_TYPE_LABELS) as [DebtType, string][];

const STARTER: DebtInput[] = [
  { id: uid(), name: "Visa", type: "credit_card", balance: 6800, apr: 24.99, minPayment: 170 },
  { id: uid(), name: "Car loan", type: "auto", balance: 14200, apr: 8.5, minPayment: 320 },
  { id: uid(), name: "Student loan", type: "student", balance: 21000, apr: 6.5, minPayment: 240 },
];

const inputCls = "h-9 border-white/15 bg-[#03040a] text-white placeholder:text-slate-600";

export default function AdvisorTool() {
  const [debts, setDebts] = useState<DebtInput[]>(STARTER);
  const [income, setIncome] = useState(4800);
  const [budget, setBudget] = useState<Budget>(() => seedBudget(4800));
  const [strategy, setStrategy] = useState<Strategy | null>(null);

  const expenses = totalExpenses(budget);
  const disposable = Math.max(0, income - expenses);
  const [extra, setExtra] = useState(disposable);
  const activeDebts = debts.filter((d) => d.balance > 0);

  const result = useMemo(
    () =>
      buildPlan({
        debts: activeDebts,
        monthlyIncome: income,
        monthlyExpenses: expenses,
        extraToDebt: Math.min(extra, disposable),
        strategy: strategy ?? undefined,
      }),
    [activeDebts, income, expenses, extra, strategy, disposable]
  );

  const activeStrategy = strategy ?? result.recommendedStrategy;
  const totalDebt = debts.reduce((s, d) => s + (d.balance || 0), 0);
  const tips = strategiesForTypes(debts.map((d) => d.type));
  const found = foundMoney(budget);

  // "Found money" what-if: redirect half of discretionary spending to debt.
  const boosted = useMemo(() => {
    if (!activeDebts.length || found.redirectable <= 0) return null;
    const base = simulatePayoff(activeDebts, Math.min(extra, disposable), activeStrategy);
    const withBoost = simulatePayoff(activeDebts, Math.min(extra, disposable) + found.redirectable, activeStrategy);
    if (!base.feasible || !withBoost.feasible) return null;
    return {
      monthsSooner: Math.max(0, base.months - withBoost.months),
      interestSaved: Math.max(0, base.totalInterest - withBoost.totalInterest),
    };
  }, [activeDebts, extra, disposable, activeStrategy, found.redirectable]);

  function update(id: string, patch: Partial<DebtInput>) {
    setDebts((cur) => cur.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  }
  const num = (v: string) => (v === "" ? 0 : Math.max(0, Number(v) || 0));

  return (
    <div className="space-y-6">
      {/* 1. Debts */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">1. Your debts</h2>
          <span className="text-sm text-slate-400">Total: <span className="font-semibold text-white">{usd(totalDebt)}</span></span>
        </div>
        <div className="hidden gap-3 px-1 pb-2 text-xs uppercase tracking-wide text-slate-500 md:grid" style={{ gridTemplateColumns: "1.4fr 1.4fr 1fr .8fr 1fr auto" }}>
          <span>Name</span><span>Type</span><span>Balance</span><span>APR %</span><span>Min / mo</span><span></span>
        </div>
        <div className="space-y-2">
          {debts.map((d) => (
            <div key={d.id} className="md:grid md:gap-3 md:items-center grid grid-cols-2 gap-2" style={{ gridTemplateColumns: "1.4fr 1.4fr 1fr .8fr 1fr auto" }}>
              <Input value={d.name} onChange={(e) => update(d.id, { name: e.target.value })} placeholder="e.g. Chase card" className={inputCls} />
              <select value={d.type} onChange={(e) => update(d.id, { type: e.target.value as DebtType })} className="h-9 rounded-md border border-white/15 bg-[#03040a] px-2 text-sm text-white">
                {TYPE_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              <Input type="number" value={d.balance || ""} onChange={(e) => update(d.id, { balance: num(e.target.value) })} placeholder="0" className={inputCls} />
              <Input type="number" value={d.apr || ""} onChange={(e) => update(d.id, { apr: num(e.target.value) })} placeholder="0" className={inputCls} />
              <Input type="number" value={d.minPayment || ""} onChange={(e) => update(d.id, { minPayment: num(e.target.value) })} placeholder="0" className={inputCls} />
              <button onClick={() => setDebts((c) => c.filter((x) => x.id !== d.id))} aria-label="Remove debt" className="flex h-9 w-9 items-center justify-center justify-self-end rounded-md text-slate-500 hover:text-rose-300">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
        <button onClick={() => setDebts((c) => [...c, { id: uid(), name: "", type: "credit_card", balance: 0, apr: 0, minPayment: 0 }])} className="mt-3 inline-flex items-center gap-1.5 text-sm text-cyan-300 hover:text-cyan-200">
          <Plus className="h-4 w-4" /> Add a debt
        </button>
      </section>

      {/* 2. Budget builder */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <h2 className="mb-1 text-lg font-semibold text-white">2. Build your budget</h2>
        <p className="mb-4 text-sm text-slate-400">Every dollar you free up here goes straight to getting you debt-free faster.</p>

        <label className="mb-5 block text-sm text-slate-400">
          Monthly take-home income
          <Input type="number" value={income || ""} onChange={(e) => { const v = num(e.target.value); setIncome(v); }} className={`${inputCls} mt-1.5 max-w-xs`} />
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          {EXPENSE_CATEGORIES.map((c) => (
            <label key={c.key} className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-[#03040a] px-3 py-2">
              <span className="text-sm text-slate-300">
                {c.label}
                {c.discretionary && <span className="ml-1.5 rounded bg-amber-400/10 px-1.5 py-0.5 text-[10px] font-medium uppercase text-amber-300">flexible</span>}
              </span>
              <span className="flex items-center gap-1 text-slate-400">
                <span className="text-xs">$</span>
                <Input type="number" value={budget[c.key] || ""} onChange={(e) => setBudget((b) => ({ ...b, [c.key]: num(e.target.value) }))} className="h-8 w-24 border-white/15 bg-transparent text-right text-white" />
              </span>
            </label>
          ))}
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-white/10 bg-[#03040a] p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Total expenses</p>
            <p className="mt-1 text-xl font-bold text-white">{usd(expenses)}</p>
          </div>
          <div className={`rounded-xl border p-4 ${disposable > 0 ? "border-cyan-400/30 bg-cyan-400/5" : "border-rose-400/30 bg-rose-400/5"}`}>
            <p className="text-xs uppercase tracking-wide text-slate-500">Free for debt payoff</p>
            <p className={`mt-1 text-xl font-bold ${disposable > 0 ? "text-cyan-300" : "text-rose-300"}`}>{usd(disposable)}</p>
          </div>
          <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-4">
            <p className="text-xs uppercase tracking-wide text-amber-300/80">Flexible spending</p>
            <p className="mt-1 text-xl font-bold text-amber-200">{usd(found.discretionary)}</p>
          </div>
        </div>

        {boosted && boosted.monthsSooner > 0 && (
          <div className="mt-4 flex items-start gap-3 rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-4">
            <PiggyBank className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-300" />
            <p className="text-sm text-emerald-100">
              <span className="font-semibold">Found money:</span> redirecting just half of your flexible spending
              ({usd(found.redirectable)}/mo) to debt would make you debt-free{" "}
              <span className="font-semibold">{formatDuration(boosted.monthsSooner)} sooner</span> and save{" "}
              <span className="font-semibold">{usd(boosted.interestSaved)}</span> in interest.
            </p>
          </div>
        )}

        <div className="mt-5">
          <div className="mb-2 flex justify-between text-sm text-slate-400">
            <span>Extra toward debt each month</span>
            <span className="font-semibold text-white">{usd(Math.min(extra, disposable))}</span>
          </div>
          <Slider min={0} max={Math.max(disposable, 100)} step={10} value={[Math.min(extra, disposable)]} onValueChange={([v]) => setExtra(v)} />
        </div>
      </section>

      {/* 3. Strategy */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <h2 className="mb-1 text-lg font-semibold text-white">3. Your payoff method</h2>
        <p className="mb-4 text-sm text-slate-400">{result.recommendationReason}</p>
        <div className="flex flex-wrap gap-2">
          {(["avalanche", "snowball"] as Strategy[]).map((s) => (
            <button key={s} onClick={() => setStrategy(s)}
              className={`rounded-full border px-4 py-2 text-sm capitalize transition-colors ${activeStrategy === s ? "border-cyan-400/50 bg-cyan-400/10 text-cyan-200" : "border-white/12 text-slate-300 hover:border-white/25"}`}>
              {s} {result.recommendedStrategy === s && <span className="ml-1 text-xs text-cyan-400">· recommended</span>}
            </button>
          ))}
        </div>
      </section>

      {/* 4. Results */}
      <section className="rounded-2xl border border-cyan-400/25 bg-gradient-to-b from-cyan-500/10 to-transparent p-6">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white"><Sparkles className="h-5 w-5 text-cyan-300" /> Your free payoff plan</h2>
        {!result.plan.feasible ? (
          <div className="rounded-xl border border-amber-400/30 bg-amber-400/5 p-4 text-sm text-amber-200">
            On this budget your payments barely cover the interest, so the debt never clears. That&rsquo;s exactly when settlement or restructuring helps — see the options below, free up more in your budget, or talk to a debt attorney.
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-4">
              <Stat label="Debt-free in" value={formatDuration(result.plan.months)} hi />
              <Stat label="Total interest" value={usd(result.plan.totalInterest)} />
              <Stat label="Interest saved" value={usd(result.interestSaved)} sub="vs. minimum payments" hi />
              <Stat label="Time saved" value={formatDuration(result.monthsSaved)} sub="sooner than minimums" />
            </div>
            <div className="mt-5">
              <p className="mb-2 text-sm font-medium text-slate-300">Payoff order ({activeStrategy}):</p>
              <ol className="space-y-1.5">
                {result.plan.payoffOrder.map((p, i) => (
                  <li key={p.id} className="flex items-center gap-3 text-sm">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-xs font-semibold text-white">{i + 1}</span>
                    <span className="text-white">{p.name || "Unnamed debt"}</span>
                    <span className="ml-auto text-slate-400">cleared in {formatDuration(p.monthCleared)}</span>
                  </li>
                ))}
              </ol>
            </div>
          </>
        )}
      </section>

      {/* 5. Strategies */}
      <section>
        <h2 className="mb-1 flex items-center gap-2 text-xl font-bold text-white"><Lightbulb className="h-5 w-5 text-amber-300" /> Strategies for your debts</h2>
        <p className="mb-5 text-sm text-slate-400">Tactics tuned to what you owe. <span className="text-amber-300">★</span> marks the ones most people have never heard of.</p>
        <div className="space-y-5">
          {tips.map(({ type, items }) => (
            <div key={type}>
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-cyan-300">{DEBT_TYPE_LABELS[type]}</h3>
              <div className="grid gap-3 md:grid-cols-2">
                {items.map((s) => (
                  <div key={s.title} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                    <p className="mb-1 text-sm font-semibold text-white">{s.lesserKnown && <span className="text-amber-300">★ </span>}{s.title}</p>
                    <p className="text-sm text-slate-400">{s.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <div>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-violet-300">Works on every debt</h3>
            <div className="grid gap-3 md:grid-cols-2">
              {UNIVERSAL_STRATEGIES.map((s) => (
                <div key={s.title} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="mb-1 text-sm font-semibold text-white">{s.lesserKnown && <span className="text-amber-300">★ </span>}{s.title}</p>
                  <p className="text-sm text-slate-400">{s.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 6. Bridges */}
      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <TrendingDown className="mb-2 h-7 w-7 text-cyan-300" />
          <h3 className="font-semibold text-white">Drowning in unsecured debt?</h3>
          <p className="mb-4 text-sm text-slate-400">$7,500+ in cards, medical bills, or loans you can&rsquo;t keep up with? Our AI agents may settle it for less than you owe.</p>
          <Link href="/qualify"><Button variant="outline" className="rounded-full border-white/20 bg-transparent text-white hover:bg-white/5 hover:text-white">See if you qualify</Button></Link>
        </section>
        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <Sparkles className="mb-2 h-7 w-7 text-violet-300" />
          <h3 className="font-semibold text-white">Need legal help or thinking bankruptcy?</h3>
          <p className="mb-4 text-sm text-slate-400">Connect with a vetted debt or bankruptcy attorney in your state for a free consultation.</p>
          <Link href="/find-an-attorney"><Button variant="outline" className="rounded-full border-white/20 bg-transparent text-white hover:bg-white/5 hover:text-white">Find an attorney</Button></Link>
        </section>
      </div>

      <p className="flex items-start gap-2 text-xs leading-relaxed text-slate-500">
        <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500" />
        This tool is free and private — your numbers stay in your browser and are never sent to us. It&rsquo;s educational, not financial, tax, or legal advice. Estimates assume fixed rates and consistent payments.
      </p>
    </div>
  );
}

function Stat({ label, value, sub, hi }: { label: string; value: string; sub?: string; hi?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 ${hi ? "border-cyan-400/30 bg-cyan-400/5" : "border-white/10 bg-[#03040a]"}`}>
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-xl font-bold ${hi ? "text-cyan-300" : "text-white"}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Plus, Trash2, Sparkles, Lightbulb, TrendingDown, CheckCircle2, ArrowRight } from "lucide-react";
import { buildPlan, formatDuration, type DebtInput, type DebtType, type Strategy } from "@/lib/advisor/payoff";
import { DEBT_TYPE_LABELS, strategiesForTypes, UNIVERSAL_STRATEGIES } from "@/lib/advisor/strategies";

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
  const [expenses, setExpenses] = useState(3900);
  const [strategy, setStrategy] = useState<Strategy | null>(null);
  const disposable = Math.max(0, income - expenses);
  const [extra, setExtra] = useState(disposable);

  const result = useMemo(
    () =>
      buildPlan({
        debts: debts.filter((d) => d.balance > 0),
        monthlyIncome: income,
        monthlyExpenses: expenses,
        extraToDebt: Math.min(extra, disposable),
        strategy: strategy ?? undefined,
      }),
    [debts, income, expenses, extra, strategy, disposable]
  );

  const activeStrategy = strategy ?? result.recommendedStrategy;
  const totalDebt = debts.reduce((s, d) => s + (d.balance || 0), 0);
  const tips = strategiesForTypes(debts.map((d) => d.type));

  function update(id: string, patch: Partial<DebtInput>) {
    setDebts((cur) => cur.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  }
  function addDebt() {
    setDebts((cur) => [...cur, { id: uid(), name: "", type: "credit_card", balance: 0, apr: 0, minPayment: 0 }]);
  }
  function removeDebt(id: string) {
    setDebts((cur) => cur.filter((d) => d.id !== id));
  }

  const num = (v: string) => (v === "" ? 0 : Math.max(0, Number(v) || 0));

  return (
    <div className="space-y-6">
      {/* Debts */}
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
            <div key={d.id} className="grid grid-cols-2 gap-2 md:grid-cols-none md:items-center" style={{ gridTemplateColumns: undefined }}>
              <div className="grid grid-cols-2 gap-2 md:hidden">
                <span className="col-span-2 text-xs text-slate-500">Debt</span>
              </div>
              <div className="contents md:grid md:gap-3" style={{ gridTemplateColumns: "1.4fr 1.4fr 1fr .8fr 1fr auto" }}>
                <Input value={d.name} onChange={(e) => update(d.id, { name: e.target.value })} placeholder="e.g. Chase card" className={inputCls} />
                <select value={d.type} onChange={(e) => update(d.id, { type: e.target.value as DebtType })} className="h-9 rounded-md border border-white/15 bg-[#03040a] px-2 text-sm text-white">
                  {TYPE_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
                <Input type="number" value={d.balance || ""} onChange={(e) => update(d.id, { balance: num(e.target.value) })} placeholder="0" className={inputCls} />
                <Input type="number" value={d.apr || ""} onChange={(e) => update(d.id, { apr: num(e.target.value) })} placeholder="0" className={inputCls} />
                <Input type="number" value={d.minPayment || ""} onChange={(e) => update(d.id, { minPayment: num(e.target.value) })} placeholder="0" className={inputCls} />
                <button onClick={() => removeDebt(d.id)} aria-label="Remove debt" className="flex h-9 w-9 items-center justify-center justify-self-end rounded-md text-slate-500 hover:text-rose-300">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
        <button onClick={addDebt} className="mt-3 inline-flex items-center gap-1.5 text-sm text-cyan-300 hover:text-cyan-200">
          <Plus className="h-4 w-4" /> Add a debt
        </button>
      </section>

      {/* Budget */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <h2 className="mb-4 text-lg font-semibold text-white">2. Your monthly budget</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="text-sm text-slate-400">Take-home income
            <Input type="number" value={income || ""} onChange={(e) => setIncome(num(e.target.value))} className={`${inputCls} mt-1.5`} />
          </label>
          <label className="text-sm text-slate-400">Living expenses (excl. debt)
            <Input type="number" value={expenses || ""} onChange={(e) => setExpenses(num(e.target.value))} className={`${inputCls} mt-1.5`} />
          </label>
          <div className="text-sm text-slate-400">Free for debt payoff
            <div className="mt-1.5 flex h-9 items-center rounded-md border border-cyan-400/30 bg-cyan-400/5 px-3 font-semibold text-cyan-300">{usd(disposable)}</div>
          </div>
        </div>
        <div className="mt-5">
          <div className="mb-2 flex justify-between text-sm text-slate-400">
            <span>Extra toward debt each month</span>
            <span className="font-semibold text-white">{usd(Math.min(extra, disposable))}</span>
          </div>
          <Slider min={0} max={Math.max(disposable, 100)} step={10} value={[Math.min(extra, disposable)]} onValueChange={([v]) => setExtra(v)} />
        </div>
      </section>

      {/* Strategy toggle */}
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

      {/* Results */}
      <section className="rounded-2xl border border-cyan-400/25 bg-gradient-to-b from-cyan-500/10 to-transparent p-6">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white"><Sparkles className="h-5 w-5 text-cyan-300" /> Your free payoff plan</h2>
        {!result.plan.feasible ? (
          <div className="rounded-xl border border-amber-400/30 bg-amber-400/5 p-4 text-sm text-amber-200">
            Your minimum payments barely cover the interest, so this debt never gets paid off on this budget. That&rsquo;s exactly when settlement or restructuring can help — see the options below, or add more to your monthly payoff amount.
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

      {/* Personalized strategies */}
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

      {/* Bridge to settlement */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <div className="flex flex-wrap items-center gap-4">
          <TrendingDown className="h-8 w-8 flex-shrink-0 text-cyan-300" />
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-white">Overwhelmed by unsecured debt?</h3>
            <p className="text-sm text-slate-400">If you have $7,500+ in credit cards, medical bills, or personal loans and can&rsquo;t keep up, our AI agents may be able to settle it for less than you owe. The plan above is always free.</p>
          </div>
          <Link href="/qualify" className="flex-shrink-0">
            <Button className="rounded-full bg-gradient-to-r from-cyan-500 to-violet-600 text-white">See if you qualify <ArrowRight className="ml-1 h-4 w-4" /></Button>
          </Link>
        </div>
      </section>

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

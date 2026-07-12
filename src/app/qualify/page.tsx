"use client";

import { useState } from "react";
import Link from "next/link";
import SolvanaNav from "@/components/solvana/nav";
import SolvanaFooter from "@/components/solvana/footer";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { estimateProgram, PROGRAM, USD } from "@/lib/solvana/brand";
import { CheckCircle2, AlertTriangle, PhoneCall } from "lucide-react";

type PayStatus = "current" | "behind" | "collections";

export default function QualifyPage() {
  const [debt, setDebt] = useState(20000);
  const [types, setTypes] = useState<string[]>([]);
  const [payStatus, setPayStatus] = useState<PayStatus | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const toggleType = (t: string) =>
    setTypes((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]));

  const qualifies = debt >= PROGRAM.minDebt && types.length > 0;
  const est = estimateProgram(debt);

  return (
    <div className="bg-[#050810] font-sans text-white">
      <SolvanaNav />

      <section className="relative overflow-hidden px-6 py-16">
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="absolute left-1/2 top-[-150px] h-[400px] w-[600px] -translate-x-1/2 rounded-full bg-violet-600/15 blur-[120px]" />
        </div>

        <div className="relative mx-auto max-w-2xl">
          <h1 className="mb-4 text-center text-4xl font-bold md:text-5xl">
            Is debt settlement{" "}
            <span className="bg-gradient-to-r from-cyan-400 to-violet-500 bg-clip-text text-transparent">
              right for you?
            </span>
          </h1>
          <p className="mb-10 text-center text-gray-300">
            Three questions. Honest answer — even when the answer is &ldquo;no, try
            something else.&rdquo; Nothing here affects your credit.
          </p>

          {!submitted ? (
            <div className="space-y-8 rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur">
              <div>
                <Label className="mb-3 block text-base text-white">
                  1. Your total estimated unsecured debt:{" "}
                  <span className="font-bold text-cyan-300">{USD.format(debt)}</span>
                </Label>
                <Slider min={2500} max={150000} step={500} value={[debt]} onValueChange={([v]) => setDebt(v)} />
                <div className="mt-2 flex justify-between text-xs text-gray-500">
                  <span>$2,500</span>
                  <span>$150,000+</span>
                </div>
              </div>

              <div>
                <Label className="mb-3 block text-base text-white">2. What types of debt do you have?</Label>
                <div className="grid gap-3 sm:grid-cols-2">
                  {PROGRAM.eligibleDebts.map((t) => (
                    <label
                      key={t}
                      className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-[#03040a] p-3 text-sm text-gray-300 transition-colors has-[[data-state=checked]]:border-cyan-400/50 has-[[data-state=checked]]:bg-cyan-400/5"
                    >
                      <Checkbox checked={types.includes(t)} onCheckedChange={() => toggleType(t)} />
                      {t}
                    </label>
                  ))}
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  Mortgages, auto loans, federal student loans, and tax debt don&apos;t qualify.
                </p>
              </div>

              <div>
                <Label className="mb-3 block text-base text-white">
                  3. Are you currently making payments on time?
                </Label>
                <RadioGroup
                  value={payStatus ?? undefined}
                  onValueChange={(v) => setPayStatus(v as PayStatus)}
                  className="gap-3"
                >
                  {[
                    ["current", "Yes, current on everything (but it's a struggle)"],
                    ["behind", "No, I've missed or am about to miss payments"],
                    ["collections", "Some accounts are already in collections"],
                  ].map(([value, label]) => (
                    <label
                      key={value}
                      className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-[#03040a] p-3 text-sm text-gray-300 has-[[data-state=checked]]:border-cyan-400/50 has-[[data-state=checked]]:bg-cyan-400/5"
                    >
                      <RadioGroupItem value={value} id={`pay-${value}`} />
                      {label}
                    </label>
                  ))}
                </RadioGroup>
              </div>

              <Button
                disabled={!payStatus || types.length === 0}
                onClick={() => setSubmitted(true)}
                className="h-12 w-full rounded-full bg-gradient-to-r from-cyan-500 to-violet-600 text-lg text-white shadow-[0_0_28px_rgba(139,92,246,0.4)] hover:from-cyan-400 hover:to-violet-500 disabled:opacity-40"
              >
                Get my honest assessment
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {qualifies ? (
                <div className="rounded-3xl border border-cyan-400/30 bg-cyan-400/5 p-8">
                  <h2 className="mb-3 flex items-center gap-2 text-2xl font-bold text-cyan-300">
                    <CheckCircle2 className="h-6 w-6" /> You likely qualify
                  </h2>
                  <p className="mb-6 text-sm leading-relaxed text-gray-300">
                    With {USD.format(debt)} in unsecured debt, you meet the{" "}
                    {USD.format(PROGRAM.minDebt)} program minimum. Based on typical results,
                    your program could look like:
                  </p>
                  <div className="mb-6 grid gap-4 text-center sm:grid-cols-3">
                    <div className="rounded-xl border border-white/10 bg-[#03040a] p-4">
                      <p className="text-xs uppercase tracking-wide text-gray-500">Est. total cost</p>
                      <p className="mt-1 text-lg font-bold">
                        {USD.format(est.totalCostLow)}–{USD.format(est.totalCostHigh)}
                      </p>
                    </div>
                    <div className="rounded-xl border border-cyan-400/30 bg-cyan-400/10 p-4">
                      <p className="text-xs uppercase tracking-wide text-cyan-300">Potential savings</p>
                      <p className="mt-1 text-lg font-bold text-cyan-300">
                        {USD.format(Math.max(0, est.savingsLow))}–{USD.format(Math.max(0, est.savingsHigh))}
                      </p>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-[#03040a] p-4">
                      <p className="text-xs uppercase tracking-wide text-gray-500">Timeline</p>
                      <p className="mt-1 text-lg font-bold">
                        {est.termLowMonths}–{est.termHighMonths} months
                      </p>
                    </div>
                  </div>
                  {payStatus === "current" && (
                    <p className="mb-6 rounded-xl border border-amber-400/30 bg-amber-400/5 p-4 text-xs leading-relaxed text-amber-200">
                      <AlertTriangle className="mr-1 inline h-4 w-4" /> You&apos;re current on your
                      payments, so weigh this carefully: the program requires you to stop paying
                      enrolled creditors, which will likely damage your credit significantly. If
                      you can realistically pay your debt down within ~4 years, a nonprofit
                      credit counselor or debt consolidation may serve you better. Aria will walk
                      through those alternatives with you.
                    </p>
                  )}
                  <div className="flex flex-col items-center gap-3 sm:flex-row">
                    <Button className="h-12 w-full rounded-full bg-gradient-to-r from-cyan-500 to-violet-600 px-8 text-white sm:w-auto">
                      <PhoneCall className="mr-2 h-4 w-4" /> Talk to Aria now — free
                    </Button>
                    <span className="text-sm text-gray-400">or call 1-888-SOLVANA, 24/7</span>
                  </div>
                </div>
              ) : (
                <div className="rounded-3xl border border-amber-400/30 bg-amber-400/5 p-8">
                  <h2 className="mb-3 flex items-center gap-2 text-2xl font-bold text-amber-300">
                    <AlertTriangle className="h-6 w-6" /> Debt settlement probably isn&apos;t your best move
                  </h2>
                  <p className="text-sm leading-relaxed text-gray-300">
                    {debt < PROGRAM.minDebt
                      ? `Our program requires at least ${USD.format(PROGRAM.minDebt)} in qualifying unsecured debt. Below that, the credit damage usually outweighs the savings. Consider a nonprofit credit counseling agency (look for NFCC members) — they can often negotiate lower interest rates without you stopping payments.`
                      : "Select at least one qualifying debt type so we can assess your situation. If all your debt is secured (mortgage, auto) or federal student loans, settlement isn't available for it — income-driven repayment or refinancing are better paths."}
                  </p>
                </div>
              )}
              <button
                onClick={() => setSubmitted(false)}
                className="mx-auto block text-sm text-gray-400 underline hover:text-white"
              >
                ← Adjust my answers
              </button>
              <p className="text-center text-xs leading-relaxed text-gray-500">
                Estimates only; results vary and are not guaranteed. Creditors are not required
                to accept settlements. Stopping payments will likely hurt your credit and may
                lead to continued interest, fees, collection, or lawsuits. Read the full{" "}
                <Link href="/legal/disclosures" className="underline hover:text-cyan-300">
                  program disclosures
                </Link>
                .
              </p>
            </div>
          )}
        </div>
      </section>

      <SolvanaFooter />
    </div>
  );
}

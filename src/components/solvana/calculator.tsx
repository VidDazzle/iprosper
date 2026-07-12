"use client";

import { useState } from "react";
import Link from "next/link";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { estimateProgram, PROGRAM, USD } from "@/lib/solvana/brand";

export default function SavingsCalculator() {
  const [debt, setDebt] = useState(25000);
  const est = estimateProgram(debt);
  const qualifies = debt >= PROGRAM.minDebt;

  return (
    <section className="relative bg-[#050810] px-6 py-24 text-white" id="calculator">
      <div className="mx-auto max-w-4xl">
        <p className="mb-3 text-center text-sm font-semibold uppercase tracking-[0.2em] text-cyan-400">
          Savings estimator
        </p>
        <h2 className="mb-12 text-center text-4xl font-bold md:text-5xl">
          What could{" "}
          <span className="bg-gradient-to-r from-cyan-400 to-violet-500 bg-clip-text text-transparent">
            {USD.format(debt)}
          </span>{" "}
          of debt become?
        </h2>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl md:p-10">
          <label className="mb-2 block text-sm text-gray-300" htmlFor="debt-slider">
            Total unsecured debt (credit cards, medical bills, personal loans)
          </label>
          <Slider
            id="debt-slider"
            min={5000}
            max={150000}
            step={500}
            value={[debt]}
            onValueChange={([v]) => setDebt(v)}
            className="my-6"
          />
          <div className="mb-8 flex justify-between text-xs text-gray-500">
            <span>$5,000</span>
            <span>$150,000</span>
          </div>

          {qualifies ? (
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-[#03040a] p-5 text-center">
                <p className="mb-1 text-xs uppercase tracking-wide text-gray-500">Estimated total cost*</p>
                <p className="text-2xl font-bold text-white">
                  {USD.format(est.totalCostLow)}–{USD.format(est.totalCostHigh)}
                </p>
                <p className="mt-1 text-xs text-gray-500">settlements + our fee</p>
              </div>
              <div className="rounded-2xl border border-cyan-400/30 bg-cyan-400/5 p-5 text-center shadow-[0_0_30px_rgba(34,211,238,0.1)]">
                <p className="mb-1 text-xs uppercase tracking-wide text-cyan-300">Potential savings*</p>
                <p className="text-2xl font-bold text-cyan-300">
                  {USD.format(Math.max(0, est.savingsLow))}–{USD.format(Math.max(0, est.savingsHigh))}
                </p>
                <p className="mt-1 text-xs text-gray-500">vs. enrolled balances</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-[#03040a] p-5 text-center">
                <p className="mb-1 text-xs uppercase tracking-wide text-gray-500">Est. monthly deposit*</p>
                <p className="text-2xl font-bold text-white">
                  {USD.format(est.monthlyLow)}–{USD.format(est.monthlyHigh)}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  over {est.termLowMonths}–{est.termHighMonths} months
                </p>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-amber-400/30 bg-amber-400/5 p-6 text-center text-sm text-amber-200">
              Our program requires at least {USD.format(PROGRAM.minDebt)} in qualifying unsecured
              debt. Below that, a nonprofit credit counselor is usually a better fit — and we&apos;ll
              tell you so on the phone, too.
            </div>
          )}

          <div className="mt-8 text-center">
            <Link href="/qualify">
              <Button className="h-12 rounded-full bg-gradient-to-r from-cyan-500 to-violet-600 px-10 text-lg text-white shadow-[0_0_28px_rgba(139,92,246,0.4)] hover:from-cyan-400 hover:to-violet-500">
                Get my real numbers
              </Button>
            </Link>
          </div>

          <p className="mt-6 text-xs leading-relaxed text-gray-500">
            *Estimates only, based on typical settlements of 40–60% of enrolled balances plus a{" "}
            {PROGRAM.feePctLow}%–{PROGRAM.feePctHigh}% fee on enrolled debt, before creditor-added
            interest and fees. Your results will vary and are not guaranteed. Creditors are not
            required to accept a settlement. Not all clients complete the program. Forgiven debt
            may be taxable.
          </p>
        </div>
      </div>
    </section>
  );
}

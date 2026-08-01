"use client";

import { useEffect, useState } from "react";
import Navigation from "@/components/sections/navigation";
import { Calendar, Mail, Video, Check, Loader2, Zap } from "lucide-react";

const ICONS: Record<string, any> = { calendar: Calendar, email: Mail, meet: Video };

function money(cents: number) {
  return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
}

export default function PlansPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/billing/plans")
      .then((r) => r.json())
      .then((d) => {
        setProducts(d.products || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-[#0b0b0b] text-white">
      <Navigation />
      <main className="mx-auto max-w-6xl px-6 py-14">
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl">Three products. Pay for what you use.</h1>
          <p className="mx-auto mt-3 max-w-2xl text-gray-400">
            Every Evolve app is metered — a clear monthly allowance, a live usage bar, and one-tap
            credit top-ups when you need more. No surprises, no overage shock.
          </p>
        </div>

        {loading ? (
          <div className="flex h-40 items-center justify-center text-gray-500"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : (
          <div className="space-y-16">
            {products.map((p) => {
              const Icon = ICONS[p.product] || Zap;
              return (
                <section key={p.product}>
                  <div className="mb-6 flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/5">
                      <Icon className="h-6 w-6 text-blue-400" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold">{p.label}</h2>
                      <p className="text-sm text-gray-500">
                        Metered by {p.unitLabel} · extra credits {money(p.overagePriceCents)}/unit
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    {p.tiers.map((t: any, i: number) => {
                      const featured = i === 1;
                      return (
                        <div
                          key={t.tier}
                          className={`relative rounded-2xl border p-6 ${
                            featured ? "border-blue-500/50 bg-blue-500/5" : "border-white/10 bg-white/[0.02]"
                          }`}
                        >
                          {featured && (
                            <span className="absolute -top-2.5 left-6 rounded-full bg-blue-500 px-2.5 py-0.5 text-[11px] font-semibold text-white">
                              Most popular
                            </span>
                          )}
                          <div className="text-sm text-gray-400">{t.name}</div>
                          <div className="mt-1 flex items-end gap-1">
                            <span className="text-4xl font-bold">{money(t.monthlyPriceCents)}</span>
                            <span className="mb-1 text-sm text-gray-500">/mo</span>
                          </div>
                          <div className="mt-4 space-y-2 text-sm text-gray-300">
                            <div className="flex items-center gap-2">
                              <Check className="h-4 w-4 text-emerald-400" />
                              {t.includedUnits.toLocaleString()} {p.unitLabel}/mo
                            </div>
                            <div className="flex items-center gap-2">
                              <Check className="h-4 w-4 text-emerald-400" /> Live usage bar + cap alerts
                            </div>
                            <div className="flex items-center gap-2">
                              <Check className="h-4 w-4 text-emerald-400" /> Buy credits any time
                            </div>
                          </div>
                          <a
                            href={`/buy/${p.product}-${t.tier}`}
                            className={`mt-6 block rounded-lg py-2.5 text-center text-sm font-semibold ${
                              featured ? "bg-white text-black hover:bg-gray-200" : "border border-white/15 text-white hover:bg-white/5"
                            }`}
                          >
                            Choose {t.name}
                          </a>
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        )}

        <p className="mt-16 text-center text-xs text-gray-600">
          Usage is prepaid and hard-capped — you're never billed for more than you've bought, and we
          only ever run work you've paid for.
        </p>
      </main>
    </div>
  );
}

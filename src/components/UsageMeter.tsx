"use client";

import { useEffect, useState, useCallback } from "react";
import { usePathname } from "next/navigation";
import { Gauge, X, Zap, ArrowUpRight, Loader2, ChevronUp, ChevronDown } from "lucide-react";

// The usage meter tracks Evolve BUSINESS consumption. Keep it off the Orbit
// (personal) app + all marketing/sales pages, where a billing bar is noise.
const HIDE_PREFIXES = [
  "/orbit", "/orbit-os", "/life", "/fitness", "/together", "/discover", "/chat", "/moderation",
  "/suite", "/pricing", "/signin", "/signup", "/schedule-demo", "/solutions", "/company",
  "/careers", "/blog", "/docs", "/team", "/agents",
];

interface Usage {
  product: "calendar" | "email" | "meet";
  label: string;
  unitLabel: string;
  tier: string;
  includedUnits: number;
  usedUnits: number;
  extraCredits: number;
  remaining: number;
  pctUsed: number;
  capReached: boolean;
  overagePriceCents: number;
}

/**
 * Always-visible usage bar. Shows each product's monthly consumption so users
 * can see how close they are to their cap; at/near the cap it surfaces
 * buy-credits / upgrade actions.
 */
export default function UsageMeter() {
  const pathname = usePathname();
  const [usage, setUsage] = useState<Usage[]>([]);
  const [open, setOpen] = useState(true);
  const [hidden, setHidden] = useState(false);
  const [topUp, setTopUp] = useState<Usage | null>(null);
  const suppressed = HIDE_PREFIXES.some((p) => pathname === p || pathname?.startsWith(p + "/")) || pathname === "/";

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/billing/usage");
      if (res.ok) setUsage((await res.json()).usage || []);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, [load]);

  if (suppressed || hidden || usage.length === 0) return null;

  const anyCap = usage.some((u) => u.capReached);
  const anyWarn = usage.some((u) => u.pctUsed >= 80);

  function barColor(u: Usage) {
    if (u.capReached) return "bg-red-500";
    if (u.pctUsed >= 80) return "bg-amber-500";
    return "bg-emerald-500";
  }

  return (
    <>
      <div className="fixed bottom-3 left-3 z-[150] w-72 max-w-[calc(100vw-1.5rem)] rounded-xl border border-white/10 bg-[#141414]/95 shadow-2xl backdrop-blur">
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-center justify-between px-3 py-2"
        >
          <span className="flex items-center gap-2 text-xs font-medium text-white">
            <Gauge className={`h-4 w-4 ${anyCap ? "text-red-400" : anyWarn ? "text-amber-400" : "text-emerald-400"}`} />
            Usage this month
          </span>
          <span className="flex items-center gap-1 text-gray-500">
            {open ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </span>
        </button>

        {open && (
          <div className="space-y-2.5 px-3 pb-3">
            {usage.map((u) => (
              <div key={u.product}>
                <div className="mb-1 flex items-center justify-between text-[11px]">
                  <span className="text-gray-300">{u.label}</span>
                  <span className={u.capReached ? "text-red-400" : "text-gray-500"}>
                    {u.usedUnits.toLocaleString()}/{u.includedUnits.toLocaleString()}
                    {u.extraCredits > 0 ? ` (+${u.extraCredits.toLocaleString()} credits)` : ""}
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                  <div className={`h-full ${barColor(u)} transition-all`} style={{ width: `${u.pctUsed}%` }} />
                </div>
                {(u.capReached || u.pctUsed >= 80) && (
                  <button
                    onClick={() => setTopUp(u)}
                    className={`mt-1 flex items-center gap-1 text-[11px] ${u.capReached ? "text-red-300" : "text-amber-300"} hover:underline`}
                  >
                    <Zap className="h-3 w-3" />
                    {u.capReached ? "Cap reached — buy credits" : "Running low — top up"}
                  </button>
                )}
              </div>
            ))}
            <div className="flex items-center justify-between pt-1">
              <a href="/plans" className="flex items-center gap-1 text-[11px] text-blue-300 hover:underline">
                Upgrade plans <ArrowUpRight className="h-3 w-3" />
              </a>
              <button onClick={() => setHidden(true)} className="text-[11px] text-gray-600 hover:text-gray-400">
                Hide
              </button>
            </div>
          </div>
        )}
      </div>

      {topUp && <TopUpModal usage={topUp} onClose={() => setTopUp(null)} onDone={load} />}
    </>
  );
}

function TopUpModal({ usage, onClose, onDone }: { usage: Usage; onClose: () => void; onDone: () => void }) {
  const [packs, setPacks] = useState<{ units: number; priceCents: number }[]>([]);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/billing/plans")
      .then((r) => r.json())
      .then((d) => {
        const p = (d.products || []).find((x: any) => x.product === usage.product);
        setPacks(p?.creditPacks || []);
      })
      .catch(() => {});
  }, [usage.product]);

  async function buy(units: number) {
    setBusy(true);
    setNote(null);
    const res = await fetch("/api/billing/credits/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product: usage.product, units }),
    });
    const data = await res.json();
    setBusy(false);
    if (data.checkoutUrl) {
      window.location.href = data.checkoutUrl;
      return;
    }
    setNote(data.note || "Order recorded. Credits are granted once payment is confirmed.");
    onDone();
  }

  function money(c: number) {
    return `$${(c / 100).toFixed(2)}`;
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#161616] p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Add {usage.label} credits</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X className="h-5 w-5" /></button>
        </div>
        <p className="mb-4 text-sm text-gray-400">
          You've used {usage.usedUnits.toLocaleString()} of {usage.includedUnits.toLocaleString()} {usage.unitLabel}. Buy
          credits to keep working, or upgrade your plan.
        </p>
        <div className="space-y-2">
          {packs.map((p) => (
            <button
              key={p.units}
              onClick={() => buy(p.units)}
              disabled={busy}
              className="flex w-full items-center justify-between rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3 text-sm hover:border-emerald-500/50 disabled:opacity-60"
            >
              <span className="text-white">{p.units.toLocaleString()} credits</span>
              <span className="font-semibold text-emerald-400">{money(p.priceCents)}</span>
            </button>
          ))}
        </div>
        {note && <p className="mt-3 text-xs text-amber-300">{note}</p>}
        <a href="/plans" className="mt-4 flex items-center justify-center gap-1 rounded-lg bg-white py-2.5 text-sm font-semibold text-black hover:bg-gray-200">
          Or upgrade your plan <ArrowUpRight className="h-4 w-4" />
        </a>
      </div>
    </div>
  );
}

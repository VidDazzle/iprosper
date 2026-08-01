"use client";

import { useEffect, useState, useCallback } from "react";
import Navigation from "@/components/sections/navigation";
import { Loader2, TrendingUp, TrendingDown, Lightbulb, Star, RefreshCw } from "lucide-react";

export default function InsightsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/production-insights");
    setData(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function scoreColor(v: number | null) {
    if (v == null) return "text-gray-400";
    if (v >= 8) return "text-emerald-400";
    if (v >= 6) return "text-amber-400";
    return "text-red-400";
  }

  return (
    <div className="min-h-screen bg-[#0e0e0e] text-white">
      <Navigation />
      <main className="mx-auto max-w-4xl px-6 py-12">
        <div className="mb-8 flex items-start justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-300">
              <Star className="h-3.5 w-3.5" /> Production insights
            </div>
            <h1 className="text-3xl font-bold">Quality from client scores</h1>
            <p className="mt-2 max-w-2xl text-gray-400">
              Every 1–10 rating clients give on delivered work rolls up here, so you can see what's
              landing and where to improve.
            </p>
          </div>
          <button onClick={load} className="flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-sm text-gray-300 hover:bg-white/5">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>

        {loading ? (
          <div className="flex h-40 items-center justify-center text-gray-500"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : (
          <div className="space-y-8">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
                <div className="mb-1 text-sm text-gray-400">Overall average</div>
                <div className={`text-4xl font-bold ${scoreColor(data?.overallAverage)}`}>
                  {data?.overallAverage ?? "—"}<span className="text-lg text-gray-600">/10</span>
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
                <div className="mb-1 text-sm text-gray-400">Ratings collected</div>
                <div className="text-4xl font-bold">{data?.total ?? 0}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
                <div className="mb-1 text-sm text-gray-400">Trend (recent vs prior)</div>
                <div className={`flex items-center gap-2 text-3xl font-bold ${data?.trend >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {data?.trend == null ? "—" : (
                    <>
                      {data.trend >= 0 ? <TrendingUp className="h-6 w-6" /> : <TrendingDown className="h-6 w-6" />}
                      {data.trend > 0 ? "+" : ""}{data.trend}
                    </>
                  )}
                </div>
              </div>
            </div>

            {data?.byCategory?.length > 0 && (
              <section>
                <h2 className="mb-3 text-lg font-semibold">By category (lowest first)</h2>
                <div className="space-y-2">
                  {data.byCategory.map((c: any) => (
                    <div key={c.category} className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3">
                      <span className="w-40 truncate text-sm capitalize">{c.category.replace(/_/g, " ")}</span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
                        <div className={`h-full ${c.average >= 8 ? "bg-emerald-500" : c.average >= 6 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${(c.average / 10) * 100}%` }} />
                      </div>
                      <span className={`w-16 text-right text-sm font-medium ${scoreColor(c.average)}`}>{c.average}/10</span>
                      <span className="w-12 text-right text-xs text-gray-500">n={c.count}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section>
              <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
                <Lightbulb className="h-5 w-5 text-amber-400" /> How to improve production
              </h2>
              <div className="space-y-2">
                {(data?.recommendations || []).map((r: string, i: number) => (
                  <div key={i} className="rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3 text-sm text-gray-200">
                    {r}
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

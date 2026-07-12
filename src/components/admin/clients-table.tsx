"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { PhaseBadge, money, pct, ProgressBar } from "./ui";
import { Input } from "@/components/ui/input";
import { Search, AlertTriangle } from "lucide-react";
import type { ClientPhase } from "@/lib/admin/types";

export interface Row {
  id: string;
  name: string;
  stateCode: string;
  phase: ClientPhase;
  source: string;
  enrolledDebtTotal: number;
  savings: number;
  progressPct: number;
  depositAdherence: number;
  balance: number;
  litigation: boolean;
  creditDelta: number;
}

const PHASES: (ClientPhase | "all")[] = ["all", "intake", "enrolled-saving", "negotiating", "settling", "graduated", "withdrawn"];
const PHASE_LABEL: Record<string, string> = {
  all: "All",
  intake: "Intake",
  "enrolled-saving": "Saving",
  negotiating: "Negotiating",
  settling: "Settling",
  graduated: "Graduated",
  withdrawn: "Withdrawn",
};

export default function ClientsTable({ rows }: { rows: Row[] }) {
  const [q, setQ] = useState("");
  const [phase, setPhase] = useState<ClientPhase | "all">("all");

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (phase !== "all" && r.phase !== phase) return false;
      if (q && !`${r.name} ${r.id} ${r.stateCode}`.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [rows, q, phase]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, ID, state…"
            className="border-white/15 bg-[#0b1220] pl-9 text-white placeholder:text-slate-600"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {PHASES.map((p) => (
            <button
              key={p}
              onClick={() => setPhase(p)}
              className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                phase === p
                  ? "border-cyan-400/50 bg-cyan-400/10 text-cyan-200"
                  : "border-white/10 text-slate-400 hover:border-white/25"
              }`}
            >
              {PHASE_LABEL[p]}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full min-w-[860px] text-sm">
          <thead className="bg-white/[0.02] text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Client</th>
              <th className="px-4 py-3 font-medium">Phase</th>
              <th className="px-4 py-3 font-medium">Enrolled debt</th>
              <th className="px-4 py-3 font-medium">Saved</th>
              <th className="px-4 py-3 font-medium">Account</th>
              <th className="px-4 py-3 font-medium">Credit Δ</th>
              <th className="px-4 py-3 font-medium">Progress</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filtered.map((r) => (
              <tr key={r.id} className="transition-colors hover:bg-white/[0.03]">
                <td className="px-4 py-3">
                  <Link href={`/admin/clients/${r.id}`} className="group flex items-center gap-2">
                    <span>
                      <span className="block font-medium text-white group-hover:text-cyan-300">{r.name}</span>
                      <span className="text-xs text-slate-500">{r.id} · {r.stateCode} · {r.source}</span>
                    </span>
                    {r.litigation && <AlertTriangle className="h-4 w-4 text-rose-400" />}
                  </Link>
                </td>
                <td className="px-4 py-3"><PhaseBadge phase={r.phase} /></td>
                <td className="px-4 py-3 text-slate-200">{money(r.enrolledDebtTotal)}</td>
                <td className="px-4 py-3 text-emerald-300">{money(r.savings)}</td>
                <td className="px-4 py-3 text-slate-300">{money(r.balance)}</td>
                <td className={`px-4 py-3 ${r.creditDelta >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                  {r.creditDelta >= 0 ? "+" : ""}{r.creditDelta}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="w-24"><ProgressBar value={r.progressPct} /></span>
                    <span className="text-xs text-slate-400">{pct(r.progressPct)}</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="px-4 py-8 text-center text-sm text-slate-500">No clients match your filters.</p>}
      </div>
      <p className="text-xs text-slate-500">{filtered.length} of {rows.length} clients</p>
    </div>
  );
}

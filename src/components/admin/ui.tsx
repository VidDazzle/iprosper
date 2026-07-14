import type { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import type { ClientPhase, DebtStatus } from "@/lib/admin/types";

export const money = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
export const pct = (n: number) => `${Math.round(n * 100)}%`;

export function StatCard({
  label,
  value,
  sub,
  trend,
  accent = "cyan",
}: {
  label: string;
  value: string;
  sub?: string;
  trend?: number;
  accent?: "cyan" | "violet" | "emerald" | "amber" | "rose";
}) {
  const accents: Record<string, string> = {
    cyan: "from-cyan-500/15 text-cyan-300",
    violet: "from-violet-500/15 text-violet-300",
    emerald: "from-emerald-500/15 text-emerald-300",
    amber: "from-amber-500/15 text-amber-300",
    rose: "from-rose-500/15 text-rose-300",
  };
  return (
    <div className={`rounded-xl border border-white/10 bg-gradient-to-b ${accents[accent]} to-transparent p-5`}>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1.5 text-2xl font-bold text-white">{value}</p>
      <div className="mt-1 flex items-center gap-2 text-xs">
        {trend != null && (
          <span className={`inline-flex items-center gap-0.5 ${trend >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
            {trend >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {Math.abs(trend)}%
          </span>
        )}
        {sub && <span className="text-slate-500">{sub}</span>}
      </div>
    </div>
  );
}

const PHASE_STYLE: Record<ClientPhase, string> = {
  prospect: "bg-slate-500/15 text-slate-300 border-slate-500/30",
  intake: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  "enrolled-saving": "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
  negotiating: "bg-violet-500/15 text-violet-300 border-violet-500/30",
  settling: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  graduated: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  withdrawn: "bg-slate-600/15 text-slate-400 border-slate-600/30",
};
const PHASE_LABEL: Record<ClientPhase, string> = {
  prospect: "Prospect",
  intake: "Intake",
  "enrolled-saving": "Saving",
  negotiating: "Negotiating",
  settling: "Settling",
  graduated: "Graduated",
  withdrawn: "Withdrawn",
};

export function PhaseBadge({ phase }: { phase: ClientPhase }) {
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${PHASE_STYLE[phase]}`}>
      {PHASE_LABEL[phase]}
    </span>
  );
}

const DEBT_STYLE: Record<DebtStatus, string> = {
  enrolled: "bg-slate-500/15 text-slate-300",
  negotiating: "bg-violet-500/15 text-violet-300",
  offer_pending: "bg-amber-500/15 text-amber-300",
  settled: "bg-cyan-500/15 text-cyan-300",
  paid: "bg-emerald-500/15 text-emerald-300",
  litigation: "bg-rose-500/15 text-rose-300",
};
const DEBT_LABEL: Record<DebtStatus, string> = {
  enrolled: "Enrolled",
  negotiating: "Negotiating",
  offer_pending: "Offer pending",
  settled: "Settled",
  paid: "Paid",
  litigation: "Litigation",
};

export function DebtStatusBadge({ status }: { status: DebtStatus }) {
  return <span className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${DEBT_STYLE[status]}`}>{DEBT_LABEL[status]}</span>;
}

export function Panel({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#0b1220]/60 p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

export function ProgressBar({ value, color = "cyan" }: { value: number; color?: string }) {
  const colors: Record<string, string> = {
    cyan: "from-cyan-500 to-cyan-400",
    violet: "from-violet-500 to-violet-400",
    emerald: "from-emerald-500 to-emerald-400",
    amber: "from-amber-500 to-amber-400",
  };
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
      <div className={`h-full rounded-full bg-gradient-to-r ${colors[color]}`} style={{ width: `${Math.min(100, Math.round(value * 100))}%` }} />
    </div>
  );
}

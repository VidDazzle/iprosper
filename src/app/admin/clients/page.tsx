import ClientsTable, { type Row } from "@/components/admin/clients-table";
import { allCaseSummaries } from "@/lib/admin/reports";

export default function ClientsPage() {
  const rows: Row[] = allCaseSummaries().map((c) => ({
    id: c.client.id,
    name: c.client.name,
    stateCode: c.client.stateCode,
    phase: c.client.phase,
    source: c.client.source,
    enrolledDebtTotal: c.enrolledDebtTotal,
    savings: c.savings,
    progressPct: c.progressPct,
    depositAdherence: c.depositAdherence,
    balance: c.client.dedicatedAccountBalance,
    litigation: c.client.litigationActive,
    creditDelta: c.creditDelta,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Client Cases</h1>
        <p className="text-sm text-slate-400">Every enrolled client and the live state of their program.</p>
      </div>
      <ClientsTable rows={rows} />
    </div>
  );
}

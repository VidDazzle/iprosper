"use client";

import { useState } from "react";
import { FileText, Search } from "lucide-react";
import HealthAnalyzer from "./analyzer";
import HealthBillAuditor from "./bill-auditor";

export default function HealthTools() {
  const [tab, setTab] = useState<"audit" | "analyze">("audit");

  return (
    <div>
      <div className="mb-6 inline-flex rounded-full border border-white/10 bg-white/[0.03] p-1">
        <button onClick={() => setTab("audit")}
          className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors ${tab === "audit" ? "bg-gradient-to-r from-cyan-500 to-violet-600 text-white" : "text-slate-400 hover:text-white"}`}>
          <Search className="h-4 w-4" /> Audit an itemized bill
        </button>
        <button onClick={() => setTab("analyze")}
          className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors ${tab === "analyze" ? "bg-gradient-to-r from-cyan-500 to-violet-600 text-white" : "text-slate-400 hover:text-white"}`}>
          <FileText className="h-4 w-4" /> Analyze a document
        </button>
      </div>

      {tab === "audit" ? <HealthBillAuditor /> : <HealthAnalyzer />}
    </div>
  );
}

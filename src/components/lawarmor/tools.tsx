"use client";

import { useState } from "react";
import { FileText, GitCompare } from "lucide-react";
import LawArmorAnalyzer from "./analyzer";
import LawArmorCompareTool from "./compare-tool";

export default function LawArmorTools() {
  const [tab, setTab] = useState<"analyze" | "compare">("analyze");

  return (
    <div>
      <div className="mb-6 inline-flex rounded-full border border-white/10 bg-white/[0.03] p-1">
        <button onClick={() => setTab("analyze")}
          className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors ${tab === "analyze" ? "bg-gradient-to-r from-cyan-500 to-violet-600 text-white" : "text-slate-400 hover:text-white"}`}>
          <FileText className="h-4 w-4" /> Analyze one document
        </button>
        <button onClick={() => setTab("compare")}
          className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors ${tab === "compare" ? "bg-gradient-to-r from-cyan-500 to-violet-600 text-white" : "text-slate-400 hover:text-white"}`}>
          <GitCompare className="h-4 w-4" /> Compare offers
        </button>
      </div>

      {tab === "analyze" ? <LawArmorAnalyzer /> : <LawArmorCompareTool />}
    </div>
  );
}

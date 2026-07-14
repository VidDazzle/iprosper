"use client";

import { useState } from "react";
import { FileText, GitCompare, ShieldQuestion } from "lucide-react";
import LawArmorAnalyzer from "./analyzer";
import LawArmorCompareTool from "./compare-tool";
import LawArmorCoverageChecker from "./coverage-checker";

type Tab = "coverage" | "analyze" | "compare";

const TABS: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "coverage", label: "Is it covered?", icon: ShieldQuestion },
  { id: "analyze", label: "Analyze one document", icon: FileText },
  { id: "compare", label: "Compare offers", icon: GitCompare },
];

export default function LawArmorTools() {
  const [tab, setTab] = useState<Tab>("coverage");

  return (
    <div>
      <div className="mb-6 inline-flex flex-wrap rounded-full border border-white/10 bg-white/[0.03] p-1">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors ${tab === t.id ? "bg-gradient-to-r from-cyan-500 to-violet-600 text-white" : "text-slate-400 hover:text-white"}`}>
            <t.icon className="h-4 w-4" /> {t.label}
          </button>
        ))}
      </div>

      {tab === "coverage" && <LawArmorCoverageChecker />}
      {tab === "analyze" && <LawArmorAnalyzer />}
      {tab === "compare" && <LawArmorCompareTool />}
    </div>
  );
}

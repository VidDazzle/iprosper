import type { Metadata } from "next";
import SolvanaNav from "@/components/solvana/nav";
import SolvanaFooter from "@/components/solvana/footer";
import FinalCTA from "@/components/solvana/cta";
import { AGENTS } from "@/lib/agents/registry";
import { AGENT_ICONS, AGENT_GRADIENTS } from "@/components/solvana/agent-grid";
import { Badge } from "@/components/ui/badge";
import { AudioLines, ArrowUpRight, ShieldAlert } from "lucide-react";
import { JsonLd, serviceLd, breadcrumbLd, pageMetadata } from "@/lib/solvana/seo";

export const metadata: Metadata = pageMetadata({
  title: "The AI Agent Workforce",
  description:
    "Meet the nine specialized AI agents that run Solvana end to end — enrollment, debt analysis, negotiation, banking, compliance, voice, client success, risk, and escalations.",
  path: "/agents",
});

export default function AgentsPage() {
  return (
    <div className="bg-[#050810] font-sans text-white">
      <JsonLd
        data={[
          serviceLd(),
          breadcrumbLd([
            { name: "Home", path: "/" },
            { name: "AI Agents", path: "/agents" },
          ]),
        ]}
      />
      <SolvanaNav />

      <section className="relative overflow-hidden px-6 pb-16 pt-20 text-center">
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="absolute left-1/2 top-[-150px] h-[400px] w-[600px] -translate-x-1/2 rounded-full bg-violet-600/20 blur-[120px]" />
        </div>
        <div className="relative mx-auto max-w-4xl">
          <h1 className="mb-6 text-5xl font-bold md:text-6xl">
            A company staffed by{" "}
            <span className="bg-gradient-to-r from-cyan-400 to-violet-500 bg-clip-text text-transparent">
              nine AI specialists
            </span>
          </h1>
          <p className="text-lg text-gray-300">
            Each agent owns one job, speaks with its own voice, and operates inside
            hard-coded legal guardrails. Together they run every step of your program —
            and they know exactly when a matter belongs with a licensed human attorney
            instead.
          </p>
        </div>
      </section>

      <section className="px-6 pb-24">
        <div className="mx-auto max-w-5xl space-y-8">
          {AGENTS.map((a) => {
            const Icon = AGENT_ICONS[a.id];
            const clientFacing = a.channels.some((c) => c !== "internal");
            return (
              <article
                key={a.id}
                className="rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur md:p-10"
              >
                <div className="mb-5 flex flex-wrap items-center gap-4">
                  <span
                    className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${AGENT_GRADIENTS[a.id]} shadow-lg`}
                  >
                    <Icon className="h-7 w-7 text-white" />
                  </span>
                  <div>
                    <h2 className="text-2xl font-bold">{a.name}</h2>
                    <p className="text-sm text-gray-400">{a.role}</p>
                  </div>
                  <div className="ml-auto flex flex-wrap gap-2">
                    {clientFacing ? (
                      <Badge className="rounded-full border border-cyan-400/30 bg-cyan-400/10 text-cyan-300">
                        <AudioLines className="mr-1 h-3 w-3" /> Voice agent
                      </Badge>
                    ) : (
                      <Badge className="rounded-full border border-white/15 bg-white/5 text-gray-300">
                        Internal engine
                      </Badge>
                    )}
                    {a.voice && (
                      <Badge className="rounded-full border border-violet-400/30 bg-violet-400/10 text-violet-300">
                        {a.voice.style} voice
                      </Badge>
                    )}
                  </div>
                </div>

                <p className="mb-6 leading-relaxed text-gray-300">{a.summary}</p>

                <div className="grid gap-6 md:grid-cols-2">
                  {a.requiredDisclosures.length > 0 && (
                    <div className="rounded-xl border border-white/10 bg-[#03040a] p-5">
                      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-cyan-300">
                        <ShieldAlert className="h-4 w-4" /> Required disclosures
                      </h3>
                      <ul className="space-y-2 text-xs leading-relaxed text-gray-400">
                        {a.requiredDisclosures.slice(0, 4).map((d) => (
                          <li key={d} className="flex gap-2">
                            <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-cyan-400" />
                            {d}
                          </li>
                        ))}
                        {a.requiredDisclosures.length > 4 && (
                          <li className="text-gray-500">
                            + {a.requiredDisclosures.length - 4} more, delivered verbatim on every
                            enrollment call
                          </li>
                        )}
                      </ul>
                    </div>
                  )}
                  {a.escalations.length > 0 && (
                    <div className="rounded-xl border border-white/10 bg-[#03040a] p-5">
                      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-violet-300">
                        <ArrowUpRight className="h-4 w-4" /> Escalation paths
                      </h3>
                      <ul className="space-y-2 text-xs leading-relaxed text-gray-400">
                        {a.escalations.map((e) => (
                          <li key={e.trigger} className="flex gap-2">
                            <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-violet-400" />
                            <span>
                              {e.trigger} →{" "}
                              <span className="text-gray-300">
                                {e.target === "human-attorney"
                                  ? "licensed human attorney"
                                  : e.target === "human-supervisor"
                                    ? "human supervisor"
                                    : AGENTS.find((x) => x.id === e.target)?.name ?? e.target}
                              </span>
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <FinalCTA />
      <SolvanaFooter />
    </div>
  );
}

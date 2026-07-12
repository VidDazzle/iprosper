import Link from "next/link";
import { AGENTS } from "@/lib/agents/registry";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  UserRoundCheck,
  Brain,
  Handshake,
  Landmark,
  ShieldCheck,
  AudioLines,
  HeartHandshake,
  Activity,
  Scale,
  type LucideIcon,
} from "lucide-react";
import type { AgentId } from "@/lib/agents/types";

export const AGENT_ICONS: Record<AgentId, LucideIcon> = {
  aria: UserRoundCheck,
  atlas: Brain,
  nova: Handshake,
  ledger: Landmark,
  sentinel: ShieldCheck,
  echo: AudioLines,
  sage: HeartHandshake,
  pulse: Activity,
  guardian: Scale,
};

export const AGENT_GRADIENTS: Record<AgentId, string> = {
  aria: "from-cyan-400 to-sky-600",
  atlas: "from-violet-400 to-purple-600",
  nova: "from-fuchsia-400 to-pink-600",
  ledger: "from-emerald-400 to-teal-600",
  sentinel: "from-amber-400 to-orange-600",
  echo: "from-sky-400 to-indigo-600",
  sage: "from-rose-400 to-red-500",
  pulse: "from-lime-400 to-emerald-600",
  guardian: "from-indigo-400 to-violet-600",
};

export default function AgentGrid({ compact = false }: { compact?: boolean }) {
  const agents = compact ? AGENTS.slice(0, 6) : AGENTS;

  return (
    <section className="relative bg-[#03040a] px-6 py-24 text-white">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute left-[-150px] top-1/3 h-[350px] w-[350px] rounded-full bg-violet-600/10 blur-[100px]" />
        <div className="absolute right-[-150px] top-2/3 h-[350px] w-[350px] rounded-full bg-cyan-500/10 blur-[100px]" />
      </div>

      <div className="relative mx-auto max-w-6xl">
        <p className="mb-3 text-center text-sm font-semibold uppercase tracking-[0.2em] text-violet-400">
          The workforce
        </p>
        <h2 className="mb-4 text-center text-4xl font-bold md:text-5xl">
          Nine specialists.{" "}
          <span className="bg-gradient-to-r from-cyan-400 to-violet-500 bg-clip-text text-transparent">
            Zero humans in the loop.
          </span>
        </h2>
        <p className="mx-auto mb-14 max-w-2xl text-center text-gray-400">
          Every task at Solvana is owned by a purpose-built AI agent with its own
          specialty, voice, and hard-coded compliance guardrails. They hand your
          file to each other in milliseconds — and escalate to licensed human
          attorneys the moment a matter requires one.
        </p>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {agents.map((a) => {
            const Icon = AGENT_ICONS[a.id];
            const clientFacing = a.channels.some((c) => c !== "internal");
            return (
              <div
                key={a.id}
                className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur transition-all hover:-translate-y-1 hover:border-white/25"
              >
                <div className="mb-4 flex items-center gap-3">
                  <span
                    className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${AGENT_GRADIENTS[a.id]} shadow-lg`}
                  >
                    <Icon className="h-5 w-5 text-white" />
                  </span>
                  <div>
                    <h3 className="text-lg font-semibold">{a.name}</h3>
                    <p className="text-xs text-gray-400">{a.role}</p>
                  </div>
                </div>
                <p className="mb-4 text-sm leading-relaxed text-gray-400">{a.summary}</p>
                <div className="flex flex-wrap gap-2">
                  {clientFacing ? (
                    <Badge className="rounded-full border border-cyan-400/30 bg-cyan-400/10 text-xs text-cyan-300">
                      <AudioLines className="mr-1 h-3 w-3" /> Voice-enabled
                    </Badge>
                  ) : (
                    <Badge className="rounded-full border border-white/15 bg-white/5 text-xs text-gray-300">
                      Internal engine
                    </Badge>
                  )}
                  {a.voice && (
                    <Badge className="rounded-full border border-violet-400/30 bg-violet-400/10 text-xs text-violet-300">
                      {a.voice.languages.length}+ languages
                    </Badge>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {compact && (
          <div className="mt-10 text-center">
            <Link href="/agents">
              <Button
                variant="outline"
                className="rounded-full border-white/20 bg-white/5 px-8 text-white hover:bg-white/10 hover:text-white"
              >
                Meet all nine agents →
              </Button>
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}

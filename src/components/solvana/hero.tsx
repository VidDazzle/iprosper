"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mic, ShieldCheck, PhoneCall } from "lucide-react";

const BAR_COUNT = 48;

function VoiceWave() {
  const [heights, setHeights] = useState<number[]>(() =>
    Array.from({ length: BAR_COUNT }, () => 12)
  );

  useEffect(() => {
    const id = setInterval(() => {
      setHeights(Array.from({ length: BAR_COUNT }, () => Math.random() * 44 + 6));
    }, 450);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex h-14 items-center justify-center gap-[3px]" aria-hidden>
      {heights.map((h, i) => (
        <div
          key={i}
          className="w-[3px] rounded-full bg-gradient-to-t from-cyan-400 to-violet-500 transition-all duration-500 ease-in-out"
          style={{ height: `${h}px`, opacity: 0.4 + (h / 50) * 0.6 }}
        />
      ))}
    </div>
  );
}

export default function SolvanaHero() {
  return (
    <section className="relative overflow-hidden bg-[#050810] px-6 pb-24 pt-20 text-center text-white">
      {/* backdrop glow orbs + grid */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute left-1/2 top-[-200px] h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-cyan-500/20 blur-[120px]" />
        <div className="absolute bottom-[-150px] right-[-100px] h-[400px] w-[400px] rounded-full bg-violet-600/20 blur-[100px]" />
        <div
          className="absolute inset-0 opacity-[0.15]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(148,163,184,0.25) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.25) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
            maskImage: "radial-gradient(ellipse 70% 60% at 50% 30%, black, transparent)",
          }}
        />
      </div>

      <div className="relative mx-auto max-w-5xl">
        <Badge className="mb-6 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-1.5 text-cyan-300">
          <Mic className="mr-1.5 h-3.5 w-3.5" />
          The first debt settlement company run entirely by AI
        </Badge>

        <h1 className="mb-6 text-5xl font-bold leading-tight tracking-tight md:text-7xl">
          Owe less.{" "}
          <span className="bg-gradient-to-r from-cyan-400 via-sky-400 to-violet-500 bg-clip-text text-transparent">
            AI negotiates
          </span>{" "}
          the rest away.
        </h1>

        <p className="mx-auto mb-10 max-w-3xl text-lg text-gray-300 md:text-xl">
          Solvana&apos;s specialized AI voice agents negotiate with your creditors to accept a
          smaller, one-time lump-sum payment — and forgive the rest. Credit cards, medical
          bills, and personal loans. Zero upfront fees: you pay only when a debt settles.
        </p>

        <div className="mb-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link href="/qualify">
            <Button className="h-12 rounded-full bg-gradient-to-r from-cyan-500 to-violet-600 px-8 text-lg font-medium text-white shadow-[0_0_32px_rgba(139,92,246,0.5)] hover:from-cyan-400 hover:to-violet-500">
              See if you qualify — free
            </Button>
          </Link>
          <Link href="/agents">
            <Button
              variant="outline"
              className="h-12 rounded-full border-white/20 bg-white/5 px-8 text-lg font-medium text-white backdrop-blur hover:bg-white/10 hover:text-white"
            >
              Meet the AI agents
            </Button>
          </Link>
        </div>

        {/* Live voice card */}
        <div className="mx-auto max-w-xl rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
          <div className="mb-3 flex items-center justify-center gap-2 text-sm text-gray-300">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
            </span>
            <PhoneCall className="h-4 w-4 text-cyan-300" />
            Nova is negotiating a settlement right now
          </div>
          <VoiceWave />
          <p className="mt-3 text-xs text-gray-500">
            AI voice agents work your file 24/7 — no hold music, no office hours.
          </p>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-gray-400">
          <span className="inline-flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-cyan-300" /> FDIC-insured dedicated account you control
          </span>
          <span>No upfront fees — ever</span>
          <span>FTC Telemarketing Sales Rule compliant</span>
        </div>
      </div>
    </section>
  );
}

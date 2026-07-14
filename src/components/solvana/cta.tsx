import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PhoneCall } from "lucide-react";

export default function FinalCTA() {
  return (
    <section className="relative overflow-hidden bg-[#050810] px-6 py-24 text-center text-white">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute left-1/2 top-1/2 h-[400px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-r from-cyan-500/15 to-violet-600/15 blur-[100px]" />
      </div>
      <div className="relative mx-auto max-w-3xl">
        <h2 className="mb-5 text-4xl font-bold md:text-5xl">
          Find out in 5 minutes.{" "}
          <span className="bg-gradient-to-r from-cyan-400 to-violet-500 bg-clip-text text-transparent">
            Free, no pressure.
          </span>
        </h2>
        <p className="mb-10 text-lg text-gray-300">
          Tell Aria your total debt, the types of debt you have, and whether you&apos;re
          currently paying on time. She&apos;ll tell you honestly whether debt settlement
          is right for your situation — even when the answer is no.
        </p>
        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link href="/qualify">
            <Button className="h-12 rounded-full bg-gradient-to-r from-cyan-500 to-violet-600 px-10 text-lg text-white shadow-[0_0_32px_rgba(139,92,246,0.5)] hover:from-cyan-400 hover:to-violet-500">
              Check my eligibility
            </Button>
          </Link>
          <span className="inline-flex items-center gap-2 text-gray-300">
            <PhoneCall className="h-4 w-4 text-cyan-300" /> or call 1-888-XDEBT-24 — an AI agent answers 24/7
          </span>
        </div>
      </div>
    </section>
  );
}

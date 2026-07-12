"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Menu, X, Sparkles } from "lucide-react";

const LINKS = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/agents", label: "AI Agents" },
  { href: "/pricing", label: "Fees" },
  { href: "/legal/disclosures", label: "Disclosures" },
];

export function SolvanaLogo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <span className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-violet-600 shadow-[0_0_20px_rgba(34,211,238,0.5)]">
        <Sparkles className="h-4 w-4 text-white" />
      </span>
      <span className="text-xl font-bold tracking-tight text-white">
        Solvana
        <span className="bg-gradient-to-r from-cyan-400 to-violet-500 bg-clip-text text-transparent">.ai</span>
      </span>
    </span>
  );
}

export default function SolvanaNav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-[#050810]/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link href="/" aria-label="Solvana home">
          <SolvanaLogo />
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm text-gray-300 transition-colors hover:text-cyan-300"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Link href="/signin" className="text-sm text-gray-300 transition-colors hover:text-white">
            Sign in
          </Link>
          <Link href="/qualify">
            <Button className="rounded-full bg-gradient-to-r from-cyan-500 to-violet-600 px-6 text-white shadow-[0_0_24px_rgba(139,92,246,0.45)] hover:from-cyan-400 hover:to-violet-500">
              See if you qualify
            </Button>
          </Link>
        </div>

        <button
          className="text-white md:hidden"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {open && (
        <div className="border-t border-white/10 px-6 pb-6 pt-4 md:hidden">
          <div className="flex flex-col gap-4">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="text-gray-300 hover:text-cyan-300"
                onClick={() => setOpen(false)}
              >
                {l.label}
              </Link>
            ))}
            <Link href="/signin" className="text-gray-300 hover:text-white" onClick={() => setOpen(false)}>
              Sign in
            </Link>
            <Link href="/qualify" onClick={() => setOpen(false)}>
              <Button className="w-full rounded-full bg-gradient-to-r from-cyan-500 to-violet-600 text-white">
                See if you qualify
              </Button>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

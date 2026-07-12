"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { CheckCircle2, Loader2 } from "lucide-react";
import { captureAttribution, getStoredAttribution } from "@/lib/marketing/attribution";
import { trackLead } from "@/lib/marketing/track";

const DEBT_BANDS = [
  { label: "$7,500 – $15,000", value: 11000 },
  { label: "$15,000 – $30,000", value: 22000 },
  { label: "$30,000 – $50,000", value: 40000 },
  { label: "$50,000 – $100,000", value: 75000 },
  { label: "$100,000+", value: 120000 },
  { label: "Under $7,500", value: 5000 },
];

export default function LeadForm({ compact = false }: { compact?: boolean }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [debtAmount, setDebtAmount] = useState<number | null>(null);
  const [consent, setConsent] = useState(false);
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  // First-touch attribution captured as soon as the ad landing page loads.
  useEffect(() => {
    captureAttribution();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("loading");
    setMessage("");
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          phone: phone || undefined,
          debtAmount,
          contactConsent: consent,
          attribution: getStoredAttribution(),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        trackLead({ eventId: data.eventId, value: debtAmount ? Math.round(debtAmount * 0.2) : 0 });
        setState("done");
        setMessage(data.message ?? "Thanks — we'll be in touch shortly.");
      } else {
        setState("error");
        setMessage(data.error ?? "Something went wrong. Please try again.");
      }
    } catch {
      setState("error");
      setMessage("Network error. Please try again.");
    }
  }

  if (state === "done") {
    return (
      <div className="rounded-2xl border border-cyan-400/30 bg-cyan-400/5 p-8 text-center">
        <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-cyan-300" />
        <h3 className="mb-2 text-xl font-semibold text-white">You&apos;re in the queue</h3>
        <p className="text-sm text-gray-300">{message}</p>
        <p className="mt-4 text-xs text-gray-500">
          Prefer to talk now? Call 1-888-SOLVANA — an AI agent answers 24/7.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
      {!compact && (
        <div>
          <Label htmlFor="lf-name" className="mb-1.5 block text-sm text-gray-300">Name</Label>
          <Input
            id="lf-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className="border-white/15 bg-[#03040a] text-white placeholder:text-gray-600"
          />
        </div>
      )}

      <div>
        <Label htmlFor="lf-email" className="mb-1.5 block text-sm text-gray-300">Email *</Label>
        <Input
          id="lf-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@email.com"
          className="border-white/15 bg-[#03040a] text-white placeholder:text-gray-600"
        />
      </div>

      <div>
        <Label htmlFor="lf-phone" className="mb-1.5 block text-sm text-gray-300">Phone (optional)</Label>
        <Input
          id="lf-phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="(555) 555-5555"
          className="border-white/15 bg-[#03040a] text-white placeholder:text-gray-600"
        />
      </div>

      <div>
        <Label className="mb-1.5 block text-sm text-gray-300">Estimated unsecured debt</Label>
        <div className="grid grid-cols-2 gap-2">
          {DEBT_BANDS.map((b) => (
            <button
              key={b.value}
              type="button"
              onClick={() => setDebtAmount(b.value)}
              className={`rounded-lg border px-3 py-2 text-xs transition-colors ${
                debtAmount === b.value
                  ? "border-cyan-400/60 bg-cyan-400/10 text-cyan-200"
                  : "border-white/10 bg-[#03040a] text-gray-400 hover:border-white/25"
              }`}
            >
              {b.label}
            </button>
          ))}
        </div>
      </div>

      <label className="flex items-start gap-3 text-xs leading-relaxed text-gray-400">
        <Checkbox
          checked={consent}
          onCheckedChange={(v) => setConsent(Boolean(v))}
          className="mt-0.5"
          required={Boolean(phone)}
        />
        <span>
          I agree to be contacted by Solvana&apos;s AI agents (including by phone, call, and
          text) at the number I provided about the debt relief program, using automated
          technology. Consent isn&apos;t a condition of any purchase; message/data rates may
          apply; reply STOP to opt out. I&apos;ve read the{" "}
          <Link href="/legal/disclosures" className="text-cyan-300 underline">disclosures</Link> and{" "}
          <Link href="/legal/privacy" className="text-cyan-300 underline">privacy policy</Link>.
        </span>
      </label>

      {state === "error" && <p className="text-sm text-rose-400">{message}</p>}

      <Button
        type="submit"
        disabled={state === "loading"}
        className="h-11 w-full rounded-full bg-gradient-to-r from-cyan-500 to-violet-600 text-white shadow-[0_0_24px_rgba(139,92,246,0.4)] hover:from-cyan-400 hover:to-violet-500 disabled:opacity-50"
      >
        {state === "loading" ? (
          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting…</>
        ) : (
          "See if I qualify — free"
        )}
      </Button>
      <p className="text-center text-[11px] text-gray-600">
        No upfront fees. Checking eligibility won&apos;t affect your credit score.
      </p>
    </form>
  );
}

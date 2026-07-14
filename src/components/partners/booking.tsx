"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CalendarClock, Loader2, CheckCircle2, Download } from "lucide-react";

interface Slot { startUtc: string; endUtc: string; label: string }
const inputCls = "border-white/15 bg-[#03040a] text-white placeholder:text-slate-600";

export default function Booking({ partnerId, firmName }: { partnerId: number; firmName: string }) {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [tz, setTz] = useState("");
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState(true);
  const [picked, setPicked] = useState<Slot | null>(null);
  const [form, setForm] = useState({ clientName: "", clientEmail: "", clientPhone: "", topic: "" });
  const [state, setState] = useState<"idle" | "booking" | "done" | "error">("idle");
  const [result, setResult] = useState<{ message: string; icsBase64?: string } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/partners/availability?partnerId=${partnerId}`)
      .then((r) => r.json())
      .then((d) => { setSlots(d.slots ?? []); setTz(d.timezone ?? ""); setEnabled(d.calendarEnabled !== false); })
      .catch(() => setEnabled(false))
      .finally(() => setLoading(false));
  }, [partnerId]);

  // Group slots by calendar day.
  const byDay = useMemo(() => {
    const groups: Record<string, Slot[]> = {};
    for (const s of slots) {
      const day = s.label.split(",").slice(0, 2).join(",");
      (groups[day] ??= []).push(s);
    }
    return Object.entries(groups);
  }, [slots]);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function book() {
    if (!picked) return;
    setState("booking"); setError("");
    try {
      const res = await fetch("/api/partners/book", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partnerId, startUtc: picked.startUtc, ...form }),
      });
      const data = await res.json();
      if (res.ok) { setState("done"); setResult(data); }
      else { setState("error"); setError(data.error ?? "Could not book."); }
    } catch { setState("error"); setError("Network error."); }
  }

  if (loading) return <div className="flex items-center gap-2 text-slate-400"><Loader2 className="h-4 w-4 animate-spin" /> Loading available times…</div>;

  if (!enabled) return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6 text-sm text-slate-400">
      This attorney isn&rsquo;t taking online bookings yet. Use the call or contact options on their listing.
    </div>
  );

  if (state === "done" && result) {
    return (
      <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/5 p-8 text-center">
        <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-emerald-300" />
        <h3 className="mb-2 text-xl font-semibold text-white">You&rsquo;re booked</h3>
        <p className="mx-auto mb-4 max-w-md text-sm text-slate-300">{result.message}</p>
        {result.icsBase64 && (
          <a href={`data:text/calendar;base64,${result.icsBase64}`} download="consultation.ics"
            className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm text-white hover:bg-white/5">
            <Download className="h-4 w-4" /> Add to my calendar
          </a>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold text-white"><CalendarClock className="h-5 w-5 text-cyan-300" /> Pick a time</h2>
        {tz && <p className="text-sm text-slate-400">Times shown in {tz.replace("_", " ")}. Only open slots are shown.</p>}
      </div>

      {byDay.length === 0 ? (
        <p className="rounded-xl border border-white/10 bg-white/[0.02] p-6 text-sm text-slate-400">No open times in the booking window right now. Please check back or contact the firm directly.</p>
      ) : (
        <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          {byDay.map(([day, daySlots]) => (
            <div key={day}>
              <p className="mb-2 text-sm font-semibold text-slate-300">{day}</p>
              <div className="flex flex-wrap gap-2">
                {daySlots.map((s) => {
                  const time = s.label.split(",").slice(2).join(",").trim();
                  const active = picked?.startUtc === s.startUtc;
                  return (
                    <button key={s.startUtc} onClick={() => setPicked(s)}
                      className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${active ? "border-cyan-400/60 bg-cyan-400/10 text-cyan-200" : "border-white/12 text-slate-300 hover:border-white/30"}`}>
                      {time}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {picked && (
        <div className="space-y-4 rounded-2xl border border-cyan-400/25 bg-cyan-400/[0.04] p-5">
          <p className="text-sm text-slate-300">Booking <span className="font-semibold text-white">{firmName}</span> · <span className="text-cyan-300">{picked.label}</span></p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><Label className="mb-1 block text-sm text-slate-300">Your name *</Label><Input required value={form.clientName} onChange={set("clientName")} className={inputCls} /></div>
            <div><Label className="mb-1 block text-sm text-slate-300">Email *</Label><Input type="email" required value={form.clientEmail} onChange={set("clientEmail")} className={inputCls} /></div>
            <div><Label className="mb-1 block text-sm text-slate-300">Phone</Label><Input type="tel" value={form.clientPhone} onChange={set("clientPhone")} className={inputCls} /></div>
            <div><Label className="mb-1 block text-sm text-slate-300">What&rsquo;s it about?</Label><Input value={form.topic} onChange={set("topic")} placeholder="e.g. credit card lawsuit" className={inputCls} /></div>
          </div>
          {state === "error" && <p className="text-sm text-rose-400">{error}</p>}
          <Button onClick={book} disabled={state === "booking" || !form.clientName || !form.clientEmail}
            className="h-11 rounded-full bg-gradient-to-r from-cyan-500 to-violet-600 px-8 text-white hover:from-cyan-400 hover:to-violet-500 disabled:opacity-50">
            {state === "booking" ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Booking…</> : "Confirm appointment"}
          </Button>
        </div>
      )}

      <p className="text-xs leading-relaxed text-slate-600">
        Booking connects you with a paid advertiser for a free consultation. X Debt is not a law firm and does not endorse any attorney. Your calendar details are never shared; the attorney only sees the appointment you book.
      </p>
    </div>
  );
}

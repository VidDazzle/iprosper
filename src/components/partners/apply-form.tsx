"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { Loader2, CheckCircle2, Sparkles, Upload, ShieldCheck } from "lucide-react";
import { PRACTICE_AREAS, TIERS, type Tier } from "@/lib/partners/pricing";
import { ADVERTISER_ACKS, ADVERTISER_AGREEMENT_VERSION } from "@/lib/partners/advertiser-agreement";

const inputCls = "border-white/15 bg-[#03040a] text-white placeholder:text-slate-600";

export default function AttorneyApplyForm() {
  const photoRef = useRef<HTMLInputElement>(null);
  const cardRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    firmName: "", attorneyName: "", email: "", phone: "", website: "",
    barNumber: "", stateCode: "", bio: "", password: "", photoType: "self" as "self" | "firm",
  });
  const [areas, setAreas] = useState<string[]>([]);
  const [tier, setTier] = useState<Tier>("featured");
  const [generateCard, setGenerateCard] = useState(true);
  const [cal, setCal] = useState({
    enabled: false, provider: "ics" as "ics" | "google" | "manual", busyIcsUrl: "",
    timezone: "America/Chicago", startHour: 9, endHour: 17, slotMinutes: 30,
    days: [1, 2, 3, 4, 5] as number[],
  });
  const [preview, setPreview] = useState<string | null>(null);
  const [acks, setAcks] = useState<Record<string, boolean>>({});
  const [honeypot, setHoneypot] = useState(""); // bot trap — hidden from real users
  const [state, setState] = useState<"idle" | "saving" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  const allAcksChecked = ADVERTISER_ACKS.every((a) => acks[a.id]);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));
  const toggleArea = (a: string) => setAreas((c) => (c.includes(a) ? c.filter((x) => x !== a) : [...c, a]));

  async function previewCard() {
    const res = await fetch("/api/partners/card", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, practiceAreas: areas }),
    });
    const data = await res.json();
    if (data.dataUrl) setPreview(data.dataUrl);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!allAcksChecked) { setState("error"); setMessage("Please agree to the background check and advertiser terms to apply."); return; }
    setState("saving"); setMessage("");
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      areas.forEach((a) => fd.append("practiceAreas", a));
      ADVERTISER_ACKS.forEach((a) => { if (acks[a.id]) fd.append("agreementAcks", a.id); });
      fd.append("companyUrl", honeypot); // honeypot — empty for real users
      fd.append("agreementVersion", ADVERTISER_AGREEMENT_VERSION);
      fd.append("tier", tier);
      fd.append("generateCard", String(generateCard));
      fd.append("calendarEnabled", String(cal.enabled));
      if (cal.enabled) {
        fd.append("calendarProvider", cal.provider);
        fd.append("busyIcsUrl", cal.busyIcsUrl);
        fd.append("availability", JSON.stringify({
          days: cal.days, startHour: cal.startHour, endHour: cal.endHour,
          slotMinutes: cal.slotMinutes, timezone: cal.timezone, horizonDays: 14, bufferMinutes: 15,
        }));
      }
      if (photoRef.current?.files?.[0]) fd.append("photo", photoRef.current.files[0]);
      if (cardRef.current?.files?.[0]) fd.append("businessCard", cardRef.current.files[0]);
      const res = await fetch("/api/partners/apply", { method: "POST", body: fd });
      const data = await res.json();
      if (res.ok) { setState("done"); setMessage(data.message); }
      else { setState("error"); setMessage(data.error ?? "Something went wrong."); }
    } catch {
      setState("error"); setMessage("Network error. Please try again.");
    }
  }

  if (state === "done") {
    return (
      <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/5 p-8 text-center">
        <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-emerald-300" />
        <h3 className="mb-2 text-xl font-semibold text-white">Application received</h3>
        <p className="mx-auto max-w-lg text-sm text-slate-300">{message}</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      {/* Honeypot: visually hidden; bots that autofill it are silently rejected. */}
      <input type="text" name="companyUrl" value={honeypot} onChange={(e) => setHoneypot(e.target.value)}
        tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Firm name" required><Input required value={form.firmName} onChange={set("firmName")} className={inputCls} /></Field>
        <Field label="Attorney name" required><Input required value={form.attorneyName} onChange={set("attorneyName")} className={inputCls} /></Field>
        <Field label="Email" required><Input type="email" required value={form.email} onChange={set("email")} className={inputCls} /></Field>
        <Field label="Phone"><Input type="tel" value={form.phone} onChange={set("phone")} className={inputCls} placeholder="(555) 555-5555" /></Field>
        <Field label="Website"><Input value={form.website} onChange={set("website")} className={inputCls} placeholder="yourfirm.com" /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="State bar #"><Input value={form.barNumber} onChange={set("barNumber")} className={inputCls} /></Field>
          <Field label="State"><Input value={form.stateCode} onChange={set("stateCode")} className={inputCls} placeholder="CA" maxLength={2} /></Field>
        </div>
      </div>

      <Field label="Short bio">
        <textarea value={form.bio} onChange={set("bio")} rows={3} maxLength={400}
          className={`w-full rounded-md border px-3 py-2 text-sm ${inputCls}`} placeholder="Tell clients about your practice and how you help with debt or bankruptcy." />
      </Field>

      <Field label="Dashboard password">
        <Input type="password" value={form.password} onChange={set("password")} className={inputCls} placeholder="At least 8 characters — to manage your listing, leads & calendar" />
      </Field>

      <div>
        <Label className="mb-2 block text-sm text-slate-300">Practice areas you want to advertise in</Label>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {PRACTICE_AREAS.map((a) => (
            <label key={a} className="flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 bg-[#03040a] px-3 py-2 text-sm text-slate-300 has-[:checked]:border-cyan-400/50 has-[:checked]:bg-cyan-400/5">
              <input type="checkbox" checked={areas.includes(a)} onChange={() => toggleArea(a)} className="accent-cyan-400" />
              {a}
            </label>
          ))}
        </div>
      </div>

      <div>
        <Label className="mb-2 block text-sm text-slate-300">Advertising plan</Label>
        <div className="grid gap-3 sm:grid-cols-3">
          {TIERS.map((t) => (
            <button type="button" key={t.id} onClick={() => setTier(t.id)}
              className={`rounded-xl border p-4 text-left transition-colors ${tier === t.id ? "border-cyan-400/50 bg-cyan-400/5" : "border-white/10 hover:border-white/25"}`}>
              <p className="font-semibold text-white">{t.name}</p>
              <p className="text-sm text-cyan-300">${t.monthly}/mo</p>
              <p className="mt-1 text-xs text-slate-500">+ ${t.perLeadFee}/verified lead</p>
            </button>
          ))}
        </div>
      </div>

      {/* Media */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-[#03040a] p-4">
          <Label className="mb-2 block text-sm text-slate-300">Photo (you or your firm)</Label>
          <div className="mb-2 flex gap-3 text-xs text-slate-400">
            <label className="flex items-center gap-1"><input type="radio" checked={form.photoType === "self"} onChange={() => setForm((f) => ({ ...f, photoType: "self" }))} className="accent-cyan-400" /> Headshot</label>
            <label className="flex items-center gap-1"><input type="radio" checked={form.photoType === "firm"} onChange={() => setForm((f) => ({ ...f, photoType: "firm" }))} className="accent-cyan-400" /> Firm logo</label>
          </div>
          <input ref={photoRef} type="file" accept="image/*" className="block w-full text-xs text-slate-400 file:mr-3 file:rounded-md file:border-0 file:bg-white/10 file:px-3 file:py-1.5 file:text-white" />
        </div>
        <div className="rounded-xl border border-white/10 bg-[#03040a] p-4">
          <Label className="mb-2 block text-sm text-slate-300">Business card</Label>
          <input ref={cardRef} type="file" accept="image/*,.pdf" className="mb-2 block w-full text-xs text-slate-400 file:mr-3 file:rounded-md file:border-0 file:bg-white/10 file:px-3 file:py-1.5 file:text-white" />
          <label className="flex items-center gap-2 text-xs text-slate-400">
            <input type="checkbox" checked={generateCard} onChange={(e) => setGenerateCard(e.target.checked)} className="accent-cyan-400" />
            No card? Let Beacon design one for me
          </label>
          <button type="button" onClick={previewCard} className="mt-2 inline-flex items-center gap-1.5 text-xs text-cyan-300 hover:text-cyan-200">
            <Sparkles className="h-3.5 w-3.5" /> Preview my AI card
          </button>
        </div>
      </div>

      {/* Calendar add-on (Chronos) */}
      <div className="rounded-xl border border-white/10 bg-[#03040a] p-5">
        <label className="flex items-start gap-3">
          <input type="checkbox" checked={cal.enabled} onChange={(e) => setCal((c) => ({ ...c, enabled: e.target.checked }))} className="mt-1 accent-cyan-400" />
          <span>
            <span className="font-medium text-white">Add the booking calendar</span>
            <span className="ml-2 rounded-full border border-teal-400/30 bg-teal-400/10 px-2 py-0.5 text-[10px] font-medium text-teal-300">+$79/mo · $40/appointment</span>
            <span className="mt-1 block text-sm text-slate-400">Let clients book consultations on your open time. Chronos syncs your calendar&rsquo;s free/busy so only your available slots show — your calendar details stay private.</span>
          </span>
        </label>

        {cal.enabled && (
          <div className="mt-4 space-y-4 border-t border-white/10 pt-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm text-slate-300">Calendar sync
                <select value={cal.provider} onChange={(e) => setCal((c) => ({ ...c, provider: e.target.value as typeof c.provider }))} className="mt-1 h-9 w-full rounded-md border border-white/15 bg-[#050810] px-2 text-sm text-white">
                  <option value="ics">Google / Outlook / Apple (private iCal link)</option>
                  <option value="google">Google (connect at activation)</option>
                  <option value="manual">Manual availability only</option>
                </select>
              </label>
              <label className="text-sm text-slate-300">Timezone
                <Input value={cal.timezone} onChange={(e) => setCal((c) => ({ ...c, timezone: e.target.value }))} className={`${inputCls} mt-1`} placeholder="America/Chicago" />
              </label>
            </div>
            {cal.provider === "ics" && (
              <label className="block text-sm text-slate-300">Your calendar&rsquo;s private iCal (ICS) URL
                <Input value={cal.busyIcsUrl} onChange={(e) => setCal((c) => ({ ...c, busyIcsUrl: e.target.value }))} className={`${inputCls} mt-1`} placeholder="https://calendar.google.com/…/basic.ics" />
                <span className="mt-1 block text-xs text-slate-500">In Google Calendar → Settings → your calendar → &ldquo;Secret address in iCal format.&rdquo; We only read busy times, never event details.</span>
              </label>
            )}
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="text-sm text-slate-300">Start hour
                <Input type="number" min={0} max={23} value={cal.startHour} onChange={(e) => setCal((c) => ({ ...c, startHour: Number(e.target.value) }))} className={`${inputCls} mt-1`} />
              </label>
              <label className="text-sm text-slate-300">End hour
                <Input type="number" min={1} max={24} value={cal.endHour} onChange={(e) => setCal((c) => ({ ...c, endHour: Number(e.target.value) }))} className={`${inputCls} mt-1`} />
              </label>
              <label className="text-sm text-slate-300">Slot length (min)
                <select value={cal.slotMinutes} onChange={(e) => setCal((c) => ({ ...c, slotMinutes: Number(e.target.value) }))} className="mt-1 h-9 w-full rounded-md border border-white/15 bg-[#050810] px-2 text-sm text-white">
                  {[15, 30, 45, 60].map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </label>
            </div>
            <div>
              <span className="mb-1.5 block text-sm text-slate-300">Days you take appointments</span>
              <div className="flex flex-wrap gap-1.5">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d, i) => (
                  <button type="button" key={d} onClick={() => setCal((c) => ({ ...c, days: c.days.includes(i) ? c.days.filter((x) => x !== i) : [...c.days, i] }))}
                    className={`rounded-md border px-3 py-1.5 text-xs ${cal.days.includes(i) ? "border-cyan-400/50 bg-cyan-400/10 text-cyan-200" : "border-white/12 text-slate-400"}`}>
                    {d}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {preview && (
        <div className="rounded-xl border border-white/10 bg-[#03040a] p-4">
          <p className="mb-2 text-xs uppercase tracking-wide text-slate-500">Business card preview</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Business card preview" className="w-full max-w-md rounded-lg border border-white/10" />
        </div>
      )}

      {/* Advertiser agreement: background check + VidDazzle sole discretion */}
      <div className="rounded-xl border border-amber-400/25 bg-amber-400/[0.05] p-5">
        <h3 className="mb-1 flex items-center gap-2 font-semibold text-white"><ShieldCheck className="h-4 w-4 text-amber-300" /> Background check &amp; advertiser agreement</h3>
        <p className="mb-4 text-sm text-slate-400">
          Before any attorney or company can advertise on a VidDazzle LLC site, you must agree to a professional business
          background check. VidDazzle LLC approves, denies, and removes advertising at its sole discretion. Read the full{" "}
          <Link href="/legal/advertiser-agreement" target="_blank" className="text-cyan-300 hover:text-cyan-200">Advertiser Agreement</Link>.
        </p>
        <div className="space-y-2.5">
          {ADVERTISER_ACKS.map((a) => (
            <label key={a.id} className="flex cursor-pointer items-start gap-3 rounded-lg border border-white/10 bg-[#03040a] p-3 text-sm text-slate-300 hover:border-amber-400/30">
              <input type="checkbox" checked={!!acks[a.id]} onChange={(e) => setAcks((c) => ({ ...c, [a.id]: e.target.checked }))}
                className="mt-0.5 h-4 w-4 flex-shrink-0 accent-amber-500" />
              <span>{a.label}</span>
            </label>
          ))}
        </div>
      </div>

      {state === "error" && <p className="text-sm text-rose-400">{message}</p>}

      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" disabled={state === "saving" || !allAcksChecked} className="h-11 rounded-full bg-gradient-to-r from-cyan-500 to-violet-600 px-8 text-white hover:from-cyan-400 hover:to-violet-500 disabled:opacity-40">
          {state === "saving" ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting…</> : <><Upload className="mr-2 h-4 w-4" /> Apply to advertise</>}
        </Button>
        <p className="text-xs text-slate-500">{allAcksChecked ? "Beacon verifies your bar number and VidDazzle completes a background check before any listing goes live." : "Agree to the background check and terms above to continue."}</p>
      </div>
    </form>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm text-slate-300">{label}{required && <span className="text-rose-400"> *</span>}</span>
      {children}
    </label>
  );
}

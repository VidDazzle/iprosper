"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle2, Sparkles, Upload } from "lucide-react";
import { PRACTICE_AREAS, TIERS, type Tier } from "@/lib/partners/pricing";

const inputCls = "border-white/15 bg-[#03040a] text-white placeholder:text-slate-600";

export default function AttorneyApplyForm() {
  const photoRef = useRef<HTMLInputElement>(null);
  const cardRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    firmName: "", attorneyName: "", email: "", phone: "", website: "",
    barNumber: "", stateCode: "", bio: "", photoType: "self" as "self" | "firm",
  });
  const [areas, setAreas] = useState<string[]>([]);
  const [tier, setTier] = useState<Tier>("featured");
  const [generateCard, setGenerateCard] = useState(true);
  const [preview, setPreview] = useState<string | null>(null);
  const [state, setState] = useState<"idle" | "saving" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

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
    setState("saving"); setMessage("");
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      areas.forEach((a) => fd.append("practiceAreas", a));
      fd.append("tier", tier);
      fd.append("generateCard", String(generateCard));
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

      {preview && (
        <div className="rounded-xl border border-white/10 bg-[#03040a] p-4">
          <p className="mb-2 text-xs uppercase tracking-wide text-slate-500">Business card preview</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Business card preview" className="w-full max-w-md rounded-lg border border-white/10" />
        </div>
      )}

      {state === "error" && <p className="text-sm text-rose-400">{message}</p>}

      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" disabled={state === "saving"} className="h-11 rounded-full bg-gradient-to-r from-cyan-500 to-violet-600 px-8 text-white hover:from-cyan-400 hover:to-violet-500">
          {state === "saving" ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting…</> : <><Upload className="mr-2 h-4 w-4" /> Apply to advertise</>}
        </Button>
        <p className="text-xs text-slate-500">Beacon verifies your bar number before any listing goes live.</p>
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

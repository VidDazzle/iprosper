"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PRACTICE_AREAS } from "@/lib/partners/pricing";
import { Loader2, CheckCircle2 } from "lucide-react";

interface Props {
  initial: {
    bio: string; phone: string; website: string; practiceAreas: string[];
    calendarEnabled: boolean; busyIcsUrl: string;
    availability: { days: number[]; startHour: number; endHour: number; slotMinutes: number; timezone: string };
  };
}

const inputCls = "border-white/15 bg-[#03040a] text-white placeholder:text-slate-600";
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function AttorneyEditForm({ initial }: Props) {
  const router = useRouter();
  const [bio, setBio] = useState(initial.bio);
  const [phone, setPhone] = useState(initial.phone);
  const [website, setWebsite] = useState(initial.website);
  const [areas, setAreas] = useState<string[]>(initial.practiceAreas);
  const [calOn, setCalOn] = useState(initial.calendarEnabled);
  const [ics, setIcs] = useState(initial.busyIcsUrl);
  const [av, setAv] = useState(initial.availability);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState("");

  const toggleArea = (a: string) => setAreas((c) => (c.includes(a) ? c.filter((x) => x !== a) : [...c, a]));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setState("saving"); setError("");
    try {
      const res = await fetch("/api/partners/update", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bio, phone, website, practiceAreas: areas, calendarEnabled: calOn, busyIcsUrl: ics, availability: av }),
      });
      const data = await res.json();
      if (res.ok) { setState("saved"); router.refresh(); }
      else { setError(data.error ?? "Could not save."); setState("error"); }
    } catch { setError("Network error."); setState("error"); }
  }

  return (
    <form onSubmit={save} className="space-y-5">
      <div>
        <Label className="mb-1.5 block text-sm text-slate-300">Bio</Label>
        <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} maxLength={500}
          className={`w-full rounded-md border px-3 py-2 text-sm ${inputCls}`} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div><Label className="mb-1.5 block text-sm text-slate-300">Phone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} /></div>
        <div><Label className="mb-1.5 block text-sm text-slate-300">Website</Label><Input value={website} onChange={(e) => setWebsite(e.target.value)} className={inputCls} /></div>
      </div>

      <div>
        <Label className="mb-2 block text-sm text-slate-300">Practice areas</Label>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {PRACTICE_AREAS.map((a) => (
            <label key={a} className="flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 bg-[#03040a] px-3 py-2 text-sm text-slate-300 has-[:checked]:border-cyan-400/50 has-[:checked]:bg-cyan-400/5">
              <input type="checkbox" checked={areas.includes(a)} onChange={() => toggleArea(a)} className="accent-cyan-400" /> {a}
            </label>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-[#03040a] p-4">
        <label className="flex items-center gap-2 text-sm text-slate-200">
          <input type="checkbox" checked={calOn} onChange={(e) => setCalOn(e.target.checked)} className="accent-cyan-400" /> Booking calendar enabled
        </label>
        {calOn && (
          <div className="mt-3 space-y-3 border-t border-white/10 pt-3">
            <label className="block text-sm text-slate-300">Private iCal (ICS) URL for free/busy
              <Input value={ics} onChange={(e) => setIcs(e.target.value)} className={`${inputCls} mt-1`} placeholder="https://…/basic.ics" />
            </label>
            <div className="grid gap-3 sm:grid-cols-4">
              <label className="text-sm text-slate-300">TZ<Input value={av.timezone} onChange={(e) => setAv({ ...av, timezone: e.target.value })} className={`${inputCls} mt-1`} /></label>
              <label className="text-sm text-slate-300">Start<Input type="number" value={av.startHour} onChange={(e) => setAv({ ...av, startHour: Number(e.target.value) })} className={`${inputCls} mt-1`} /></label>
              <label className="text-sm text-slate-300">End<Input type="number" value={av.endHour} onChange={(e) => setAv({ ...av, endHour: Number(e.target.value) })} className={`${inputCls} mt-1`} /></label>
              <label className="text-sm text-slate-300">Slot min<Input type="number" value={av.slotMinutes} onChange={(e) => setAv({ ...av, slotMinutes: Number(e.target.value) })} className={`${inputCls} mt-1`} /></label>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {DAYS.map((d, i) => (
                <button type="button" key={d} onClick={() => setAv({ ...av, days: av.days.includes(i) ? av.days.filter((x) => x !== i) : [...av.days, i] })}
                  className={`rounded-md border px-3 py-1.5 text-xs ${av.days.includes(i) ? "border-cyan-400/50 bg-cyan-400/10 text-cyan-200" : "border-white/12 text-slate-400"}`}>{d}</button>
              ))}
            </div>
          </div>
        )}
      </div>

      {error && <p className="text-sm text-rose-400">{error}</p>}
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={state === "saving"} className="h-11 rounded-full bg-gradient-to-r from-cyan-500 to-violet-600 px-8 text-white">
          {state === "saving" ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…</> : "Save changes"}
        </Button>
        {state === "saved" && <span className="inline-flex items-center gap-1.5 text-sm text-emerald-300"><CheckCircle2 className="h-4 w-4" /> Saved</span>}
      </div>
    </form>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Bell, BellRing, Loader2 } from "lucide-react";
import { enablePush, pushSupported } from "@/lib/notify/client";

/** Lets a signed-in user turn on push notifications. `subject` scopes the
 *  subscription (attorney dashboards pass "attorney:<id>"); clients omit it. */
export default function EnablePush({ subject, label }: { subject?: string; label?: string } = {}) {
  const [supported, setSupported] = useState(false);
  const [state, setState] = useState<"idle" | "working" | "on" | "denied" | "unavailable">("idle");

  useEffect(() => {
    pushSupported().then((s) => {
      setSupported(s);
      if (s && typeof Notification !== "undefined" && Notification.permission === "granted") setState("on");
    });
  }, []);

  if (!supported) return null;

  async function turnOn() {
    setState("working");
    const r = await enablePush(subject);
    setState(r.ok ? "on" : r.reason === "denied" ? "denied" : "unavailable");
  }

  const onLabel = subject?.startsWith("attorney")
    ? "Push is on — we’ll ping you the instant a client connects or books."
    : "Push notifications are on — we’ll ping you the moment an action needs your approval.";

  if (state === "on") {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/5 px-4 py-3 text-sm text-emerald-200">
        <BellRing className="h-4 w-4" /> {onLabel}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
      <div className="flex items-center gap-2 text-sm text-slate-300">
        <Bell className="h-4 w-4 text-cyan-300" />
        {label ?? "Get pinged instantly when a settlement needs your approval."}
      </div>
      <button onClick={turnOn} disabled={state === "working"}
        className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-500 to-violet-600 px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50">
        {state === "working" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enable notifications"}
      </button>
      {(state === "denied" || state === "unavailable") && (
        <p className="w-full text-xs text-amber-300">{state === "denied" ? "Notifications are blocked in your browser settings." : "Push isn't available right now."}</p>
      )}
    </div>
  );
}

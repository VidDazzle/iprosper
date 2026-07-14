"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

/* eslint-disable @typescript-eslint/no-explicit-any */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * Registers the service worker and shows a tasteful "Install app" prompt when
 * the browser signals installability. Dismissal is remembered so we don't nag.
 */
export default function PwaRegister() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    const dismissed = localStorage.getItem("solvana_install_dismissed");
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      if (!dismissed) setShow(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", () => setShow(false));
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setShow(false);
    setDeferred(null);
  }

  function dismiss() {
    setShow(false);
    localStorage.setItem("solvana_install_dismissed", "1");
  }

  if (!show) return null;

  return (
    <div
      role="dialog"
      aria-label="Install the Solvana app"
      style={{
        position: "fixed",
        left: "50%",
        bottom: "20px",
        transform: "translateX(-50%)",
        zIndex: 60,
        width: "min(420px, calc(100vw - 32px))",
      }}
      className="flex items-center gap-3 rounded-2xl border border-white/12 bg-[#0b1220]/95 p-3 pl-4 shadow-[0_10px_40px_rgba(0,0,0,.5)] backdrop-blur-xl"
    >
      <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-violet-600 shadow-[0_0_20px_rgba(34,211,238,.4)]">
        <Download className="h-5 w-5 text-white" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-white">Install the Solvana app</p>
        <p className="text-xs text-slate-400">Track your program and approve settlements from your home screen.</p>
      </div>
      <button
        onClick={install}
        className="flex-shrink-0 rounded-full bg-gradient-to-r from-cyan-500 to-violet-600 px-4 py-2 text-sm font-medium text-white"
      >
        Install
      </button>
      <button onClick={dismiss} aria-label="Dismiss" className="flex-shrink-0 text-slate-500 hover:text-white">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

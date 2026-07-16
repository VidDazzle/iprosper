"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

/**
 * Registers the service worker and surfaces a lightweight "Install app" button
 * when the browser offers the PWA install prompt (Chrome/Edge/Android). On iOS,
 * users install via Share → Add to Home Screen (no programmatic prompt exists).
 */
export default function PwaRegister() {
  const [deferred, setDeferred] = useState<any>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e);
    };
    const onInstalled = () => setDeferred(null);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!deferred || dismissed) return null;

  return (
    <div className="fixed bottom-4 left-1/2 z-[200] flex -translate-x-1/2 items-center gap-3 rounded-full border border-white/15 bg-[#161616] px-4 py-2 shadow-xl">
      <span className="text-sm text-white">Install Evolve as an app</span>
      <button
        onClick={async () => {
          deferred.prompt();
          try {
            await deferred.userChoice;
          } finally {
            setDeferred(null);
          }
        }}
        className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-black hover:bg-gray-200"
      >
        <Download className="h-4 w-4" /> Install
      </button>
      <button onClick={() => setDismissed(true)} className="text-gray-400 hover:text-white">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

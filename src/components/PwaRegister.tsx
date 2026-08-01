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
    const cleanups: (() => void)[] = [];

    if ("serviceWorker" in navigator) {
      // Auto-update: detect new deploys and apply them to every open client so
      // users never have to reinstall or manually refresh.
      const hadController = !!navigator.serviceWorker.controller;
      let refreshing = false;

      // Reload without clobbering in-progress input: if the user is typing,
      // wait until they blur the field or leave the tab, then reload.
      const reloadWhenSafe = () => {
        const el = document.activeElement as HTMLElement | null;
        const editing = !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
        if (!editing) { window.location.reload(); return; }
        const go = () => window.location.reload();
        el.addEventListener("blur", go, { once: true });
        window.addEventListener("pagehide", go, { once: true });
        document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") go(); }, { once: true });
      };

      const onControllerChange = () => {
        // Never reload on the very first install (no prior controller) — only
        // when a running version has been replaced by a newer one.
        if (refreshing || !hadController) return;
        refreshing = true;
        reloadWhenSafe();
      };
      navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
      cleanups.push(() => navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange));

      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          const applyIfWaiting = () => { if (reg.waiting) reg.waiting.postMessage({ type: "SKIP_WAITING" }); };
          applyIfWaiting(); // a newer worker may already be waiting from a prior visit

          reg.addEventListener("updatefound", () => {
            const installing = reg.installing;
            if (!installing) return;
            installing.addEventListener("statechange", () => {
              // A new worker finished installing while an old one still controls
              // the page → activate it (which triggers controllerchange → reload).
              if (installing.state === "installed" && navigator.serviceWorker.controller) applyIfWaiting();
            });
          });

          // Poll for a new deploy hourly and whenever the app regains focus, so
          // updates land promptly instead of on the browser's ~24h schedule.
          const check = () => { reg.update().catch(() => {}); };
          const interval = window.setInterval(check, 60 * 60 * 1000);
          const onVisible = () => { if (document.visibilityState === "visible") check(); };
          document.addEventListener("visibilitychange", onVisible);
          cleanups.push(() => { window.clearInterval(interval); document.removeEventListener("visibilitychange", onVisible); });
        })
        .catch(() => {});
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
      cleanups.forEach((fn) => fn());
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

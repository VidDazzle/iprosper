"use client";

import { useEffect, useState } from "react";
import type { BrandKit } from "@apex/contracts";
import { getTemplateComponent, brandKitToThemeVars, themeVarsToStyle, type TemplateKey } from "@apex/renderer";

const CONSENT_TEXT =
  "I agree to be contacted by APEX / the business shown in this preview via SMS, email, or phone about this rebrand preview.";

interface PreviewData {
  brandKit: BrandKit;
  templateKey: TemplateKey;
  voiceAgentId: string | null;
  unlocked: boolean;
}

export function PreviewClient({ jobId, exp, sig }: { jobId: string; exp?: string; sig?: string }) {
  const [data, setData] = useState<PreviewData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [unlocked, setUnlocked] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [consented, setConsented] = useState(false); // never pre-checked — spec Section 4
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!exp || !sig) {
      setLoadError("This preview link is missing its signature.");
      return;
    }
    fetch(`/api/preview/${jobId}?exp=${exp}&sig=${sig}`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Failed to load preview.");
        setData(json);
        setUnlocked(json.unlocked);
      })
      .catch((err) => setLoadError(err.message));
  }, [jobId, exp, sig]);

  async function handleUnlock(e: React.FormEvent) {
    e.preventDefault();
    if (!consented) return;
    setSubmitting(true);
    setSubmitError(null);

    const res = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId, name, email, phone: phone || undefined, consentText: CONSENT_TEXT }),
    });
    const json = await res.json();

    if (!res.ok) {
      setSubmitError(json.error ?? "Something went wrong.");
      setSubmitting(false);
      return;
    }

    setUnlocked(true);
    setSubmitting(false);
  }

  if (loadError) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        <p className="text-white/60">{loadError}</p>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        <p className="text-white/60">Loading preview…</p>
      </main>
    );
  }

  const Template = getTemplateComponent(data.templateKey);
  const themeStyle = themeVarsToStyle(brandKitToThemeVars(data.brandKit));

  return (
    <div style={themeStyle}>
      <div className={unlocked ? "" : "pointer-events-none blur-md select-none"}>
        <Template brandKit={data.brandKit} />
      </div>

      {!unlocked && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-6">
          <form
            onSubmit={handleUnlock}
            className="w-full max-w-sm rounded-xl bg-white p-6 text-black shadow-2xl"
          >
            <h2 className="text-lg font-semibold">Unlock your full preview</h2>
            <p className="mt-1 text-sm text-gray-500">
              Enter your details to see the full rebrand preview and hear your AI receptionist demo.
            </p>

            <input
              required
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-4 w-full rounded border px-3 py-2 text-sm"
            />
            <input
              required
              type="email"
              placeholder="you@business.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-2 w-full rounded border px-3 py-2 text-sm"
            />
            <input
              placeholder="Phone (optional)"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-2 w-full rounded border px-3 py-2 text-sm"
            />

            <label className="mt-3 flex items-start gap-2 text-xs text-gray-600">
              <input
                type="checkbox"
                checked={consented}
                onChange={(e) => setConsented(e.target.checked)}
                className="mt-0.5"
              />
              {CONSENT_TEXT}
            </label>

            {submitError && <p className="mt-2 text-xs text-red-600">{submitError}</p>}

            <button
              type="submit"
              disabled={!consented || submitting}
              className="mt-4 w-full rounded-full bg-black py-2.5 text-sm font-semibold text-white disabled:opacity-40"
            >
              {submitting ? "Unlocking…" : "See Full Preview"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

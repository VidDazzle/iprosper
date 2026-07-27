"use client";

import { useState, useCallback, useRef } from "react";

type Phase = "idle" | "submitting" | "processing" | "error";

export default function LandingPage() {
  const [url, setUrl] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const pollJob = useCallback((jobId: string) => {
    pollRef.current = setInterval(async () => {
      const res = await fetch(`/api/jobs/${jobId}`);
      if (!res.ok) return;
      const data = await res.json();

      if (data.status === "completed" && data.previewUrl) {
        if (pollRef.current) clearInterval(pollRef.current);
        window.location.href = `/preview/${jobId}`;
      } else if (data.status === "failed") {
        if (pollRef.current) clearInterval(pollRef.current);
        setError(data.inspectorVerdict?.error ?? "Preview generation failed.");
        setPhase("error");
      }
    }, 2000);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPhase("submitting");
    setError(null);

    const res = await fetch("/api/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "Something went wrong.");
      setPhase("error");
      return;
    }

    setPhase("processing");
    pollJob(data.jobId);
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-black px-6 text-white">
      <h1 className="max-w-2xl text-center text-4xl font-bold md:text-5xl">
        See your business, reimagined.
      </h1>
      <p className="mt-4 max-w-md text-center text-white/60">
        Drop in your website. We&apos;ll generate a cinematic preview of what it could be — free, in under 90
        seconds.
      </p>

      <form onSubmit={handleSubmit} className="mt-10 flex w-full max-w-md gap-2">
        <input
          type="url"
          required
          placeholder="https://yourbusiness.com"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={phase === "submitting" || phase === "processing"}
          className="flex-1 rounded-full border border-white/20 bg-white/5 px-5 py-3 text-white placeholder:text-white/40 focus:outline-none"
        />
        <button
          type="submit"
          disabled={phase === "submitting" || phase === "processing"}
          className="rounded-full bg-white px-6 py-3 font-semibold text-black disabled:opacity-50"
        >
          {phase === "processing" ? "Generating…" : "Generate Preview"}
        </button>
      </form>

      {phase === "processing" && (
        <p className="mt-4 text-sm text-white/50">
          Scraping your site and building your preview — this usually takes under 90 seconds.
        </p>
      )}
      {phase === "error" && error && <p className="mt-4 text-sm text-red-400">{error}</p>}
    </main>
  );
}

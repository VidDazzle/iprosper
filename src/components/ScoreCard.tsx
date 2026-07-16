"use client";

import { useState } from "react";
import { Star } from "lucide-react";

/**
 * Work card 1-10 rating widget. A client scores a piece of work (image, video,
 * deliverable) and the score is stored via /api/scores, feeding the
 * production-insights engine.
 */
export default function ScoreCard({
  targetType,
  targetId,
  category,
  reviewerName,
  label = "Rate this work",
}: {
  targetType: "meeting_asset" | "deliverable" | "deliverable_item";
  targetId: number;
  category?: string;
  reviewerName?: string;
  label?: string;
}) {
  const [hover, setHover] = useState(0);
  const [chosen, setChosen] = useState<number | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(score: number) {
    setChosen(score);
    setBusy(true);
    await fetch("/api/scores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetType, targetId, score, category, reviewerName }),
    }).catch(() => {});
    setBusy(false);
    setDone(true);
  }

  if (done) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-emerald-400">
        <Star className="h-3.5 w-3.5 fill-emerald-400" /> Rated {chosen}/10 — thanks!
      </div>
    );
  }

  return (
    <div>
      <div className="mb-1 text-[11px] text-gray-400">{label} (1–10)</div>
      <div className="flex flex-wrap gap-1" onMouseLeave={() => setHover(0)}>
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            disabled={busy}
            onMouseEnter={() => setHover(n)}
            onClick={() => submit(n)}
            className={`h-7 w-7 rounded text-xs font-medium transition ${
              (hover || chosen || 0) >= n
                ? "bg-amber-500 text-black"
                : "bg-white/5 text-gray-400 hover:bg-white/10"
            }`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Check, X, Loader2 } from "lucide-react";

export default function ApprovalActions({ id }: { id: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState<"approved" | "rejected" | null>(null);
  const [error, setError] = useState("");

  async function decide(decision: "approved" | "rejected") {
    setBusy(decision);
    setError("");
    try {
      const res = await fetch("/api/portal/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, decision }),
      });
      const data = await res.json();
      if (res.ok) {
        router.refresh();
      } else {
        setError(data.error ?? "Could not record your decision.");
        setBusy(null);
      }
    } catch {
      setError("Network error.");
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex gap-2">
        <Button
          onClick={() => decide("approved")}
          disabled={busy !== null}
          className="rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 text-white hover:from-emerald-400 hover:to-cyan-400"
        >
          {busy === "approved" ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Check className="mr-1 h-4 w-4" /> Approve</>}
        </Button>
        <Button
          onClick={() => decide("rejected")}
          disabled={busy !== null}
          variant="outline"
          className="rounded-full border-white/20 bg-transparent text-slate-300 hover:bg-white/5 hover:text-white"
        >
          {busy === "rejected" ? <Loader2 className="h-4 w-4 animate-spin" /> : <><X className="mr-1 h-4 w-4" /> Decline</>}
        </Button>
      </div>
      {error && <p className="text-xs text-rose-400">{error}</p>}
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

async function postJson(url: string, body: unknown): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (res.ok) return { ok: true };
  const data = await res.json().catch(() => ({}));
  return { ok: false, error: data.error ?? `Request failed (${res.status}).` };
}

export function KillAgentButton({ agentId }: { agentId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onClick() {
    const reason = window.prompt(`Reason for killing "${agentId}"?`);
    if (!reason) return;
    setError(null);
    startTransition(async () => {
      const result = await postJson(`/api/admin/agents/${agentId}/kill`, { reason });
      if (!result.ok) setError(result.error ?? "Failed to kill agent.");
      else router.refresh();
    });
  }

  return (
    <span>
      <button
        onClick={onClick}
        disabled={isPending}
        className="rounded bg-red-600 px-2 py-1 text-xs font-semibold text-white disabled:opacity-50"
      >
        {isPending ? "Killing…" : "Kill"}
      </button>
      {error && <span className="ml-2 text-xs text-red-600">{error}</span>}
    </span>
  );
}

export function PromoteAgentButton({ agentId }: { agentId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onClick() {
    setError(null);
    startTransition(async () => {
      const result = await postJson(`/api/admin/agents/${agentId}/promote`, {});
      if (!result.ok) setError(result.error ?? "Failed to promote agent.");
      else router.refresh();
    });
  }

  return (
    <span>
      <button
        onClick={onClick}
        disabled={isPending}
        className="ml-2 rounded bg-green-600 px-2 py-1 text-xs font-semibold text-white disabled:opacity-50"
      >
        {isPending ? "Promoting…" : "Promote"}
      </button>
      {error && <span className="ml-2 text-xs text-red-600">{error}</span>}
    </span>
  );
}

export function OpportunityActions({ candidateId }: { candidateId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onApprove() {
    const agentId = window.prompt("agentId to dispatch this opportunity to?");
    if (!agentId) return;
    const budgetCapStr = window.prompt("budgetCap (USD, hard credit cap for this dispatch)?");
    const budgetCap = Number(budgetCapStr);
    if (!budgetCapStr || !Number.isFinite(budgetCap) || budgetCap <= 0) {
      setError("A positive numeric budgetCap is required.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await postJson(`/api/admin/opportunities/${candidateId}/approve`, { agentId, budgetCap });
      if (!result.ok) setError(result.error ?? "Failed to approve.");
      else router.refresh();
    });
  }

  function onReject() {
    const reason = window.prompt(`Reason for rejecting this opportunity?`);
    if (!reason) return;
    setError(null);
    startTransition(async () => {
      const result = await postJson(`/api/admin/opportunities/${candidateId}/reject`, { reason });
      if (!result.ok) setError(result.error ?? "Failed to reject.");
      else router.refresh();
    });
  }

  return (
    <span>
      <button
        onClick={onApprove}
        disabled={isPending}
        className="rounded bg-green-600 px-2 py-1 text-xs font-semibold text-white disabled:opacity-50"
      >
        Approve
      </button>
      <button
        onClick={onReject}
        disabled={isPending}
        className="ml-2 rounded bg-red-600 px-2 py-1 text-xs font-semibold text-white disabled:opacity-50"
      >
        Reject
      </button>
      {error && <div className="mt-1 text-xs text-red-600">{error}</div>}
    </span>
  );
}

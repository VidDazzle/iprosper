"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { deleteCampaignAction, runCampaignNowAction, toggleCampaignAutopilotAction } from "@/lib/viralhive/actions";
import type { CampaignRunSummary } from "@/lib/viralhive/runCampaign";

export function CampaignRowActions({ id, autopilot }: { id: string; autopilot: boolean }) {
  const [pending, startTransition] = useTransition();
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<CampaignRunSummary | { error: string } | null>(null);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <span className="text-xs text-white/50">Autopilot</span>
        <Switch
          checked={autopilot}
          disabled={pending}
          onCheckedChange={(checked) => startTransition(() => toggleCampaignAutopilotAction(id, checked))}
        />
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={running}
          onClick={async () => {
            setRunning(true);
            setResult(null);
            try {
              setResult(await runCampaignNowAction(id));
            } catch (err) {
              setResult({ error: err instanceof Error ? err.message : String(err) });
            } finally {
              setRunning(false);
            }
          }}
        >
          {running ? "Running…" : "Run now"}
        </Button>
        <Button
          type="button"
          variant="destructive"
          size="sm"
          disabled={pending}
          onClick={() => {
            if (confirm(`Delete campaign "${id}"?`)) startTransition(() => deleteCampaignAction(id));
          }}
        >
          Delete
        </Button>
      </div>
      {result && (
        <pre className="max-w-md overflow-x-auto rounded bg-black/40 p-2 text-xs text-white/70">
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  );
}

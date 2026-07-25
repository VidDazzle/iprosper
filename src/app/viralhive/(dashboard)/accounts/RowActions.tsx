"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { deleteAccountAction, toggleAccountEnabledAction } from "@/lib/viralhive/actions";

export function AccountRowActions({ id, enabled }: { id: string; enabled: boolean }) {
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex items-center gap-3">
      <Switch
        checked={enabled}
        disabled={pending}
        onCheckedChange={(checked) => startTransition(() => toggleAccountEnabledAction(id, checked))}
      />
      <Button
        type="button"
        variant="destructive"
        size="sm"
        disabled={pending}
        onClick={() => {
          if (confirm(`Delete account "${id}"? This cannot be undone.`)) {
            startTransition(() => deleteAccountAction(id));
          }
        }}
      >
        Delete
      </Button>
    </div>
  );
}

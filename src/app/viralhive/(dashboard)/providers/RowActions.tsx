"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { deleteProviderAction } from "@/lib/viralhive/actions";

export function ProviderRowActions({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      variant="destructive"
      size="sm"
      disabled={pending}
      onClick={() => {
        if (confirm(`Delete provider "${id}"? Campaigns referencing it will start failing.`)) {
          startTransition(() => deleteProviderAction(id));
        }
      }}
    >
      Delete
    </Button>
  );
}

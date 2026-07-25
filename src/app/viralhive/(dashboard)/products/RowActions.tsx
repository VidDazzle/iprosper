"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { deleteProductAction } from "@/lib/viralhive/actions";

export function ProductRowActions({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      variant="destructive"
      size="sm"
      disabled={pending}
      onClick={() => {
        if (confirm(`Delete product "${id}"?`)) startTransition(() => deleteProductAction(id));
      }}
    >
      Delete
    </Button>
  );
}

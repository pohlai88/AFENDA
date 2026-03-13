"use client";

import { Button } from "@afenda/ui";

export default function CommInboxError({ reset }: { reset: () => void }) {
  return (
    <div className="mx-auto max-w-3xl px-6 py-12 text-center">
      <h2 className="text-lg font-semibold">Failed to load inbox</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Retry to fetch the latest inbox activity.
      </p>
      <Button type="button" className="mt-4" onClick={reset}>
        Retry
      </Button>
    </div>
  );
}

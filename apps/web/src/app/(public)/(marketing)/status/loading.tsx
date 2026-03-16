import { Activity } from "lucide-react";

import { Spinner } from "@afenda/ui";

export default function StatusLoading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-xl rounded-2xl border border-border/40 bg-card/60 p-6 shadow-[0_10px_40px_rgba(0,0,0,0.25)] backdrop-blur">
        <div className="mb-4 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-primary/80">
          <Activity className="h-3.5 w-3.5" aria-hidden />
          Platform Transparency
        </div>

        <div className="mb-5 flex items-center gap-3">
          <Spinner className="h-5 w-5" />
          <p className="text-sm text-muted-foreground">Loading real-time system status...</p>
        </div>

        <div className="space-y-3">
          <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
          <div className="h-10 w-full animate-pulse rounded-lg bg-muted/80" />
          <div className="h-10 w-full animate-pulse rounded-lg bg-muted/70" />
          <div className="h-10 w-4/5 animate-pulse rounded-lg bg-muted/60" />
        </div>
      </div>
    </div>
  );
}
import { Card, CardContent, CardHeader, Skeleton } from "@afenda/ui";

import { AuthSplitShell } from "./auth-split-shell";

function AuthLoadingAside() {
  return (
    <aside className="space-y-8" aria-hidden="true">
      <Skeleton className="h-6 w-40 rounded-full" />

      <div className="max-w-xl space-y-4">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-5 w-full max-w-[36rem]" />
        <Skeleton className="h-5 w-5/6 max-w-[32rem]" />
      </div>

      <Card className="border border-border/70 bg-card shadow-sm">
        <CardHeader className="pb-4">
          <Skeleton className="h-6 w-56" />
        </CardHeader>

        <CardContent className="space-y-5">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={`auth-aside-loading-${index}`}>
              <div className="flex items-start gap-4">
                <Skeleton className="h-10 w-10 rounded-xl" />

                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                </div>
              </div>

              {index < 2 ? <div className="pt-5" /> : null}
            </div>
          ))}
        </CardContent>
      </Card>
    </aside>
  );
}

function AuthLoadingForm() {
  return (
    <div
      className="space-y-6"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Loading authentication page"
    >
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-9 w-28" />
      </div>

      <Card className="border border-border/70 bg-card shadow-sm">
        <CardHeader className="space-y-3 px-6 pt-6 sm:px-8 sm:pt-8">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-5 w-72 max-w-full" />
        </CardHeader>

        <CardContent className="space-y-6 px-6 pb-6 sm:px-8 sm:pb-8">
          <Skeleton className="h-11 w-full" />

          <div className="space-y-4 rounded-xl border border-border/70 bg-background p-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-11 w-full" />
          </div>

          <div className="flex items-center justify-center">
            <Skeleton className="h-5 w-44" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function AuthLoadingState() {
  return (
    <AuthSplitShell aside={<AuthLoadingAside />}>
      <AuthLoadingForm />
    </AuthSplitShell>
  );
}
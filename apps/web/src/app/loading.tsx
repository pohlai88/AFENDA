import { Card, CardContent, CardHeader, Skeleton } from "@afenda/ui";

export type GlobalLoadingVariant = "global" | "panel" | "table" | "auth";

export function GlobalLoading({ variant = "global" }: { variant?: GlobalLoadingVariant }) {
  if (variant === "auth") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-surface-100 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-2">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-56" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </main>
    );
  }

  if (variant === "table") {
    return (
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 p-6" aria-busy="true" aria-label="Loading data">
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="rounded-lg border">
          <div className="grid grid-cols-7 gap-4 border-b p-4">
            {Array.from({ length: 7 }).map((_, index) => (
              <Skeleton key={`table-header-${index}`} className="h-4 w-full" />
            ))}
          </div>
          <div className="space-y-0">
            {Array.from({ length: 6 }).map((_, row) => (
              <div key={`table-row-${row}`} className="grid grid-cols-7 gap-4 border-b p-4 last:border-b-0">
                {Array.from({ length: 7 }).map((__, col) => (
                  <Skeleton key={`table-cell-${row}-${col}`} className="h-4 w-full" />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === "panel") {
    return (
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-8" aria-busy="true" aria-label="Loading panel">
        <div className="space-y-2">
          <Skeleton className="h-6 w-44" />
          <Skeleton className="h-4 w-80" />
        </div>
        <Card>
          <CardContent className="space-y-4 p-6">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={`panel-row-${index}`} className="space-y-2">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-9 w-full" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface-100 p-4" aria-busy="true" aria-label="Loading application">
      <Card className="w-full max-w-3xl">
        <CardHeader className="space-y-3">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-80" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
          <Skeleton className="h-56 w-full" />
        </CardContent>
      </Card>
    </main>
  );
}

export default function Loading() {
  return <GlobalLoading variant="global" />;
}

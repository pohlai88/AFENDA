import { Skeleton } from "@afenda/ui";

export default function ProjectSettingsLoading() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <Skeleton className="h-4 w-28" />
        <Skeleton className="mt-3 h-10 w-96" />
        <div className="mt-3 flex gap-2">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-6 w-24" />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          {Array.from({ length: 2 }).map((_, index) => (
            <div key={index} className="rounded-lg border p-6">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="mt-2 h-4 w-64" />
              <div className="mt-4 space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-6">
          {Array.from({ length: 2 }).map((_, index) => (
            <div key={index} className="rounded-lg border p-6">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="mt-2 h-4 w-56" />
              <div className="mt-4 space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-10 w-32" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

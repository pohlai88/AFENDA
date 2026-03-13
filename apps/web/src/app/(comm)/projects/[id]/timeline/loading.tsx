import { Skeleton } from "@afenda/ui";

export default function ProjectTimelineLoading() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <Skeleton className="h-4 w-28" />
        <Skeleton className="mt-3 h-10 w-96" />
        <Skeleton className="mt-3 h-4 w-[32rem]" />
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="rounded-lg border p-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="mt-3 h-8 w-16" />
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-lg border p-6">
          <Skeleton className="h-6 w-20" />
          <div className="mt-4 space-y-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="rounded-lg border p-4">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="mt-3 h-4 w-full" />
                <Skeleton className="mt-2 h-4 w-2/3" />
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-lg border p-6">
            <Skeleton className="h-6 w-24" />
            <div className="mt-4 space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="rounded-lg border p-4">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="mt-3 h-4 w-full" />
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border p-6">
            <Skeleton className="h-6 w-40" />
            <div className="mt-4 space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="rounded-lg border p-4">
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="mt-3 h-4 w-3/4" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

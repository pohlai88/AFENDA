import { Skeleton } from "@afenda/ui";

export default function ProjectDetailLoading() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <Skeleton className="h-4 w-28" />
        <Skeleton className="mt-3 h-10 w-80" />
        <div className="mt-3 flex gap-2">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-6 w-24" />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="rounded-lg border p-6">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="mt-4 h-4 w-full" />
          <Skeleton className="mt-2 h-4 w-full" />
          <Skeleton className="mt-2 h-4 w-2/3" />
        </div>

        <div className="rounded-lg border p-6">
          <Skeleton className="h-6 w-28" />
          <div className="mt-4 space-y-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="flex items-center justify-between gap-4">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

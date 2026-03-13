import { Skeleton } from "@afenda/ui";

export default function ProjectBoardLoading() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <Skeleton className="h-4 w-28" />
        <Skeleton className="mt-3 h-10 w-80" />
        <div className="mt-3 flex gap-2">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-6 w-28" />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="rounded-lg border p-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="mt-3 h-8 w-16" />
          </div>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="rounded-lg border p-3">
            <Skeleton className="h-4 w-24" />
            <div className="mt-3 space-y-2">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

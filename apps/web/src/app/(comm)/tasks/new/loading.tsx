import { Skeleton } from "@afenda/ui";

export default function NewTaskLoading() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <Skeleton className="h-10 w-48" />
        <Skeleton className="mt-2 h-4 w-64" />
      </div>

      <div className="rounded-lg border p-6">
        <div className="space-y-4">
          <div>
            <Skeleton className="h-4 w-20" />
            <Skeleton className="mt-2 h-10 w-full" />
          </div>
          <div>
            <Skeleton className="h-4 w-24" />
            <Skeleton className="mt-2 h-28 w-full" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div>
            <Skeleton className="h-4 w-32" />
            <Skeleton className="mt-2 h-10 w-full" />
          </div>
          <Skeleton className="h-10 w-28" />
        </div>
      </div>
    </div>
  );
}

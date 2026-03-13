import { Skeleton } from "@afenda/ui";

export default function CommLoading() {
  return (
    <div className="space-y-8 p-6">
      <div>
        <Skeleton className="h-9 w-48" />
        <Skeleton className="mt-2 h-4 w-96" />
      </div>

      <div className="grid auto-rows-[100px] grid-cols-1 gap-4 md:grid-cols-3">
        <Skeleton />
        <Skeleton />
        <Skeleton />
      </div>
    </div>
  );
}

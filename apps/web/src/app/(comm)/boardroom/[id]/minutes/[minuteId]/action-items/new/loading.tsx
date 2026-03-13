import { Skeleton } from "@afenda/ui";

export default function NewActionItemLoading() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 px-6 py-8">
      <div className="space-y-2">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-8 w-64" />
      </div>
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    </div>
  );
}

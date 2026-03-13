import { Skeleton } from "@afenda/ui";

export default function MinuteDetailLoading() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-6 py-8">
      <div className="space-y-2">
        <Skeleton className="h-4 w-64" />
        <Skeleton className="h-8 w-96" />
      </div>
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
  );
}

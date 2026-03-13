import { Skeleton } from "@afenda/ui";

export default function MeetingDetailLoading() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 px-6 py-8">
      <div className="space-y-2">
        <Skeleton className="h-9 w-3/4" />
        <Skeleton className="h-4 w-48" />
      </div>
      <Skeleton className="h-48 w-full" />
    </div>
  );
}

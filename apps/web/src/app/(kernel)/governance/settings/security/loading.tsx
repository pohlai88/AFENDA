import { Skeleton } from "@afenda/ui";

export default function SecuritySettingsLoading() {
  return (
    <div className="space-y-6 p-6">
      <Skeleton className="h-8 w-52" />
      <div className="space-y-4 rounded-lg border p-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  );
}

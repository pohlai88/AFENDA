<<<<<<< HEAD
export default function OrganizationsSettingsLoading() {
  return (
    <div>
      <div className="border-b px-8 py-5">
        <div className="h-6 w-36 animate-pulse rounded bg-muted" />
        <div className="mt-2 h-4 w-96 animate-pulse rounded bg-muted" />
      </div>
      <div className="max-w-lg space-y-10 px-8 py-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-3">
            <div className="h-5 w-40 animate-pulse rounded bg-muted" />
            <div className="h-24 animate-pulse rounded border border-border bg-muted" />
          </div>
        ))}
=======
import { Skeleton } from "@afenda/ui";

export default function OrganizationsSettingsLoading() {
  return (
    <div className="space-y-6 p-6">
      <Skeleton className="h-8 w-64" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-56 w-full" />
        <Skeleton className="h-56 w-full" />
>>>>>>> d80f778 (feat(comm): implement communication domain slices and worker handlers)
      </div>
    </div>
  );
}

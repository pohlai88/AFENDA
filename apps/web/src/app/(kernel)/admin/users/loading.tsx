<<<<<<< HEAD
export default function AdminUsersLoading() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-6 space-y-2">
        <div className="h-4 w-20 animate-pulse rounded bg-muted" />
        <div className="h-6 w-24 animate-pulse rounded bg-muted" />
        <div className="h-4 w-80 animate-pulse rounded bg-muted" />
      </div>
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 animate-pulse rounded border border-border bg-muted" />
=======
import { Skeleton } from "@afenda/ui";

export default function AdminUsersLoading() {
  return (
    <div className="space-y-6 p-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-10 w-80" />
      <div className="space-y-2 rounded-lg border p-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <Skeleton key={index} className="h-10 w-full" />
>>>>>>> d80f778 (feat(comm): implement communication domain slices and worker handlers)
        ))}
      </div>
    </div>
  );
}

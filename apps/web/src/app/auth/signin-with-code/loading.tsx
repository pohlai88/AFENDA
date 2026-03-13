<<<<<<< HEAD
export default function SignInWithCodeLoading() {
  return (
    <div className="mx-auto w-full max-w-md space-y-4 p-6">
      <div className="h-7 w-40 animate-pulse rounded bg-muted" />
      <div className="h-4 w-72 animate-pulse rounded bg-muted" />
      <div className="space-y-3">
        <div className="h-10 animate-pulse rounded border border-border bg-muted" />
        <div className="h-10 animate-pulse rounded border border-border bg-muted" />
      </div>
      <div className="h-10 w-32 animate-pulse rounded bg-muted" />
    </div>
=======
import { Skeleton } from "@afenda/ui";

export default function SignInWithCodeLoading() {
  return (
    <main className="mx-auto flex min-h-[60vh] w-full max-w-xl items-center px-4 py-12">
      <div className="w-full space-y-4 rounded-lg border p-6">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    </main>
>>>>>>> d80f778 (feat(comm): implement communication domain slices and worker handlers)
  );
}

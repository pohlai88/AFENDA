import { Skeleton } from "@afenda/ui";

export default function OnboardingLoading() {
  return (
    <main className="mx-auto flex min-h-[60vh] w-full max-w-2xl items-center px-4 py-12">
      <div className="w-full space-y-4 rounded-lg border p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    </main>
  );
}

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
  );
}

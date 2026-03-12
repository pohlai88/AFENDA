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
        ))}
      </div>
    </div>
  );
}

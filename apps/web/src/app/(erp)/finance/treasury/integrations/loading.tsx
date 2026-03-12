export default function IntegrationsLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="h-9 w-80 animate-pulse rounded bg-muted" />
        <div className="h-4 w-[32rem] animate-pulse rounded bg-muted" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="h-72 animate-pulse rounded-xl border bg-card" />
        <div className="h-72 animate-pulse rounded-xl border bg-card" />
      </div>
    </div>
  );
}

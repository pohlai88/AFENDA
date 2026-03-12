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
      </div>
    </div>
  );
}

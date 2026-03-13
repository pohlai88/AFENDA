export default function CommInboxLoading() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <div className="h-6 w-40 animate-pulse rounded bg-muted" />
      <div className="mt-6 h-20 animate-pulse rounded border bg-muted/40" />
      <div className="mt-4 h-24 animate-pulse rounded border bg-muted/40" />
    </div>
  );
}

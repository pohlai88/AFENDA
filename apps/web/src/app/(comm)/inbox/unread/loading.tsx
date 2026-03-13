export default function CommInboxUnreadLoading() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <div className="h-6 w-40 animate-pulse rounded bg-muted" />
      <div className="mt-6 h-28 animate-pulse rounded border bg-muted/40" />
    </div>
  );
}

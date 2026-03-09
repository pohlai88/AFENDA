"use client";

export default function SettingsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="p-8 space-y-4 max-w-md">
      <h2 className="text-lg font-semibold tracking-tight">Failed to load settings</h2>
      <p className="text-sm text-muted-foreground">
        {error.message ?? "An unexpected error occurred."}
      </p>
      {error.digest && (
        <p className="text-xs text-muted-foreground font-mono">ID: {error.digest}</p>
      )}
      <button
        onClick={reset}
        className="inline-flex items-center justify-center rounded-md text-sm font-medium h-9 px-4 border border-input bg-background hover:bg-accent hover:text-accent-foreground"
      >
        Try again
      </button>
    </div>
  );
}

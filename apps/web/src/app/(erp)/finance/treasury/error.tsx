"use client";

export default function TreasuryError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="max-w-7xl mx-auto px-6 py-16 flex items-center justify-center">
      <div className="max-w-md w-full text-center space-y-4">
        <h2 className="text-lg font-semibold tracking-tight">Failed to load Treasury</h2>
        <p className="text-sm text-muted-foreground">
          {error.message ?? "An unexpected error occurred. Please try again."}
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
    </div>
  );
}

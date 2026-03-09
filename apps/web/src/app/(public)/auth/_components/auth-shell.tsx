import type { ReactNode } from "react";

type AuthShellWidth = "md" | "lg";

export function AuthShell({
  children,
  width = "md",
}: {
  children: ReactNode;
  width?: AuthShellWidth;
}) {
  const widthClass = width === "lg" ? "max-w-lg" : "max-w-md";

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-surface-100 px-4 py-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.12),transparent_48%),radial-gradient(circle_at_bottom_right,hsl(var(--muted)/0.55),transparent_55%)]" />
      <div className={`relative z-10 w-full ${widthClass}`}>{children}</div>
    </main>
  );
}

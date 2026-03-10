import type { ReactNode } from "react";
import { AuthBranding } from "./auth-branding";
import { ThemeToggle } from "@/components/ThemeToggle";

const BRAND_QUOTES = [
  { text: "Where numbers become canon.", author: "AFENDA" },
  { text: "Every transaction, perfectly audited.", author: "AFENDA" },
  { text: "Financial truth, immutably recorded.", author: "AFENDA" },
] as const;

const quote = BRAND_QUOTES[0];

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen bg-background">
      {/* Theme toggle — top-right corner */}
      <div className="fixed top-4 right-4 z-20">
        <ThemeToggle />
      </div>
      {/* Subtle full-page noise texture */}
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,oklch(0.488_0.243_264.376_/_0.08),transparent)]" />

      <div className="relative z-10 flex min-h-screen">
        {/* ── Left panel: brand identity (hidden on mobile) ── */}
        <div className="hidden lg:flex lg:w-[480px] xl:w-[560px] flex-col justify-between border-r border-border bg-surface-50 px-12 py-16 flex-shrink-0">
          {/* Top: logo */}
          <AuthBranding size="md" />

          {/* Mid: decorative audit-mark watermark */}
          <div className="flex flex-col gap-8">
            <div className="flex items-center gap-4 opacity-10">
              {/* Static 3-dot audit mark watermark */}
              <svg width="96" height="96" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="5" cy="12" r="2" fill="currentColor" />
                <circle cx="12" cy="12" r="2" fill="currentColor" />
                <circle cx="19" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.5" fill="none" />
              </svg>
            </div>
            <blockquote className="space-y-3">
              <p className="text-xl font-semibold leading-snug text-foreground">
                &ldquo;{quote.text}&rdquo;
              </p>
              <footer className="text-sm font-mono uppercase tracking-widest text-muted-foreground">
                — {quote.author}
              </footer>
            </blockquote>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p className="flex items-center gap-2">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary" />
                Audit-first financial platform
              </p>
              <p className="flex items-center gap-2">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary" />
                Immutable truth tables &amp; journal entries
              </p>
              <p className="flex items-center gap-2">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary" />
                Multi-tenant, role-based access control
              </p>
            </div>
          </div>

          {/* Bottom: version / privacy */}
          <p className="text-xs text-muted-foreground/60" suppressHydrationWarning>
            © {new Date().getFullYear()} AFENDA · Privacy · Terms
          </p>
        </div>

        {/* ── Right panel: auth form ── */}
        <div className="flex flex-1 flex-col items-center justify-center px-4 py-12 sm:px-8">
          {/* Mobile-only logo */}
          <div className="mb-8 lg:hidden">
            <AuthBranding size="sm" />
          </div>

          <div className="w-full max-w-md">{children}</div>
        </div>
      </div>
    </div>
  );
}

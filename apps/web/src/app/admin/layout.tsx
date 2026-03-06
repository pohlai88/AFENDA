import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Admin — AFENDA",
  description: "Internal admin and observability tools",
};

const NAV = [
  { href: "/admin",          label: "Overview" },
  { href: "/admin/insights", label: "Insights" },
  { href: "/admin/traces",   label: "Traces" },
] as const;

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <header className="border-b px-6 py-3 flex items-center gap-6 bg-surface-100">
        <Link href="/" className="text-sm font-semibold tracking-tight text-muted-foreground hover:text-foreground">
          ← AFENDA
        </Link>
        <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Admin</span>
        <nav className="flex gap-4 ml-auto">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>

      {/* ── Content ─────────────────────────────────────────────────────────── */}
      <main className="flex-1">{children}</main>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Finance — AFENDA",
  description: "Accounts Payable, General Ledger, and financial operations",
};

const NAV = [
  { href: "/finance/ap/invoices", label: "AP Invoices" },
  // Future: { href: "/finance/gl/accounts", label: "GL Accounts" },
  // Future: { href: "/finance/gl/journal-entries", label: "Journal Entries" },
] as const;

export default function FinanceLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <header className="border-b px-6 py-3 flex items-center gap-6 bg-surface-100">
        <Link
          href="/"
          className="text-sm font-semibold tracking-tight text-muted-foreground hover:text-foreground"
        >
          ← AFENDA
        </Link>
        <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
          Finance
        </span>
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
          <Link
            href="/admin"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Admin
          </Link>
        </nav>
      </header>

      {/* ── Content ─────────────────────────────────────────────────────────── */}
      <main className="flex-1">{children}</main>
    </div>
  );
}

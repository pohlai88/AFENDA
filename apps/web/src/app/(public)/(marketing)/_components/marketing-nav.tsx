"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Info, Phone, Activity, FileText, Shield } from "lucide-react";
import { Button } from "@afenda/ui";

interface NavItem {
  readonly href: string;
  readonly label: string;
  readonly icon?: typeof Home;
}

const PRIMARY_NAV: readonly NavItem[] = [
  { href: "/", label: "Home", icon: Home },
  { href: "/about", label: "About", icon: Info },
  { href: "/contact", label: "Contact", icon: Phone },
  { href: "/status", label: "Status", icon: Activity },
] as const;

const LEGAL_NAV: readonly NavItem[] = [
  { href: "/terms", label: "Terms", icon: FileText },
  { href: "/privacy", label: "Privacy", icon: Shield },
  { href: "/sla", label: "SLA" },
  { href: "/pdpa", label: "PDPA" },
  { href: "/cookie-policy", label: "Cookies" },
] as const;

export function MarketingNav() {
  const pathname = usePathname();

  return (
    <nav className="bg-surface-l0/95 fixed top-0 right-0 left-0 z-50 border-b border-border-subtle backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-6 py-4">
        <div className="flex items-center justify-between gap-8">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 text-foreground hover:text-primary">
            <div className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-primary" />
              <span className="h-2 w-2 rounded-full bg-primary" />
              <span className="h-2 w-2 rounded-full border border-primary" />
            </div>
            <span className="text-lg font-medium">AFENDA</span>
          </Link>

          {/* Primary Navigation */}
          <div className="hidden items-center gap-1 md:flex">
            {PRIMARY_NAV.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-surface-l2 text-foreground"
                      : "hover:bg-surface-l1 text-foreground-secondary hover:text-foreground"
                  } `}
                >
                  {Icon && <Icon className="h-4 w-4" />}
                  {item.label}
                </Link>
              );
            })}
          </div>

          {/* CTA Button */}
          <Button asChild size="sm">
            <Link href="/auth/sign-in">Get Started</Link>
          </Button>
        </div>
      </div>
    </nav>
  );
}

export function MarketingFooter() {
  return (
    <footer className="bg-surface-l0 mt-24 border-t border-border-subtle">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          {/* Brand */}
          <div className="col-span-1">
            <Link href="/" className="mb-4 flex items-center gap-2 text-foreground">
              <div className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-primary" />
                <span className="h-2 w-2 rounded-full bg-primary" />
                <span className="h-2 w-2 rounded-full border border-primary" />
              </div>
              <span className="text-lg font-medium">AFENDA</span>
            </Link>
            <p className="text-sm text-foreground-secondary">
              Business Truth Engine for Governed Enterprise Operations
            </p>
          </div>

          {/* Platform */}
          <div>
            <h3 className="mb-4 text-sm font-semibold text-foreground">Platform</h3>
            <ul className="space-y-2">
              {PRIMARY_NAV.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-sm text-foreground-secondary hover:text-foreground"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="mb-4 text-sm font-semibold text-foreground">Legal</h3>
            <ul className="space-y-2">
              {LEGAL_NAV.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-sm text-foreground-secondary hover:text-foreground"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="mb-4 text-sm font-semibold text-foreground">Connect</h3>
            <ul className="space-y-2">
              <li>
                <a
                  href="mailto:emerson@nexuscanon.com"
                  className="text-sm text-foreground-secondary hover:text-foreground"
                >
                  emerson@nexuscanon.com
                </a>
              </li>
              <li className="text-sm text-foreground-tertiary">Singapore (ap-southeast-1)</li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border-subtle pt-8 md:flex-row">
          <p className="text-sm text-foreground-tertiary">
            © {new Date().getFullYear()} AFENDA. All rights reserved.
          </p>
          <div className="flex gap-6">
            <Link href="/terms" className="text-sm text-foreground-tertiary hover:text-foreground">
              Terms
            </Link>
            <Link
              href="/privacy"
              className="text-sm text-foreground-tertiary hover:text-foreground"
            >
              Privacy
            </Link>
            <Link href="/sla" className="text-sm text-foreground-tertiary hover:text-foreground">
              SLA
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

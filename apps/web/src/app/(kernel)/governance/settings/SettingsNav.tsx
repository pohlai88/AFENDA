"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const SETTINGS_NAV = [
  { href: "/governance/settings/company",       label: "Company" },
  { href: "/governance/settings",               label: "General" },
  { href: "/governance/settings/features",      label: "Features" },
  { href: "/governance/settings/numbering",     label: "Numbering" },
  { href: "/governance/settings/access",        label: "Access" },
  { href: "/governance/settings/security",      label: "Security" },
  { href: "/governance/settings/custom-fields", label: "Custom Fields" },
] as const;

export function SettingsNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {SETTINGS_NAV.map((item) => {
        const isActive =
          item.href === "/governance/settings"
            ? pathname === item.href
            : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={[
              "block rounded px-2 py-1.5 text-sm transition-colors",
              isActive
                ? "bg-surface-100 text-foreground font-medium"
                : "text-muted-foreground hover:bg-surface-100 hover:text-foreground",
            ].join(" ")}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

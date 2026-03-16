import "./marketing-info.css";
import type { ReactNode } from "react";
import { MarketingNav, MarketingFooter } from "./_components/marketing-nav";

/**
 * Marketing info page layout — uses 9-pillar design system tokens only.
 *
 * REQUIRED: The wrapper must have [data-marketing-info] so every rule in
 * marketing-info.css applies (all selectors are [data-marketing-info] ...).
 * Without it, .mi-page, .mi-shell, .mi-cta, etc. would never match.
 * Also applies dark theme and root baseline (min-h-screen, bg, text).
 */
export default function MarketingLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <div
      data-marketing-info
      className="dark min-h-screen bg-background text-foreground font-sans antialiased"
    >
      <MarketingNav />
      <div className="pt-16">{children}</div>
      <MarketingFooter />
    </div>
  );
}
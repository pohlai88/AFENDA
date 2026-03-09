import type { ReactNode } from "react";
import "./marketing.css";

/**
 * Marketing page layout — isolated from ERP design system.
 *
 * The [data-marketing] attribute scopes all marketing.css rules to this
 * subtree, resetting ERP globals (font-feature-settings, borders, scrollbars)
 * and providing dark-terminal design tokens as CSS custom properties.
 */
export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div
      data-marketing
      className="min-h-screen bg-[#0B0D12] text-slate-50 font-sans antialiased"
    >
      {children}
    </div>
  );
}

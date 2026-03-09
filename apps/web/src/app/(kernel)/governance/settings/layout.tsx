import type { Metadata } from "next";
import { SettingsNav } from "./SettingsNav";

export const metadata: Metadata = {
  title: "Settings — AFENDA",
  description: "Configure general, email, and other system settings",
};

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-0 flex-1">
      {/* ── Sidebar ────────────────────────────────────────────────────────── */}
      <aside className="w-56 shrink-0 border-r bg-surface-50 py-6 px-4 flex flex-col gap-1">
        <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground px-2 mb-2">
          Settings
        </p>
        <SettingsNav />
      </aside>

      {/* ── Content ────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}

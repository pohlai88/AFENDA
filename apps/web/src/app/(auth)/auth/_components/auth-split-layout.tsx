"use client";

import type { ReactNode } from "react";
import type { PortalType } from "@afenda/contracts";
import { Dialog, DialogContent, DialogTrigger, Button } from "@afenda/ui";
import { ChevronsUpDown } from "lucide-react";
import { AfendaMark } from "@/app/(public)/(marketing)/AfendaMark";
import { ThemeToggle } from "@/components/ThemeToggle";
import { getPortal } from "@/platform/portals";

interface AuthSplitLayoutProps {
  leftPanel: ReactNode;
  rightPanel: ReactNode;
  /** Current portal for mobile header label (ADR §4.3) */
  portal?: PortalType;
}

export function AuthSplitLayout({
  leftPanel,
  rightPanel,
  portal,
}: AuthSplitLayoutProps) {
  const portalConfig = portal ? getPortal(portal) : undefined;
  const portalLabel = portalConfig?.label ?? "Portal options";
  const year = new Date().getFullYear();

  return (
    <div className="min-h-screen w-full bg-background flex flex-col lg:flex-row">
      {/* Mobile: sticky header with Dialog portal switcher */}
      <header className="lg:hidden flex items-center justify-between p-4 border-b border-border bg-card/50 backdrop-blur supports-backdrop-filter:bg-background/60 sticky top-0 z-10">
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2 font-normal h-8">
              <ChevronsUpDown className="size-3.5 opacity-50" />
              {portalLabel}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            {leftPanel}
          </DialogContent>
        </Dialog>
        <div className="flex items-center gap-2">
          <AfendaMark size={20} variant="static" />
          <span className="font-semibold text-sm tracking-tight">AFENDA</span>
        </div>
        <ThemeToggle />
      </header>

      {/* Desktop left: branding panel (token-based inverted surface) */}
      <div className="hidden lg:flex lg:w-1/2 lg:flex-col lg:justify-between p-10 lg:p-14 bg-foreground text-background border-r border-border">
        <div className="flex items-center gap-3">
          <AfendaMark size={28} variant="static" color="var(--background)" />
          <span className="font-semibold text-lg tracking-tight">AFENDA</span>
        </div>

        <div className="max-w-md w-full mx-auto space-y-8">
          {leftPanel}
        </div>

        <div className="flex items-center justify-between text-sm text-background/80">
          <p>© {year} Afenda Inc.</p>
          <ThemeToggle />
        </div>
      </div>

      {/* Desktop right: auth form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-14">
        <div className="w-full max-w-[400px] space-y-6">
          {rightPanel}
        </div>
      </div>
    </div>
  );
}

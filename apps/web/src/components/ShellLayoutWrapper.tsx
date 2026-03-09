"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AppShellProvider } from "@/components/AppShellProvider";
import { isPublicFacingPath } from "@/lib/shell-paths";

/**
 * Shell layout wrapper expected by ui-shell gate.
 * RootShell behavior is delegated to AppShellProvider for non-public routes.
 */
export function ShellLayoutWrapper({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const resolvedPathname = pathname || "/";

  if (isPublicFacingPath(resolvedPathname)) {
    return <>{children}</>;
  }

  return <AppShellProvider>{children}</AppShellProvider>;
}

"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

/**
 * Theme provider — respects system preference (prefers-color-scheme) by default.
 * Uses class strategy to toggle .dark on html, matching @afenda/ui design tokens.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      storageKey="afenda-ui-theme"
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}

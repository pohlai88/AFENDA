"use client";

/**
 * SessionProvider — wraps next-auth SessionProvider for useSession().
 *
 * Required for useSession() from next-auth/react. Optional refetchInterval
 * keeps session fresh.
 */
import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";
import type { ReactNode } from "react";

export function SessionProvider({ children }: { children: ReactNode }) {
  return (
    <NextAuthSessionProvider refetchInterval={5 * 60}>
      {children}
    </NextAuthSessionProvider>
  );
}

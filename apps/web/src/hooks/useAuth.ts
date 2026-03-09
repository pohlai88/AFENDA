/**
 * useAuth — maps NextAuth useSession() to auth value.
 *
 * Requires SessionProvider in layout. Returns user and status.
 * TODO: Update type definition after new shell is built.
 */
"use client";

import { useSession } from "next-auth/react";

export function useAuth() {
  const { data: session, status } = useSession();

  return {
    user: session?.user ?? null,
    status:
      status === "loading"
        ? "loading"
        : session
          ? "authenticated"
          : "unauthenticated",
  };
}

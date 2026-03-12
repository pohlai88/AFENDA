"use server";

import { auth as neonAuth, isNeonAuthConfigured } from "@/lib/auth/server";
import { auth } from "@/auth";

/** Session shape returned by Neon Auth listSessions (minimal for display). */
export interface ListSessionItem {
  id?: string;
  /** Session token — required by Better Auth revokeSession({ token }). May be omitted in list response for security. */
  token?: string;
  userId?: string;
  expiresAt?: Date | string;
  [key: string]: unknown;
}

export type ListSessionsResult =
  | { ok: true; sessions: ListSessionItem[] }
  | { ok: false; error: string };

/**
 * List all active sessions for the current user (Neon Auth auth.listSessions).
 */
export async function listSessionsAction(): Promise<ListSessionsResult> {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, error: "You must be signed in to list sessions." };
  }

  if (!isNeonAuthConfigured || !neonAuth) {
    return { ok: false, error: "Session list is not configured." };
  }

  try {
    const listSessions = (
      neonAuth as unknown as {
        listSessions?: () => Promise<{ data?: ListSessionItem[]; error?: { message?: string } }>;
      }
    ).listSessions;
    if (!listSessions) {
      return { ok: false, error: "List sessions is not available." };
    }

    const { data, error } = await listSessions();

    if (error) {
      return { ok: false, error: error.message ?? "Failed to list sessions." };
    }

    return { ok: true, sessions: Array.isArray(data) ? data : [] };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to list sessions.";
    return { ok: false, error: message };
  }
}

export type RevokeSessionResult = { ok: true } | { ok: false; error: string };

/**
 * Revoke a specific session (Neon/Better Auth auth.revokeSession).
 * Better Auth expects the session token: revokeSession({ token: "session-token" }).
 * Pass the session's token if listSessions returns it; otherwise some backends accept id as token.
 */
export async function revokeSessionAction(sessionToken: string): Promise<RevokeSessionResult> {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, error: "You must be signed in to revoke sessions." };
  }

  const token = sessionToken?.trim();
  if (!token) {
    return { ok: false, error: "Session token is required." };
  }

  if (!isNeonAuthConfigured || !neonAuth) {
    return { ok: false, error: "Revoke session is not configured." };
  }

  try {
    const revokeSession = neonAuth.revokeSession?.bind(neonAuth);
    if (!revokeSession) {
      return { ok: false, error: "Revoke session is not available." };
    }

    const { error } = await revokeSession({ token });

    if (error) {
      return { ok: false, error: error.message ?? "Failed to revoke session." };
    }

    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to revoke session.";
    return { ok: false, error: message };
  }
}

export type RevokeOtherSessionsResult = { ok: true } | { ok: false; error: string };

/**
 * Revoke all sessions except the current one (Neon/Better Auth auth.revokeOtherSessions).
 */
export async function revokeOtherSessionsAction(): Promise<RevokeOtherSessionsResult> {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, error: "You must be signed in to revoke sessions." };
  }

  if (!isNeonAuthConfigured || !neonAuth) {
    return { ok: false, error: "Revoke sessions is not configured." };
  }

  try {
    const revokeOtherSessions = neonAuth.revokeOtherSessions?.bind(neonAuth);
    if (!revokeOtherSessions) {
      return { ok: false, error: "Revoke other sessions is not available." };
    }

    const { error } = await revokeOtherSessions();

    if (error) {
      return { ok: false, error: error.message ?? "Failed to revoke other sessions." };
    }

    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to revoke other sessions.";
    return { ok: false, error: message };
  }
}

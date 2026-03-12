"use server";

import { auth as neonAuth, isNeonAuthConfigured } from "@/lib/auth/server";
import { auth } from "@/auth";
import { adminBanUserSchema, adminSetRoleSchema } from "../_lib/auth-schemas";

/** User item returned by auth.admin.listUsers (Better Auth user shape). */
export interface ListUserItem {
  id?: string;
  email?: string;
  name?: string | null;
  image?: string | null;
  emailVerified?: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  [key: string]: unknown;
}

export type ListUsersResult = { ok: true; users: ListUserItem[] } | { ok: false; error: string };

const DEFAULT_LIMIT = 100;
const DEFAULT_OFFSET = 0;
const MAX_LIMIT = 500;

/**
 * List all users (Neon Auth auth.admin.listUsers).
 * Available for users with admin role.
 */
export async function listUsersAction(options?: {
  limit?: number;
  offset?: number;
}): Promise<ListUsersResult> {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, error: "You must be signed in." };
  }

  const isAdmin = session.user.roles?.includes("admin");
  if (!isAdmin) {
    return { ok: false, error: "Admin role required to list users." };
  }

  if (!isNeonAuthConfigured || !neonAuth) {
    return { ok: false, error: "Auth is not configured." };
  }

  const limit = Math.min(Math.max(1, Number(options?.limit) || DEFAULT_LIMIT), MAX_LIMIT);
  const offset = Math.max(0, Number(options?.offset) ?? DEFAULT_OFFSET);

  try {
    const adminApi = (
      neonAuth as unknown as {
        admin?: {
          listUsers?: (opts: { limit?: number; offset?: number }) => Promise<{
            data?: ListUserItem[];
            error?: { message?: string };
          }>;
        };
      }
    ).admin;
    const listUsers = adminApi?.listUsers?.bind(adminApi);
    if (!listUsers) {
      return { ok: false, error: "List users is not available. Admin API may not be enabled." };
    }

    const { data, error } = await listUsers({ limit, offset });

    if (error) {
      return { ok: false, error: error.message ?? "Failed to list users." };
    }

    return { ok: true, users: Array.isArray(data) ? data : [] };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to list users.";
    return { ok: false, error: message };
  }
}

export type BanUserResult = { ok: true } | { ok: false; error: string };

/**
 * Ban a user (Neon Auth auth.admin.banUser).
 * Available for users with admin role.
 */
export async function banUserAction(userId: string, reason: string): Promise<BanUserResult> {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, error: "You must be signed in." };
  }

  const isAdmin = session.user.roles?.includes("admin");
  if (!isAdmin) {
    return { ok: false, error: "Admin role required to ban users." };
  }

  const parsed = adminBanUserSchema.safeParse({ userId, reason });
  if (!parsed.success) {
    const first = parsed.error.flatten().fieldErrors;
    const message =
      [first.userId?.[0], first.reason?.[0]].filter(Boolean).join(" ") || "Invalid input.";
    return { ok: false, error: message };
  }

  if (!isNeonAuthConfigured || !neonAuth) {
    return { ok: false, error: "Auth is not configured." };
  }

  try {
    const adminApi = (
      neonAuth as unknown as {
        admin?: {
          banUser?: (opts: { userId: string; reason: string }) => Promise<{
            data?: unknown;
            error?: { message?: string };
          }>;
        };
      }
    ).admin;
    const banUser = adminApi?.banUser?.bind(adminApi);
    if (!banUser) {
      return { ok: false, error: "Ban user is not available. Admin API may not be enabled." };
    }

    const { error } = await banUser({ userId: parsed.data.userId, reason: parsed.data.reason });

    if (error) {
      return { ok: false, error: error.message ?? "Failed to ban user." };
    }

    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to ban user.";
    return { ok: false, error: message };
  }
}

export type SetRoleResult = { ok: true } | { ok: false; error: string };

/**
 * Set a user's role (Neon Auth auth.admin.setRole).
 * Available for users with admin role.
 */
export async function setRoleAction(userId: string, role: string): Promise<SetRoleResult> {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, error: "You must be signed in." };
  }

  const isAdmin = session.user.roles?.includes("admin");
  if (!isAdmin) {
    return { ok: false, error: "Admin role required to set user roles." };
  }

  const parsed = adminSetRoleSchema.safeParse({ userId, role });
  if (!parsed.success) {
    const first = parsed.error.flatten().fieldErrors;
    const message =
      [first.userId?.[0], first.role?.[0]].filter(Boolean).join(" ") || "Invalid input.";
    return { ok: false, error: message };
  }

  if (!isNeonAuthConfigured || !neonAuth) {
    return { ok: false, error: "Auth is not configured." };
  }

  try {
    const adminApi = (
      neonAuth as unknown as {
        admin?: {
          setRole?: (opts: { userId: string; role: string }) => Promise<{
            data?: unknown;
            error?: { message?: string };
          }>;
        };
      }
    ).admin;
    const setRole = adminApi?.setRole?.bind(adminApi);
    if (!setRole) {
      return { ok: false, error: "Set role is not available. Admin API may not be enabled." };
    }

    const { error } = await setRole({ userId: parsed.data.userId, role: parsed.data.role });

    if (error) {
      return { ok: false, error: error.message ?? "Failed to set role." };
    }

    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to set role.";
    return { ok: false, error: message };
  }
}

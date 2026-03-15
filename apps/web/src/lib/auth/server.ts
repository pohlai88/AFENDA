import "server-only";

import { createNeonAuth, type NeonAuth } from "@neondatabase/auth/next/server";

type NeonAdminListUsersInput = {
  query?: {
    searchValue?: string;
    searchField?: string;
    searchOperator?: string;
    offset?: number;
    limit?: number;
  };
};

type NeonOrganization = {
  id: string;
  name?: string;
  slug?: string;
  permissions?: string[];
};

type NeonOrganizationApi = {
  list?: () => Promise<NeonMethodResult<unknown>>;
  setActive?: (input: { organizationId: string }) => Promise<NeonMethodResult<unknown>>;
  setActiveOrganization?: (input: { organizationId: string }) => Promise<NeonMethodResult<unknown>>;
  create?: (input: { name: string; slug?: string }) => Promise<NeonMethodResult<unknown>>;
  update?: (input: {
    organizationId: string;
    name?: string;
    slug?: string;
    metadata?: Record<string, unknown>;
  }) => Promise<NeonMethodResult<unknown>>;
  delete?: (input: { organizationId: string }) => Promise<NeonMethodResult<unknown>>;
  getFullOrganization?: (input: { organizationId: string }) => Promise<NeonMethodResult<unknown>>;
  listMembers?: (input: { organizationId: string }) => Promise<NeonMethodResult<unknown>>;
  inviteMember?: (input: {
    organizationId: string;
    email: string;
    role?: string;
  }) => Promise<NeonMethodResult<unknown>>;
  listInvitations?: (input: { organizationId: string }) => Promise<NeonMethodResult<unknown>>;
  cancelInvitation?: (input: {
    organizationId: string;
    invitationId: string;
  }) => Promise<NeonMethodResult<unknown>>;
  removeMember?: (input: {
    organizationId: string;
    memberId: string;
  }) => Promise<NeonMethodResult<unknown>>;
  updateMemberRole?: (input: {
    organizationId: string;
    memberId: string;
    role: string;
  }) => Promise<NeonMethodResult<unknown>>;
  listUserInvitations?: () => Promise<NeonMethodResult<unknown>>;
  acceptInvitation?: (input: { invitationId: string }) => Promise<NeonMethodResult<unknown>>;
  rejectInvitation?: (input: { invitationId: string }) => Promise<NeonMethodResult<unknown>>;
};

type AdminOperationSessionLike = {
  user?: {
    roles?: string[] | null;
  } | null;
  activeOrganization?: {
    permissions?: string[] | null;
  } | null;
};

export function hasAdminOperationAccess(
  session: AdminOperationSessionLike | null | undefined,
): boolean {
  const roleSet = new Set(session?.user?.roles ?? []);
  if (roleSet.has("admin")) {
    return true;
  }

  const permissionSet = new Set(session?.activeOrganization?.permissions ?? []);
  return permissionSet.has("admin.org.manage");
}

type NeonAdminToggleUserBanInput = {
  userId: string;
  banReason?: string;
  banExpiresIn?: number;
};

type NeonAdminUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  createdAt?: string | Date;
  banned?: boolean;
  banReason?: string | null;
  banExpires?: string | Date | null;
};

type NeonAdminListUsersResult = {
  users: NeonAdminUser[];
  total: number;
};

type NeonMethodResult<TData> = {
  data?: TData;
  error?: {
    message?: string;
  };
};

type NeonAdminApi = {
  listUsers?: (input?: NeonAdminListUsersInput) => Promise<NeonMethodResult<unknown>>;
  getUser?: (input: { userId: string }) => Promise<NeonMethodResult<unknown>>;
  listUserSessions?: (input: {
    userId: string;
    query?: {
      offset?: number;
      limit?: number;
    };
  }) => Promise<NeonMethodResult<unknown>>;
  banUser?: (input: NeonAdminToggleUserBanInput) => Promise<NeonMethodResult<unknown>>;
  unbanUser?: (input: { userId: string }) => Promise<NeonMethodResult<unknown>>;
  impersonateUser?: (input: { userId: string }) => Promise<NeonMethodResult<unknown>>;
  stopImpersonating?: () => Promise<NeonMethodResult<unknown>>;
  setUserPassword?: (input: {
    userId: string;
    newPassword: string;
  }) => Promise<NeonMethodResult<unknown>>;
  setRole?: (input: { userId: string; role: string }) => Promise<NeonMethodResult<unknown>>;
  revokeUserSession?: (input: {
    userId: string;
    sessionId: string;
  }) => Promise<NeonMethodResult<unknown>>;
  revokeUserSessions?: (input: { userId: string }) => Promise<NeonMethodResult<unknown>>;
  removeUser?: (input: { userId: string }) => Promise<NeonMethodResult<unknown>>;
};

type NeonAdminUserSession = {
  id: string;
  userId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt?: string | Date;
  expiresAt?: string | Date;
};

type NeonAdminListUserSessionsResult = {
  sessions: NeonAdminUserSession[];
  total: number;
};

function normalizeBaseUrl(value: string | undefined): string | null {
  if (!value?.trim()) {
    return null;
  }

  return value.trim().replace(/\/+$/, "");
}

function parseSessionDataTtl(value: string | undefined): number | undefined {
  if (!value?.trim()) {
    return undefined;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    return undefined;
  }

  return Math.min(86_400, Math.max(60, parsed));
}

const baseUrl = normalizeBaseUrl(process.env.NEON_AUTH_BASE_URL);
const cookieSecret = process.env.NEON_AUTH_COOKIE_SECRET?.trim() ?? "";
const cookieDomain = process.env.NEON_AUTH_COOKIE_DOMAIN?.trim() || undefined;
const sessionDataTtl = parseSessionDataTtl(process.env.NEON_AUTH_SESSION_TTL);

export const isNeonAuthConfigured = Boolean(baseUrl && cookieSecret.length >= 32);

function createServerAuth(): NeonAuth | null {
  if (!baseUrl || cookieSecret.length < 32) {
    return null;
  }

  return createNeonAuth({
    baseUrl,
    cookies: {
      secret: cookieSecret,
      domain: cookieDomain,
      sessionDataTtl,
    },
  });
}

export const neonServerAuth = createServerAuth();
export const neonServerAuthHandler = neonServerAuth?.handler() ?? null;
export const neonProtectedRouteMiddleware =
  neonServerAuth?.middleware({
    loginUrl: "/auth/sign-in",
  }) ?? null;

export function getNeonServerAuth(): NeonAuth | null {
  return neonServerAuth;
}

function getNeonOrganizationApi(): NeonOrganizationApi | null {
  if (!neonServerAuth) {
    return null;
  }

  const authObject = neonServerAuth as unknown as {
    organization?: NeonOrganizationApi;
    api?: {
      organization?: NeonOrganizationApi;
    };
  };

  return authObject.organization ?? authObject.api?.organization ?? null;
}

function requireNeonServerAuth(): NeonAuth {
  if (!neonServerAuth) {
    throw new Error("Neon Auth is not configured for this environment.");
  }

  return neonServerAuth;
}

function getNeonAdminApi(): NeonAdminApi | null {
  if (!neonServerAuth) {
    return null;
  }

  const authObject = neonServerAuth as unknown as {
    admin?: NeonAdminApi;
    api?: {
      admin?: NeonAdminApi;
    };
  };

  return authObject.admin ?? authObject.api?.admin ?? null;
}

function toErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }

  return fallback;
}

function normalizeAdminUsers(input: unknown): NeonAdminUser[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return input
    .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
    .map((item) => {
      const id = typeof item.id === "string" ? item.id : "";
      const email = typeof item.email === "string" ? item.email : null;
      const name = typeof item.name === "string" ? item.name : null;
      const createdAt =
        typeof item.createdAt === "string" || item.createdAt instanceof Date
          ? item.createdAt
          : undefined;
      const banned = typeof item.banned === "boolean" ? item.banned : false;
      const banReason = typeof item.banReason === "string" ? item.banReason : null;
      const banExpires =
        typeof item.banExpires === "string" || item.banExpires instanceof Date
          ? item.banExpires
          : null;

      return {
        id,
        email,
        name,
        createdAt,
        banned,
        banReason,
        banExpires,
      } satisfies NeonAdminUser;
    })
    .filter((item) => item.id.length > 0);
}

function normalizeAdminListUsersResult(input: unknown): NeonAdminListUsersResult {
  if (!input || typeof input !== "object") {
    return {
      users: [],
      total: 0,
    };
  }

  const record = input as Record<string, unknown>;
  const users = normalizeAdminUsers(record.users);
  const totalRaw = record.total;

  return {
    users,
    total: typeof totalRaw === "number" && Number.isFinite(totalRaw) ? totalRaw : users.length,
  };
}

function normalizeAdminUser(input: unknown): NeonAdminUser | null {
  const users = normalizeAdminUsers([input]);
  return users[0] ?? null;
}

function normalizeOrganizations(input: unknown): NeonOrganization[] {
  if (!Array.isArray(input)) {
    return [];
  }

  const organizations: NeonOrganization[] = [];

  for (const item of input) {
    if (!item || typeof item !== "object") {
      continue;
    }

    const record = item as Record<string, unknown>;
    const id = typeof record.id === "string" ? record.id : "";
    if (!id) {
      continue;
    }

    const normalized: NeonOrganization = { id };

    if (typeof record.name === "string") {
      normalized.name = record.name;
    }

    if (typeof record.slug === "string") {
      normalized.slug = record.slug;
    }

    if (Array.isArray(record.permissions)) {
      normalized.permissions = record.permissions.filter(
        (permission): permission is string => typeof permission === "string",
      );
    }

    organizations.push(normalized);
  }

  return organizations;
}

function normalizeAdminUserSessions(input: unknown): NeonAdminUserSession[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return input
    .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
    .map((item) => {
      const id = typeof item.id === "string" ? item.id : "";
      const userId = typeof item.userId === "string" ? item.userId : null;
      const ipAddress = typeof item.ipAddress === "string" ? item.ipAddress : null;
      const userAgent = typeof item.userAgent === "string" ? item.userAgent : null;
      const createdAt =
        typeof item.createdAt === "string" || item.createdAt instanceof Date
          ? item.createdAt
          : undefined;
      const expiresAt =
        typeof item.expiresAt === "string" || item.expiresAt instanceof Date
          ? item.expiresAt
          : undefined;

      return {
        id,
        userId,
        ipAddress,
        userAgent,
        createdAt,
        expiresAt,
      } satisfies NeonAdminUserSession;
    })
    .filter((item) => item.id.length > 0);
}

function normalizeAdminListUserSessionsResult(input: unknown): NeonAdminListUserSessionsResult {
  if (!input || typeof input !== "object") {
    return {
      sessions: [],
      total: 0,
    };
  }

  const record = input as Record<string, unknown>;
  const sessions = normalizeAdminUserSessions(record.sessions);
  const totalRaw = record.total;

  return {
    sessions,
    total: typeof totalRaw === "number" && Number.isFinite(totalRaw) ? totalRaw : sessions.length,
  };
}

export async function getNeonSession() {
  if (!neonServerAuth) {
    return null;
  }

  const { data, error } = await neonServerAuth.getSession();
  if (error) {
    return null;
  }

  return data ?? null;
}

export async function requestNeonPasswordReset(input: { email: string; redirectTo?: string }) {
  return requireNeonServerAuth().requestPasswordReset(input);
}

export async function resetNeonPassword(input: { newPassword: string; token?: string }) {
  return requireNeonServerAuth().resetPassword(input);
}

export async function sendNeonVerificationEmail(input: { email: string; callbackURL?: string }) {
  return requireNeonServerAuth().sendVerificationEmail(input);
}

export async function verifyNeonEmail(input: {
  query: {
    token: string;
    callbackURL?: string;
  };
}) {
  return requireNeonServerAuth().verifyEmail(input);
}

export async function listNeonAdminUsers(input?: NeonAdminListUsersInput) {
  const admin = getNeonAdminApi();
  if (!admin?.listUsers) {
    return {
      data: null,
      error: {
        message: "Neon Auth admin.listUsers is unavailable.",
      },
    } as const;
  }

  try {
    const response = await admin.listUsers(input);
    if (response.error) {
      return {
        data: null,
        error: {
          message: toErrorMessage(response.error, "Unable to load users."),
        },
      } as const;
    }

    return {
      data: normalizeAdminListUsersResult(response.data),
      error: null,
    } as const;
  } catch (error) {
    return {
      data: null,
      error: {
        message: toErrorMessage(error, "Unable to load users."),
      },
    } as const;
  }
}

export async function getNeonAdminUser(input: { userId: string }) {
  const admin = getNeonAdminApi();
  if (!admin?.getUser) {
    return {
      data: null,
      error: {
        message: "Neon Auth admin.getUser is unavailable.",
      },
    } as const;
  }

  try {
    const response = await admin.getUser(input);
    if (response.error) {
      return {
        data: null,
        error: {
          message: toErrorMessage(response.error, "Unable to load user details."),
        },
      } as const;
    }

    return {
      data: normalizeAdminUser(response.data),
      error: null,
    } as const;
  } catch (error) {
    return {
      data: null,
      error: {
        message: toErrorMessage(error, "Unable to load user details."),
      },
    } as const;
  }
}

export async function listNeonAdminUserSessions(input: {
  userId: string;
  query?: {
    offset?: number;
    limit?: number;
  };
}) {
  const admin = getNeonAdminApi();
  if (!admin?.listUserSessions) {
    return {
      data: null,
      error: {
        message: "Neon Auth admin.listUserSessions is unavailable.",
      },
    } as const;
  }

  try {
    const response = await admin.listUserSessions(input);
    if (response.error) {
      return {
        data: null,
        error: {
          message: toErrorMessage(response.error, "Unable to load user sessions."),
        },
      } as const;
    }

    return {
      data: normalizeAdminListUserSessionsResult(response.data),
      error: null,
    } as const;
  } catch (error) {
    return {
      data: null,
      error: {
        message: toErrorMessage(error, "Unable to load user sessions."),
      },
    } as const;
  }
}

export async function banNeonUser(input: NeonAdminToggleUserBanInput) {
  const admin = getNeonAdminApi();
  if (!admin?.banUser) {
    return {
      data: null,
      error: {
        message: "Neon Auth admin.banUser is unavailable.",
      },
    } as const;
  }

  try {
    const response = await admin.banUser(input);
    if (response.error) {
      return {
        data: null,
        error: {
          message: toErrorMessage(response.error, "Unable to ban user."),
        },
      } as const;
    }

    return {
      data: response.data ?? null,
      error: null,
    } as const;
  } catch (error) {
    return {
      data: null,
      error: {
        message: toErrorMessage(error, "Unable to ban user."),
      },
    } as const;
  }
}

export async function unbanNeonUser(input: { userId: string }) {
  const admin = getNeonAdminApi();
  if (!admin?.unbanUser) {
    return {
      data: null,
      error: {
        message: "Neon Auth admin.unbanUser is unavailable.",
      },
    } as const;
  }

  try {
    const response = await admin.unbanUser(input);
    if (response.error) {
      return {
        data: null,
        error: {
          message: toErrorMessage(response.error, "Unable to unban user."),
        },
      } as const;
    }

    return {
      data: response.data ?? null,
      error: null,
    } as const;
  } catch (error) {
    return {
      data: null,
      error: {
        message: toErrorMessage(error, "Unable to unban user."),
      },
    } as const;
  }
}

export async function impersonateNeonUser(input: { userId: string }) {
  const admin = getNeonAdminApi();
  if (!admin?.impersonateUser) {
    return {
      data: null,
      error: {
        message: "Neon Auth admin.impersonateUser is unavailable.",
      },
    } as const;
  }

  try {
    const response = await admin.impersonateUser(input);
    if (response.error) {
      return {
        data: null,
        error: {
          message: toErrorMessage(response.error, "Unable to impersonate user."),
        },
      } as const;
    }

    return {
      data: response.data ?? null,
      error: null,
    } as const;
  } catch (error) {
    return {
      data: null,
      error: {
        message: toErrorMessage(error, "Unable to impersonate user."),
      },
    } as const;
  }
}

export async function stopNeonImpersonation() {
  const admin = getNeonAdminApi();
  if (!admin?.stopImpersonating) {
    return {
      data: null,
      error: {
        message: "Neon Auth admin.stopImpersonating is unavailable.",
      },
    } as const;
  }

  try {
    const response = await admin.stopImpersonating();
    if (response.error) {
      return {
        data: null,
        error: {
          message: toErrorMessage(response.error, "Unable to stop impersonation."),
        },
      } as const;
    }

    return {
      data: response.data ?? null,
      error: null,
    } as const;
  } catch (error) {
    return {
      data: null,
      error: {
        message: toErrorMessage(error, "Unable to stop impersonation."),
      },
    } as const;
  }
}

export async function setNeonUserPassword(input: { userId: string; newPassword: string }) {
  const admin = getNeonAdminApi();
  if (!admin?.setUserPassword) {
    return {
      data: null,
      error: {
        message: "Neon Auth admin.setUserPassword is unavailable.",
      },
    } as const;
  }

  try {
    const response = await admin.setUserPassword(input);
    if (response.error) {
      return {
        data: null,
        error: {
          message: toErrorMessage(response.error, "Unable to set user password."),
        },
      } as const;
    }

    return {
      data: response.data ?? null,
      error: null,
    } as const;
  } catch (error) {
    return {
      data: null,
      error: {
        message: toErrorMessage(error, "Unable to set user password."),
      },
    } as const;
  }
}

export async function setNeonUserRole(input: { userId: string; role: string }) {
  const admin = getNeonAdminApi();
  if (!admin?.setRole) {
    return {
      data: null,
      error: {
        message: "Neon Auth admin.setRole is unavailable.",
      },
    } as const;
  }

  try {
    const response = await admin.setRole(input);
    if (response.error) {
      return {
        data: null,
        error: {
          message: toErrorMessage(response.error, "Unable to set user role."),
        },
      } as const;
    }

    return {
      data: response.data ?? null,
      error: null,
    } as const;
  } catch (error) {
    return {
      data: null,
      error: {
        message: toErrorMessage(error, "Unable to set user role."),
      },
    } as const;
  }
}

export async function revokeNeonUserSession(input: { userId: string; sessionId: string }) {
  const admin = getNeonAdminApi();
  if (!admin?.revokeUserSession) {
    return {
      data: null,
      error: {
        message: "Neon Auth admin.revokeUserSession is unavailable.",
      },
    } as const;
  }

  try {
    const response = await admin.revokeUserSession(input);
    if (response.error) {
      return {
        data: null,
        error: {
          message: toErrorMessage(response.error, "Unable to revoke user session."),
        },
      } as const;
    }

    return {
      data: response.data ?? null,
      error: null,
    } as const;
  } catch (error) {
    return {
      data: null,
      error: {
        message: toErrorMessage(error, "Unable to revoke user session."),
      },
    } as const;
  }
}

export async function revokeAllNeonUserSessions(input: { userId: string }) {
  const admin = getNeonAdminApi();
  if (!admin?.revokeUserSessions) {
    return {
      data: null,
      error: {
        message: "Neon Auth admin.revokeUserSessions is unavailable.",
      },
    } as const;
  }

  try {
    const response = await admin.revokeUserSessions(input);
    if (response.error) {
      return {
        data: null,
        error: {
          message: toErrorMessage(response.error, "Unable to revoke user sessions."),
        },
      } as const;
    }

    return {
      data: response.data ?? null,
      error: null,
    } as const;
  } catch (error) {
    return {
      data: null,
      error: {
        message: toErrorMessage(error, "Unable to revoke user sessions."),
      },
    } as const;
  }
}

export async function removeNeonUser(input: { userId: string }) {
  const admin = getNeonAdminApi();
  if (!admin?.removeUser) {
    return {
      data: null,
      error: {
        message: "Neon Auth admin.removeUser is unavailable.",
      },
    } as const;
  }

  try {
    const response = await admin.removeUser(input);
    if (response.error) {
      return {
        data: null,
        error: {
          message: toErrorMessage(response.error, "Unable to remove user."),
        },
      } as const;
    }

    return {
      data: response.data ?? null,
      error: null,
    } as const;
  } catch (error) {
    return {
      data: null,
      error: {
        message: toErrorMessage(error, "Unable to remove user."),
      },
    } as const;
  }
}

export async function getNeonAccessToken() {
  const authInstance = requireNeonServerAuth() as NeonAuth & {
    getAccessToken?: () => Promise<NeonMethodResult<unknown>>;
  };

  if (!authInstance.getAccessToken) {
    return {
      data: null,
      error: { message: "Neon Auth getAccessToken is unavailable." },
    } as const;
  }

  try {
    const response = await authInstance.getAccessToken();
    return response.error
      ? {
          data: null,
          error: { message: toErrorMessage(response.error, "Unable to fetch access token.") },
        }
      : { data: response.data ?? null, error: null };
  } catch (error) {
    return {
      data: null,
      error: { message: toErrorMessage(error, "Unable to fetch access token.") },
    } as const;
  }
}

export async function refreshNeonToken() {
  const authInstance = requireNeonServerAuth() as NeonAuth & {
    refreshToken?: () => Promise<NeonMethodResult<unknown>>;
  };

  if (!authInstance.refreshToken) {
    return {
      data: null,
      error: { message: "Neon Auth refreshToken is unavailable." },
    } as const;
  }

  try {
    const response = await authInstance.refreshToken();
    return response.error
      ? {
          data: null,
          error: { message: toErrorMessage(response.error, "Unable to refresh token.") },
        }
      : { data: response.data ?? null, error: null };
  } catch (error) {
    return {
      data: null,
      error: { message: toErrorMessage(error, "Unable to refresh token.") },
    } as const;
  }
}

export async function listNeonSessions() {
  const authInstance = requireNeonServerAuth() as NeonAuth & {
    listSessions?: () => Promise<NeonMethodResult<unknown>>;
  };

  if (!authInstance.listSessions) {
    return {
      data: null,
      error: { message: "Neon Auth listSessions is unavailable." },
    } as const;
  }

  try {
    const response = await authInstance.listSessions();
    return response.error
      ? {
          data: null,
          error: { message: toErrorMessage(response.error, "Unable to list sessions.") },
        }
      : { data: response.data ?? [], error: null };
  } catch (error) {
    return {
      data: null,
      error: { message: toErrorMessage(error, "Unable to list sessions.") },
    } as const;
  }
}

export async function revokeNeonSession(input: { token: string }) {
  const authInstance = requireNeonServerAuth() as NeonAuth & {
    revokeSession?: (payload: { token: string }) => Promise<NeonMethodResult<unknown>>;
  };

  if (!authInstance.revokeSession) {
    return {
      data: null,
      error: { message: "Neon Auth revokeSession is unavailable." },
    } as const;
  }

  try {
    const response = await authInstance.revokeSession(input);
    return response.error
      ? {
          data: null,
          error: { message: toErrorMessage(response.error, "Unable to revoke session.") },
        }
      : { data: response.data ?? null, error: null };
  } catch (error) {
    return {
      data: null,
      error: { message: toErrorMessage(error, "Unable to revoke session.") },
    } as const;
  }
}

export async function revokeNeonSessions() {
  const authInstance = requireNeonServerAuth() as NeonAuth & {
    revokeSessions?: () => Promise<NeonMethodResult<unknown>>;
  };

  if (!authInstance.revokeSessions) {
    return {
      data: null,
      error: { message: "Neon Auth revokeSessions is unavailable." },
    } as const;
  }

  try {
    const response = await authInstance.revokeSessions();
    return response.error
      ? {
          data: null,
          error: { message: toErrorMessage(response.error, "Unable to revoke sessions.") },
        }
      : { data: response.data ?? null, error: null };
  } catch (error) {
    return {
      data: null,
      error: { message: toErrorMessage(error, "Unable to revoke sessions.") },
    } as const;
  }
}

export async function revokeNeonOtherSessions() {
  const authInstance = requireNeonServerAuth() as NeonAuth & {
    revokeOtherSessions?: () => Promise<NeonMethodResult<unknown>>;
  };

  if (!authInstance.revokeOtherSessions) {
    return {
      data: null,
      error: { message: "Neon Auth revokeOtherSessions is unavailable." },
    } as const;
  }

  try {
    const response = await authInstance.revokeOtherSessions();
    return response.error
      ? {
          data: null,
          error: { message: toErrorMessage(response.error, "Unable to revoke other sessions.") },
        }
      : { data: response.data ?? null, error: null };
  } catch (error) {
    return {
      data: null,
      error: { message: toErrorMessage(error, "Unable to revoke other sessions.") },
    } as const;
  }
}

export async function listNeonAccounts() {
  const authInstance = requireNeonServerAuth() as NeonAuth & {
    listAccounts?: () => Promise<NeonMethodResult<unknown>>;
  };

  if (!authInstance.listAccounts) {
    return {
      data: null,
      error: { message: "Neon Auth listAccounts is unavailable." },
    } as const;
  }

  try {
    const response = await authInstance.listAccounts();
    return response.error
      ? {
          data: null,
          error: { message: toErrorMessage(response.error, "Unable to list accounts.") },
        }
      : { data: response.data ?? [], error: null };
  } catch (error) {
    return {
      data: null,
      error: { message: toErrorMessage(error, "Unable to list accounts.") },
    } as const;
  }
}

export async function getNeonAccountInfo() {
  const authInstance = requireNeonServerAuth() as NeonAuth & {
    accountInfo?: () => Promise<NeonMethodResult<unknown>>;
  };

  if (!authInstance.accountInfo) {
    return {
      data: null,
      error: { message: "Neon Auth accountInfo is unavailable." },
    } as const;
  }

  try {
    const response = await authInstance.accountInfo();
    return response.error
      ? {
          data: null,
          error: { message: toErrorMessage(response.error, "Unable to load account info.") },
        }
      : { data: response.data ?? null, error: null };
  } catch (error) {
    return {
      data: null,
      error: { message: toErrorMessage(error, "Unable to load account info.") },
    } as const;
  }
}

export async function updateNeonUser(input: { name?: string; image?: string }) {
  const authInstance = requireNeonServerAuth() as NeonAuth & {
    updateUser?: (payload: { name?: string; image?: string }) => Promise<NeonMethodResult<unknown>>;
  };

  if (!authInstance.updateUser) {
    return {
      data: null,
      error: { message: "Neon Auth updateUser is unavailable." },
    } as const;
  }

  try {
    const response = await authInstance.updateUser(input);
    return response.error
      ? {
          data: null,
          error: { message: toErrorMessage(response.error, "Unable to update user profile.") },
        }
      : { data: response.data ?? null, error: null };
  } catch (error) {
    return {
      data: null,
      error: { message: toErrorMessage(error, "Unable to update user profile.") },
    } as const;
  }
}

export async function changeNeonPassword(input: {
  currentPassword: string;
  newPassword: string;
  revokeOtherSessions?: boolean;
}) {
  const authInstance = requireNeonServerAuth() as NeonAuth & {
    changePassword?: (payload: {
      currentPassword: string;
      newPassword: string;
      revokeOtherSessions?: boolean;
    }) => Promise<NeonMethodResult<unknown>>;
  };

  if (!authInstance.changePassword) {
    return {
      data: null,
      error: { message: "Neon Auth changePassword is unavailable." },
    } as const;
  }

  try {
    const response = await authInstance.changePassword(input);
    return response.error
      ? {
          data: null,
          error: { message: toErrorMessage(response.error, "Unable to change password.") },
        }
      : { data: response.data ?? null, error: null };
  } catch (error) {
    return {
      data: null,
      error: { message: toErrorMessage(error, "Unable to change password.") },
    } as const;
  }
}

export async function changeNeonEmail(input: { newEmail: string; callbackURL?: string }) {
  const authInstance = requireNeonServerAuth() as NeonAuth & {
    changeEmail?: (payload: {
      newEmail: string;
      callbackURL?: string;
    }) => Promise<NeonMethodResult<unknown>>;
  };

  if (!authInstance.changeEmail) {
    return {
      data: null,
      error: { message: "Neon Auth changeEmail is unavailable." },
    } as const;
  }

  try {
    const response = await authInstance.changeEmail(input);
    return response.error
      ? {
          data: null,
          error: { message: toErrorMessage(response.error, "Unable to change account email.") },
        }
      : { data: response.data ?? null, error: null };
  } catch (error) {
    return {
      data: null,
      error: { message: toErrorMessage(error, "Unable to change account email.") },
    } as const;
  }
}

export async function deleteNeonUser() {
  const authInstance = requireNeonServerAuth() as NeonAuth & {
    deleteUser?: () => Promise<NeonMethodResult<unknown>>;
  };

  if (!authInstance.deleteUser) {
    return {
      data: null,
      error: { message: "Neon Auth deleteUser is unavailable." },
    } as const;
  }

  try {
    const response = await authInstance.deleteUser();
    return response.error
      ? {
          data: null,
          error: { message: toErrorMessage(response.error, "Unable to delete current user.") },
        }
      : { data: response.data ?? null, error: null };
  } catch (error) {
    return {
      data: null,
      error: { message: toErrorMessage(error, "Unable to delete current user.") },
    } as const;
  }
}

export async function listNeonOrganizations() {
  const organizationApi = getNeonOrganizationApi();
  if (!organizationApi?.list) {
    return {
      data: [] as NeonOrganization[],
      error: null,
    } as const;
  }

  try {
    const response = await organizationApi.list();
    return response.error
      ? {
          data: [] as NeonOrganization[],
          error: { message: toErrorMessage(response.error, "Unable to list organizations.") },
        }
      : { data: normalizeOrganizations(response.data), error: null };
  } catch (error) {
    return {
      data: [] as NeonOrganization[],
      error: { message: toErrorMessage(error, "Unable to list organizations.") },
    } as const;
  }
}

export async function createNeonOrganization(input: { name: string; slug?: string }) {
  const organizationApi = getNeonOrganizationApi();
  if (!organizationApi?.create) {
    return {
      data: null,
      error: { message: "Neon Auth organization.create is unavailable." },
    } as const;
  }

  try {
    const response = await organizationApi.create(input);
    return response.error
      ? {
          data: null,
          error: { message: toErrorMessage(response.error, "Unable to create organization.") },
        }
      : { data: response.data ?? null, error: null };
  } catch (error) {
    return {
      data: null,
      error: { message: toErrorMessage(error, "Unable to create organization.") },
    } as const;
  }
}

export async function updateNeonOrganization(input: {
  organizationId: string;
  name?: string;
  slug?: string;
  metadata?: Record<string, unknown>;
}) {
  const organizationApi = getNeonOrganizationApi();
  if (!organizationApi?.update) {
    return {
      data: null,
      error: { message: "Neon Auth organization.update is unavailable." },
    } as const;
  }

  try {
    const response = await organizationApi.update(input);
    return response.error
      ? {
          data: null,
          error: { message: toErrorMessage(response.error, "Unable to update organization.") },
        }
      : { data: response.data ?? null, error: null };
  } catch (error) {
    return {
      data: null,
      error: { message: toErrorMessage(error, "Unable to update organization.") },
    } as const;
  }
}

export async function deleteNeonOrganization(input: { organizationId: string }) {
  const organizationApi = getNeonOrganizationApi();
  if (!organizationApi?.delete) {
    return {
      data: null,
      error: { message: "Neon Auth organization.delete is unavailable." },
    } as const;
  }

  try {
    const response = await organizationApi.delete(input);
    return response.error
      ? {
          data: null,
          error: { message: toErrorMessage(response.error, "Unable to delete organization.") },
        }
      : { data: response.data ?? null, error: null };
  } catch (error) {
    return {
      data: null,
      error: { message: toErrorMessage(error, "Unable to delete organization.") },
    } as const;
  }
}

export async function getNeonFullOrganization(input: { organizationId: string }) {
  const organizationApi = getNeonOrganizationApi();
  if (!organizationApi?.getFullOrganization) {
    return {
      data: null,
      error: { message: "Neon Auth organization.getFullOrganization is unavailable." },
    } as const;
  }

  try {
    const response = await organizationApi.getFullOrganization(input);
    return response.error
      ? {
          data: null,
          error: {
            message: toErrorMessage(response.error, "Unable to load full organization details."),
          },
        }
      : { data: response.data ?? null, error: null };
  } catch (error) {
    return {
      data: null,
      error: { message: toErrorMessage(error, "Unable to load full organization details.") },
    } as const;
  }
}

export async function listNeonOrganizationMembers(input: { organizationId: string }) {
  const organizationApi = getNeonOrganizationApi();
  if (!organizationApi?.listMembers) {
    return {
      data: [] as unknown[],
      error: null,
    } as const;
  }

  try {
    const response = await organizationApi.listMembers(input);
    return response.error
      ? {
          data: [] as unknown[],
          error: {
            message: toErrorMessage(response.error, "Unable to list organization members."),
          },
        }
      : { data: Array.isArray(response.data) ? response.data : [], error: null };
  } catch (error) {
    return {
      data: [] as unknown[],
      error: { message: toErrorMessage(error, "Unable to list organization members.") },
    } as const;
  }
}

export async function inviteNeonOrganizationMember(input: {
  organizationId: string;
  email: string;
  role?: string;
}) {
  const organizationApi = getNeonOrganizationApi();
  if (!organizationApi?.inviteMember) {
    return {
      data: null,
      error: { message: "Neon Auth organization.inviteMember is unavailable." },
    } as const;
  }

  try {
    const response = await organizationApi.inviteMember(input);
    return response.error
      ? {
          data: null,
          error: {
            message: toErrorMessage(response.error, "Unable to invite organization member."),
          },
        }
      : { data: response.data ?? null, error: null };
  } catch (error) {
    return {
      data: null,
      error: { message: toErrorMessage(error, "Unable to invite organization member.") },
    } as const;
  }
}

export async function listNeonOrganizationInvitations(input: { organizationId: string }) {
  const organizationApi = getNeonOrganizationApi();
  if (!organizationApi?.listInvitations) {
    return {
      data: [] as unknown[],
      error: null,
    } as const;
  }

  try {
    const response = await organizationApi.listInvitations(input);
    return response.error
      ? {
          data: [] as unknown[],
          error: {
            message: toErrorMessage(response.error, "Unable to list organization invitations."),
          },
        }
      : { data: Array.isArray(response.data) ? response.data : [], error: null };
  } catch (error) {
    return {
      data: [] as unknown[],
      error: { message: toErrorMessage(error, "Unable to list organization invitations.") },
    } as const;
  }
}

export async function cancelNeonOrganizationInvitation(input: {
  organizationId: string;
  invitationId: string;
}) {
  const organizationApi = getNeonOrganizationApi();
  if (!organizationApi?.cancelInvitation) {
    return {
      data: null,
      error: { message: "Neon Auth organization.cancelInvitation is unavailable." },
    } as const;
  }

  try {
    const response = await organizationApi.cancelInvitation(input);
    return response.error
      ? {
          data: null,
          error: {
            message: toErrorMessage(response.error, "Unable to cancel organization invitation."),
          },
        }
      : { data: response.data ?? null, error: null };
  } catch (error) {
    return {
      data: null,
      error: { message: toErrorMessage(error, "Unable to cancel organization invitation.") },
    } as const;
  }
}

export async function removeNeonOrganizationMember(input: {
  organizationId: string;
  memberId: string;
}) {
  const organizationApi = getNeonOrganizationApi();
  if (!organizationApi?.removeMember) {
    return {
      data: null,
      error: { message: "Neon Auth organization.removeMember is unavailable." },
    } as const;
  }

  try {
    const response = await organizationApi.removeMember(input);
    return response.error
      ? {
          data: null,
          error: {
            message: toErrorMessage(response.error, "Unable to remove organization member."),
          },
        }
      : { data: response.data ?? null, error: null };
  } catch (error) {
    return {
      data: null,
      error: { message: toErrorMessage(error, "Unable to remove organization member.") },
    } as const;
  }
}

export async function updateNeonOrganizationMemberRole(input: {
  organizationId: string;
  memberId: string;
  role: string;
}) {
  const organizationApi = getNeonOrganizationApi();
  if (!organizationApi?.updateMemberRole) {
    return {
      data: null,
      error: { message: "Neon Auth organization.updateMemberRole is unavailable." },
    } as const;
  }

  try {
    const response = await organizationApi.updateMemberRole(input);
    return response.error
      ? {
          data: null,
          error: {
            message: toErrorMessage(response.error, "Unable to update organization member role."),
          },
        }
      : { data: response.data ?? null, error: null };
  } catch (error) {
    return {
      data: null,
      error: { message: toErrorMessage(error, "Unable to update organization member role.") },
    } as const;
  }
}

export async function listNeonUserInvitations() {
  const organizationApi = getNeonOrganizationApi();
  if (!organizationApi?.listUserInvitations) {
    return {
      data: [] as unknown[],
      error: null,
    } as const;
  }

  try {
    const response = await organizationApi.listUserInvitations();
    return response.error
      ? {
          data: [] as unknown[],
          error: {
            message: toErrorMessage(
              response.error,
              "Unable to list user organization invitations.",
            ),
          },
        }
      : { data: Array.isArray(response.data) ? response.data : [], error: null };
  } catch (error) {
    return {
      data: [] as unknown[],
      error: { message: toErrorMessage(error, "Unable to list user organization invitations.") },
    } as const;
  }
}

export async function acceptNeonOrganizationInvitation(input: { invitationId: string }) {
  const organizationApi = getNeonOrganizationApi();
  if (!organizationApi?.acceptInvitation) {
    return {
      data: null,
      error: { message: "Neon Auth organization.acceptInvitation is unavailable." },
    } as const;
  }

  try {
    const response = await organizationApi.acceptInvitation(input);
    return response.error
      ? {
          data: null,
          error: {
            message: toErrorMessage(response.error, "Unable to accept organization invitation."),
          },
        }
      : { data: response.data ?? null, error: null };
  } catch (error) {
    return {
      data: null,
      error: { message: toErrorMessage(error, "Unable to accept organization invitation.") },
    } as const;
  }
}

export async function rejectNeonOrganizationInvitation(input: { invitationId: string }) {
  const organizationApi = getNeonOrganizationApi();
  if (!organizationApi?.rejectInvitation) {
    return {
      data: null,
      error: { message: "Neon Auth organization.rejectInvitation is unavailable." },
    } as const;
  }

  try {
    const response = await organizationApi.rejectInvitation(input);
    return response.error
      ? {
          data: null,
          error: {
            message: toErrorMessage(response.error, "Unable to reject organization invitation."),
          },
        }
      : { data: response.data ?? null, error: null };
  } catch (error) {
    return {
      data: null,
      error: { message: toErrorMessage(error, "Unable to reject organization invitation.") },
    } as const;
  }
}

export async function setNeonActiveOrganization(input: { organizationId: string }) {
  const organizationApi = getNeonOrganizationApi();
  const setActive = organizationApi?.setActive ?? organizationApi?.setActiveOrganization;

  if (!setActive) {
    return {
      data: null,
      error: { message: "Neon Auth setActive organization method is unavailable." },
    } as const;
  }

  try {
    const response = await setActive(input);
    return response.error
      ? {
          data: null,
          error: { message: toErrorMessage(response.error, "Unable to set active organization.") },
        }
      : { data: response.data ?? null, error: null };
  } catch (error) {
    return {
      data: null,
      error: { message: toErrorMessage(error, "Unable to set active organization.") },
    } as const;
  }
}

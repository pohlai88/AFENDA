type AdminOperationSessionLike = {
  user?: {
    id?: string | null;
    email?: string | null;
    roles?: string[] | null;
  } | null;
  activeOrganization?: {
    permissions?: string[] | null;
  } | null;
};

export const AdminOperation = {
  LIST_USERS: "LIST_USERS",
  READ_USER: "READ_USER",
  REMOVE_USER: "REMOVE_USER",
  BAN_USER: "BAN_USER",
  UNBAN_USER: "UNBAN_USER",
  SET_USER_PASSWORD: "SET_USER_PASSWORD",
  SET_USER_ROLE: "SET_USER_ROLE",
  START_IMPERSONATION: "START_IMPERSONATION",
  STOP_IMPERSONATION: "STOP_IMPERSONATION",
  LIST_USER_SESSIONS: "LIST_USER_SESSIONS",
  REVOKE_USER_SESSION: "REVOKE_USER_SESSION",
  REVOKE_USER_SESSIONS: "REVOKE_USER_SESSIONS",
} as const;

export type AdminOperation = (typeof AdminOperation)[keyof typeof AdminOperation];

const AdminOperationPermission = {
  [AdminOperation.LIST_USERS]: "admin.user.list",
  [AdminOperation.READ_USER]: "admin.user.read",
  [AdminOperation.REMOVE_USER]: "admin.user.remove",
  [AdminOperation.BAN_USER]: "admin.user.ban",
  [AdminOperation.UNBAN_USER]: "admin.user.unban",
  [AdminOperation.SET_USER_PASSWORD]: "admin.user.password.set",
  [AdminOperation.SET_USER_ROLE]: "admin.user.role.set",
  [AdminOperation.START_IMPERSONATION]: "admin.user.impersonate.start",
  [AdminOperation.STOP_IMPERSONATION]: "admin.user.impersonate.stop",
  [AdminOperation.LIST_USER_SESSIONS]: "admin.user.session.read",
  [AdminOperation.REVOKE_USER_SESSION]: "admin.user.session.revoke",
  [AdminOperation.REVOKE_USER_SESSIONS]: "admin.user.session.revoke",
} as const satisfies Record<AdminOperation, string>;

export function getAdminOperationRequiredPermission(operation: AdminOperation): string {
  return AdminOperationPermission[operation];
}

export function buildAdminAuditMetadata(
  operation: AdminOperation,
  metadata: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    operation,
    requiredPermission: getAdminOperationRequiredPermission(operation),
    ...metadata,
  };
}

export function hasAdminOperationAccess(
  session: AdminOperationSessionLike | null | undefined,
  operation: AdminOperation,
): boolean {
  const roleSet = new Set(session?.user?.roles ?? []);
  if (roleSet.has("admin")) {
    return true;
  }

  const permissionSet = new Set(session?.activeOrganization?.permissions ?? []);
  if (permissionSet.has("admin.org.manage")) {
    return true;
  }

  return permissionSet.has(getAdminOperationRequiredPermission(operation));
}

export type AuthorizedAdminOperationSession = {
  user: {
    id: string;
    email: string;
    roles?: string[] | null;
  };
  activeOrganization?: {
    permissions?: string[] | null;
  } | null;
};

export function hasAuthorizedAdminOperationSession(
  session: AdminOperationSessionLike | null | undefined,
  operation: AdminOperation,
): session is AuthorizedAdminOperationSession {
  if (!hasAdminOperationAccess(session, operation)) {
    return false;
  }

  return Boolean(
    session?.user &&
      typeof session.user.id === "string" &&
      session.user.id.length > 0 &&
      typeof session.user.email === "string" &&
      session.user.email.length > 0,
  );
}

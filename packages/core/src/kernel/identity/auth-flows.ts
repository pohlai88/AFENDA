/**
 * Auth flow services: self-service sign-up, password reset, and invitation-only portals.
 */
import { createHash, randomBytes } from "node:crypto";
import { and, eq, isNull, sql } from "drizzle-orm";
import type { DbClient } from "@afenda/db";
import {
  authPasswordResetToken,
  authPortalInvitation,
  authSessionGrant,
  iamPermission,
  iamPrincipal,
  iamPrincipalMfa,
  iamPrincipalRole,
  iamRole,
  iamRolePermission,
  membership,
  organization,
  party,
  partyRole,
  person,
} from "@afenda/db";
import {
  IAM_ACCOUNT_LOCKED,
  IAM_CREDENTIALS_INVALID,
  IAM_EMAIL_ALREADY_REGISTERED,
  IAM_PORTAL_ACCESS_DENIED,
  IAM_PORTAL_INVITATION_EXPIRED,
  IAM_PORTAL_INVITATION_INVALID,
  IAM_MFA_NOT_IMPLEMENTED,
  IAM_PORTAL_INVITATION_REQUIRED,
  IAM_RESET_TOKEN_EXPIRED,
  IAM_RESET_TOKEN_INVALID,
  type PasswordResetDelivery,
  type PortalType,
} from "@afenda/contracts";
import { hashPassword, verifyPassword } from "./password";
import {
  checkAccountLockout,
  clearFailedLoginAttempts,
  recordLoginAttempt,
  formatLockoutMessage,
} from "./account-lockout";

function createToken(): string {
  return randomBytes(32).toString("hex");
}

function createResetCode(): string {
  // Generates a cryptographically strong 6-digit code.
  return String(randomBytes(3).readUIntBE(0, 3) % 1_000_000).padStart(6, "0");
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function slugifyCompanyName(name: string): string {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return base || "org";
}

async function resolveUniqueOrgSlug(db: DbClient, preferredBase: string): Promise<string> {
  let candidate = preferredBase;
  let suffix = 1;

  // Keep trying deterministic suffixes until a unique slug is found.
  // Expected attempts: 1-2 in normal usage.
  for (;;) {
    const rows = await db
      .select({ id: organization.id })
      .from(organization)
      .where(eq(organization.slug, candidate))
      .limit(1);

    if (rows.length === 0) {
      return candidate;
    }

    suffix += 1;
    candidate = `${preferredBase}-${suffix}`;
  }
}

export type SignupResult =
  | { ok: true; principalId: string; email: string; orgSlug: string }
  | { ok: false; error: string };

export async function signUpSelfService(
  db: DbClient,
  input: { fullName: string; companyName: string; email: string; password: string },
): Promise<SignupResult> {
  const normalizedEmail = normalizeEmail(input.email);

  const existingPrincipal = await db
    .select({ id: iamPrincipal.id })
    .from(iamPrincipal)
    .where(eq(iamPrincipal.email, normalizedEmail))
    .limit(1);

  if (existingPrincipal.length > 0) {
    return { ok: false, error: IAM_EMAIL_ALREADY_REGISTERED };
  }

  const slugBase = slugifyCompanyName(input.companyName);
  const orgSlug = await resolveUniqueOrgSlug(db, slugBase);
  const passwordHash = await hashPassword(input.password);

  const result = await db.transaction(async (tx) => {
    const [personPartyRow] = await tx
      .insert(party)
      .values({ kind: "person" })
      .returning({ id: party.id });

    const personPartyId = personPartyRow?.id;
    if (!personPartyId) throw new Error("Failed to create person party");

    const [personRow] = await tx
      .insert(person)
      .values({
        id: personPartyId,
        email: normalizedEmail,
        name: input.fullName.trim(),
      })
      .returning({ id: person.id });

    const personId = personRow?.id;
    if (!personId) throw new Error("Failed to create person");

    const [principalRow] = await tx
      .insert(iamPrincipal)
      .values({
        personId,
        kind: "user",
        email: normalizedEmail,
        passwordHash,
      })
      .returning({ id: iamPrincipal.id, email: iamPrincipal.email });

    if (!principalRow?.id || !principalRow.email) {
      throw new Error("Failed to create principal");
    }

    const [orgPartyRow] = await tx
      .insert(party)
      .values({ kind: "organization" })
      .returning({ id: party.id });

    const orgPartyId = orgPartyRow?.id;
    if (!orgPartyId) throw new Error("Failed to create organization party");

    const [orgRow] = await tx
      .insert(organization)
      .values({
        id: orgPartyId,
        slug: orgSlug,
        name: input.companyName.trim(),
      })
      .returning({ id: organization.id, slug: organization.slug });

    if (!orgRow?.id) {
      throw new Error("Failed to create organization");
    }

    const [partyRoleRow] = await tx
      .insert(partyRole)
      .values({
        orgId: orgRow.id,
        partyId: personId,
        roleType: "employee",
      })
      .returning({ id: partyRole.id });

    if (!partyRoleRow?.id) {
      throw new Error("Failed to create membership role");
    }

    await tx.insert(membership).values({
      principalId: principalRow.id,
      partyRoleId: partyRoleRow.id,
    });

    const [adminRole] = await tx
      .insert(iamRole)
      .values({
        orgId: orgRow.id,
        key: "org_admin",
        name: "Organization Admin",
      })
      .returning({ id: iamRole.id });

    if (!adminRole?.id) {
      throw new Error("Failed to create org admin role");
    }

    const permissionRows = await tx
      .select({ id: iamPermission.id })
      .from(iamPermission);

    if (permissionRows.length > 0) {
      await tx.insert(iamRolePermission).values(
        permissionRows.map((permission) => ({
          roleId: adminRole.id,
          permissionId: permission.id,
        })),
      );
    }

    await tx.insert(iamPrincipalRole).values({
      orgId: orgRow.id,
      principalId: principalRow.id,
      roleId: adminRole.id,
    });

    return {
      principalId: principalRow.id,
      email: principalRow.email,
      orgSlug: orgRow.slug,
    };
  });

  return { ok: true, ...result };
}

export type RequestPasswordResetResult = {
  accepted: true;
  email: string;
  token: string | null;
  delivery: Exclude<PasswordResetDelivery, "auto">;
};

export async function requestPasswordReset(
  db: DbClient,
  input: { email: string; delivery?: Exclude<PasswordResetDelivery, "auto"> },
): Promise<RequestPasswordResetResult> {
  const normalizedEmail = normalizeEmail(input.email);
  const delivery = input.delivery ?? "link";

  const [principalRow] = await db
    .select({ id: iamPrincipal.id, email: iamPrincipal.email })
    .from(iamPrincipal)
    .where(eq(iamPrincipal.email, normalizedEmail))
    .limit(1);

  if (!principalRow?.id || !principalRow.email) {
    // Avoid email-enumeration leakage.
    return { accepted: true, email: normalizedEmail, token: null, delivery };
  }

  const token = delivery === "code" ? createResetCode() : createToken();
  const tokenHash = hashToken(token);
  const expiresAt = delivery === "code"
    ? sql`now() + interval '10 minutes'`
    : sql`now() + interval '30 minutes'`;

  await db.transaction(async (tx) => {
    await tx
      .update(authPasswordResetToken)
      .set({ usedAt: sql`now()` })
      .where(and(eq(authPasswordResetToken.principalId, principalRow.id), isNull(authPasswordResetToken.usedAt)));

    await tx.insert(authPasswordResetToken).values({
      principalId: principalRow.id,
      tokenHash,
      expiresAt,
    });
  });

  return { accepted: true, email: principalRow.email, token, delivery };
}

export type VerifyResetTokenResult =
  | { ok: true; email: string; expiresAt?: string }
  | { ok: false; error: string };

export async function verifyResetToken(
  db: DbClient,
  input: { token: string; email?: string },
): Promise<VerifyResetTokenResult> {
  const tokenHash = hashToken(input.token);
  const isCode = /^\d{6}$/.test(input.token);

  const [tokenRow] = await db
    .select({
      id: authPasswordResetToken.id,
      principalId: authPasswordResetToken.principalId,
      usedAt: authPasswordResetToken.usedAt,
      expiresAt: authPasswordResetToken.expiresAt,
      isExpired: sql<boolean>`${authPasswordResetToken.expiresAt} <= now()`,
    })
    .from(authPasswordResetToken)
    .where(eq(authPasswordResetToken.tokenHash, tokenHash))
    .limit(1);

  if (!tokenRow?.id || !tokenRow.principalId) {
    return { ok: false, error: IAM_RESET_TOKEN_INVALID };
  }

  if (isCode) {
    const normalizedEmail = normalizeEmail(input.email ?? "");
    if (!normalizedEmail) {
      return { ok: false, error: IAM_RESET_TOKEN_INVALID };
    }

    const [principalRow] = await db
      .select({ email: iamPrincipal.email })
      .from(iamPrincipal)
      .where(eq(iamPrincipal.id, tokenRow.principalId))
      .limit(1);

    if (!principalRow?.email || normalizeEmail(principalRow.email) !== normalizedEmail) {
      return { ok: false, error: IAM_RESET_TOKEN_INVALID };
    }
  }

  if (tokenRow.usedAt) {
    return { ok: false, error: IAM_RESET_TOKEN_INVALID };
  }

  if (tokenRow.isExpired) {
    return { ok: false, error: IAM_RESET_TOKEN_EXPIRED };
  }

  const [principalRow] = await db
    .select({ email: iamPrincipal.email })
    .from(iamPrincipal)
    .where(eq(iamPrincipal.id, tokenRow.principalId))
    .limit(1);

  if (!principalRow?.email) {
    return { ok: false, error: IAM_RESET_TOKEN_INVALID };
  }

  return {
    ok: true,
    email: principalRow.email,
    expiresAt: tokenRow.expiresAt ? tokenRow.expiresAt.toISOString() : undefined,
  };
}

export type ResetPasswordResult =
  | { ok: true }
  | { ok: false; error: string };

export async function resetPasswordWithToken(
  db: DbClient,
  input: { token: string; newPassword: string; email?: string },
): Promise<ResetPasswordResult> {
  const tokenHash = hashToken(input.token);
  const isCode = /^\d{6}$/.test(input.token);

  const [tokenRow] = await db
    .select({
      id: authPasswordResetToken.id,
      principalId: authPasswordResetToken.principalId,
      usedAt: authPasswordResetToken.usedAt,
      isExpired: sql<boolean>`${authPasswordResetToken.expiresAt} <= now()`,
    })
    .from(authPasswordResetToken)
    .where(eq(authPasswordResetToken.tokenHash, tokenHash))
    .limit(1);

  if (!tokenRow?.id || !tokenRow.principalId) {
    return { ok: false, error: IAM_RESET_TOKEN_INVALID };
  }

  if (isCode) {
    const normalizedEmail = normalizeEmail(input.email ?? "");
    if (!normalizedEmail) {
      return { ok: false, error: IAM_RESET_TOKEN_INVALID };
    }

    const [principalRow] = await db
      .select({ email: iamPrincipal.email })
      .from(iamPrincipal)
      .where(eq(iamPrincipal.id, tokenRow.principalId))
      .limit(1);

    if (!principalRow?.email || normalizeEmail(principalRow.email) !== normalizedEmail) {
      return { ok: false, error: IAM_RESET_TOKEN_INVALID };
    }
  }

  if (tokenRow.usedAt) {
    return { ok: false, error: IAM_RESET_TOKEN_INVALID };
  }

  if (tokenRow.isExpired) {
    return { ok: false, error: IAM_RESET_TOKEN_EXPIRED };
  }

  const passwordHash = await hashPassword(input.newPassword);

  await db.transaction(async (tx) => {
    await tx
      .update(iamPrincipal)
      .set({
        passwordHash,
        updatedAt: sql`now()`,
      })
      .where(eq(iamPrincipal.id, tokenRow.principalId));

    await tx
      .update(authPasswordResetToken)
      .set({ usedAt: sql`now()` })
      .where(eq(authPasswordResetToken.id, tokenRow.id));
  });

  return { ok: true };
}

export type RequestPortalInvitationResult = {
  accepted: true;
  token: string;
  portal: Exclude<PortalType, "app">;
};

export async function requestPortalInvitation(
  db: DbClient,
  input: {
    orgId: string;
    invitedByPrincipalId: string;
    email: string;
    portal: Exclude<PortalType, "app">;
  },
): Promise<RequestPortalInvitationResult> {
  const normalizedEmail = normalizeEmail(input.email);
  const token = createToken();
  const tokenHash = hashToken(token);

  await db.transaction(async (tx) => {
    await tx
      .delete(authPortalInvitation)
      .where(
        and(
          eq(authPortalInvitation.orgId, input.orgId),
          eq(authPortalInvitation.email, normalizedEmail),
          eq(authPortalInvitation.portal, input.portal),
          isNull(authPortalInvitation.acceptedAt),
        ),
      );

    await tx.insert(authPortalInvitation).values({
      orgId: input.orgId,
      email: normalizedEmail,
      portal: input.portal,
      tokenHash,
      invitedByPrincipalId: input.invitedByPrincipalId,
      expiresAt: sql`now() + interval '7 days'`,
    });
  });

  return {
    accepted: true,
    token,
    portal: input.portal,
  };
}

export type AcceptPortalInvitationResult =
  | { ok: true; principalId: string; email: string; portal: Exclude<PortalType, "app"> }
  | { ok: false; error: string };

async function ensurePersonForPrincipal(
  db: DbClient,
  principalId: string,
  fullName: string,
  email: string,
): Promise<string> {
  const [principalRow] = await db
    .select({ id: iamPrincipal.id, personId: iamPrincipal.personId })
    .from(iamPrincipal)
    .where(eq(iamPrincipal.id, principalId))
    .limit(1);

  if (!principalRow?.id) {
    throw new Error("Principal not found");
  }

  if (principalRow.personId) {
    await db
      .update(person)
      .set({
        name: fullName,
        email,
      })
      .where(eq(person.id, principalRow.personId));

    return principalRow.personId;
  }

  const [personPartyRow] = await db
    .insert(party)
    .values({ kind: "person" })
    .returning({ id: party.id });

  const personPartyId = personPartyRow?.id;
  if (!personPartyId) {
    throw new Error("Failed to create person party");
  }

  await db.insert(person).values({
    id: personPartyId,
    name: fullName,
    email,
  });

  await db
    .update(iamPrincipal)
    .set({ personId: personPartyId, updatedAt: sql`now()` })
    .where(eq(iamPrincipal.id, principalId));

  return personPartyId;
}

export async function acceptPortalInvitation(
  db: DbClient,
  input: { token: string; fullName: string; password: string },
): Promise<AcceptPortalInvitationResult> {
  const tokenHash = hashToken(input.token);

  const [invitation] = await db
    .select({
      id: authPortalInvitation.id,
      orgId: authPortalInvitation.orgId,
      email: authPortalInvitation.email,
      portal: authPortalInvitation.portal,
      acceptedAt: authPortalInvitation.acceptedAt,
      isExpired: sql<boolean>`${authPortalInvitation.expiresAt} <= now()`,
    })
    .from(authPortalInvitation)
    .where(eq(authPortalInvitation.tokenHash, tokenHash))
    .limit(1);

  if (!invitation?.id || !invitation.orgId || !invitation.email || !invitation.portal) {
    return { ok: false, error: IAM_PORTAL_INVITATION_INVALID };
  }

  if (invitation.acceptedAt) {
    return { ok: false, error: IAM_PORTAL_INVITATION_INVALID };
  }

  if (invitation.isExpired) {
    return { ok: false, error: IAM_PORTAL_INVITATION_EXPIRED };
  }

  const passwordHash = await hashPassword(input.password);
  const normalizedEmail = normalizeEmail(invitation.email);
  const portal = invitation.portal as Exclude<PortalType, "app">;

  const txResult = await db.transaction(async (tx) => {
    const [existingPrincipal] = await tx
      .select({
        id: iamPrincipal.id,
        personId: iamPrincipal.personId,
      })
      .from(iamPrincipal)
      .where(eq(iamPrincipal.email, normalizedEmail))
      .limit(1);

    let principalId = existingPrincipal?.id;
    let personId = existingPrincipal?.personId ?? null;

    if (!principalId) {
      const [personPartyRow] = await tx
        .insert(party)
        .values({ kind: "person" })
        .returning({ id: party.id });

      const personPartyId = personPartyRow?.id;
      if (!personPartyId) throw new Error("Failed to create person party");

      await tx.insert(person).values({
        id: personPartyId,
        email: normalizedEmail,
        name: input.fullName.trim(),
      });

      const [newPrincipal] = await tx
        .insert(iamPrincipal)
        .values({
          personId: personPartyId,
          kind: "user",
          email: normalizedEmail,
          passwordHash,
        })
        .returning({ id: iamPrincipal.id, personId: iamPrincipal.personId });

      principalId = newPrincipal?.id;
      personId = newPrincipal?.personId ?? null;
    } else {
      await tx
        .update(iamPrincipal)
        .set({ passwordHash, updatedAt: sql`now()` })
        .where(eq(iamPrincipal.id, principalId));

      personId = await ensurePersonForPrincipal(tx, principalId, input.fullName.trim(), normalizedEmail);
    }

    if (!principalId || !personId) {
      throw new Error("Failed to resolve principal for portal invitation");
    }

    const [existingPartyRole] = await tx
      .select({ id: partyRole.id })
      .from(partyRole)
      .where(
        and(
          eq(partyRole.orgId, invitation.orgId),
          eq(partyRole.partyId, personId),
          eq(partyRole.roleType, portal),
        ),
      )
      .limit(1);

    let partyRoleId = existingPartyRole?.id;

    if (!partyRoleId) {
      const [createdPartyRole] = await tx
        .insert(partyRole)
        .values({
          orgId: invitation.orgId,
          partyId: personId,
          roleType: portal,
        })
        .returning({ id: partyRole.id });

      partyRoleId = createdPartyRole?.id;
    }

    if (!partyRoleId) {
      throw new Error("Failed to resolve portal party role");
    }

    await tx
      .insert(membership)
      .values({
        principalId,
        partyRoleId,
      })
      .onConflictDoNothing();

    await tx
      .update(authPortalInvitation)
      .set({
        acceptedAt: sql`now()`,
        acceptedPrincipalId: principalId,
        updatedAt: sql`now()`,
      })
      .where(eq(authPortalInvitation.id, invitation.id));

    return { principalId, email: normalizedEmail, portal };
  });
  return {
    ok: true,
    principalId: txResult.principalId,
    email: txResult.email,
    portal: txResult.portal,
  };
}

export type VerifyInviteTokenResult =
  | { ok: true; email: string; portal: Exclude<PortalType, "app">; tenantName?: string; tenantSlug?: string; expiresAt?: string }
  | { ok: false; error: string };

export async function verifyInviteToken(
  db: DbClient,
  input: { token: string },
): Promise<VerifyInviteTokenResult> {
  const tokenHash = hashToken(input.token);

  const [row] = await db
    .select({
      email: authPortalInvitation.email,
      portal: authPortalInvitation.portal,
      expiresAt: authPortalInvitation.expiresAt,
      acceptedAt: authPortalInvitation.acceptedAt,
      orgName: organization.name,
      orgSlug: organization.slug,
    })
    .from(authPortalInvitation)
    .innerJoin(organization, eq(authPortalInvitation.orgId, organization.id))
    .where(eq(authPortalInvitation.tokenHash, tokenHash))
    .limit(1);

  if (!row?.email || !row.portal) {
    return { ok: false, error: IAM_PORTAL_INVITATION_INVALID };
  }

  if (row.acceptedAt) {
    return { ok: false, error: IAM_PORTAL_INVITATION_INVALID };
  }

  const isExpired = row.expiresAt ? row.expiresAt.getTime() <= Date.now() : false;
  if (isExpired) {
    return { ok: false, error: IAM_PORTAL_INVITATION_EXPIRED };
  }

  return {
    ok: true,
    email: row.email,
    portal: row.portal as Exclude<PortalType, "app">,
    tenantName: row.orgName ?? undefined,
    tenantSlug: row.orgSlug ?? undefined,
    expiresAt: row.expiresAt ? row.expiresAt.toISOString() : undefined,
  };
}

// ── Session grants (one-time token for web session establishment) ──────────────

export type CreateSessionGrantResult =
  | { ok: true; grant: string }
  | { ok: false; error: string };

export async function createSessionGrant(
  db: DbClient,
  input: { principalId: string; email: string; portal?: PortalType },
): Promise<CreateSessionGrantResult> {
  const token = createToken();
  const tokenHash = hashToken(token);
  const portal = input.portal ?? "app";

  await db.insert(authSessionGrant).values({
    principalId: input.principalId,
    tokenHash,
    email: input.email,
    portal,
    expiresAt: sql`now() + interval '5 minutes'`,
  });

  return { ok: true, grant: token };
}

export type VerifySessionGrantResult =
  | { ok: true; principalId: string; email: string; portal: string }
  | { ok: false; error: string };

const IAM_SESSION_GRANT_INVALID = "IAM_SESSION_GRANT_INVALID";
const IAM_SESSION_GRANT_EXPIRED = "IAM_SESSION_GRANT_EXPIRED";

export async function verifySessionGrant(
  db: DbClient,
  input: { grant: string },
): Promise<VerifySessionGrantResult> {
  const tokenHash = hashToken(input.grant);

  const [row] = await db
    .select({
      id: authSessionGrant.id,
      principalId: authSessionGrant.principalId,
      email: authSessionGrant.email,
      portal: authSessionGrant.portal,
      usedAt: authSessionGrant.usedAt,
      isExpired: sql<boolean>`${authSessionGrant.expiresAt} <= now()`,
    })
    .from(authSessionGrant)
    .where(eq(authSessionGrant.tokenHash, tokenHash))
    .limit(1);

  if (!row?.id || !row.principalId || !row.email) {
    return { ok: false, error: IAM_SESSION_GRANT_INVALID };
  }

  if (row.usedAt) {
    return { ok: false, error: IAM_SESSION_GRANT_INVALID };
  }

  if (row.isExpired) {
    return { ok: false, error: IAM_SESSION_GRANT_EXPIRED };
  }

  await db
    .update(authSessionGrant)
    .set({ usedAt: sql`now()` })
    .where(eq(authSessionGrant.id, row.id));

  return {
    ok: true,
    principalId: row.principalId,
    email: row.email,
    portal: row.portal ?? "app",
  };
}

export async function verifyCredentialsForPortal(
  db: DbClient,
  email: string,
  password: string,
  portal: PortalType = "app",
): Promise<
  | { ok: true; principalId: string; email: string; requiresMfa?: boolean }
  | { ok: false; error: string }
> {
  const normalizedEmail = normalizeEmail(email);

  // Check for account lockout BEFORE attempting password verification
  const lockoutStatus = await checkAccountLockout(db, normalizedEmail);
  if (lockoutStatus.locked) {
    return { ok: false, error: IAM_ACCOUNT_LOCKED };
  }

  const rows = await db
    .select({ id: iamPrincipal.id, email: iamPrincipal.email, passwordHash: iamPrincipal.passwordHash })
    .from(iamPrincipal)
    .where(eq(iamPrincipal.email, normalizedEmail))
    .limit(1);

  if (rows.length === 0) {
    // Record failed attempt (principal not found)
    await recordLoginAttempt(db, {
      email: normalizedEmail,
      success: false,
      portal,
      errorCode: IAM_CREDENTIALS_INVALID,
    });
    return { ok: false, error: IAM_CREDENTIALS_INVALID };
  }

  const principal = rows[0];
  if (!principal?.id || !principal.passwordHash || !principal.email) {
    // Record failed attempt (no password hash)
    await recordLoginAttempt(db, {
      email: normalizedEmail,
      success: false,
      portal,
      principalId: principal?.id,
      errorCode: IAM_CREDENTIALS_INVALID,
    });
    return { ok: false, error: IAM_CREDENTIALS_INVALID };
  }

  const valid = await verifyPassword(password, principal.passwordHash);
  if (!valid) {
    // Record failed attempt (wrong password)
    await recordLoginAttempt(db, {
      email: normalizedEmail,
      success: false,
      portal,
      principalId: principal.id,
      errorCode: IAM_CREDENTIALS_INVALID,
    });
    return { ok: false, error: IAM_CREDENTIALS_INVALID };
  }

  if (portal !== "app") {
    const [portalMembership] = await db
      .select({ id: membership.id })
      .from(membership)
      .innerJoin(partyRole, eq(membership.partyRoleId, partyRole.id))
      .where(and(eq(membership.principalId, principal.id), eq(partyRole.roleType, portal)))
      .limit(1);

    if (!portalMembership?.id) {
      // Record failed attempt (no portal access)
      await recordLoginAttempt(db, {
        email: normalizedEmail,
        success: false,
        portal,
        principalId: principal.id,
        errorCode: IAM_PORTAL_INVITATION_REQUIRED,
      });
      return { ok: false, error: IAM_PORTAL_INVITATION_REQUIRED };
    }
  }

  await clearFailedLoginAttempts(db, normalizedEmail);

  // Record successful attempt
  await recordLoginAttempt(db, {
    email: normalizedEmail,
    success: true,
    portal,
    principalId: principal.id,
  });

  const [mfaRow] = await db
    .select({ id: iamPrincipalMfa.id })
    .from(iamPrincipalMfa)
    .where(eq(iamPrincipalMfa.principalId, principal.id))
    .limit(1);

  return {
    ok: true,
    principalId: principal.id,
    email: principal.email,
    requiresMfa: !!mfaRow?.id,
  };
}

export function mapAuthErrorMessage(error: string): string {
  if (error === IAM_EMAIL_ALREADY_REGISTERED) return "Email is already registered";
  if (error === IAM_RESET_TOKEN_INVALID) return "Password reset token is invalid";
  if (error === IAM_RESET_TOKEN_EXPIRED) return "Password reset token has expired";
  if (error === IAM_PORTAL_INVITATION_INVALID) return "Portal invitation token is invalid";
  if (error === IAM_PORTAL_INVITATION_EXPIRED) return "Portal invitation token has expired";
  if (error === IAM_PORTAL_INVITATION_REQUIRED || error === IAM_PORTAL_ACCESS_DENIED) {
    return "This portal requires a valid invitation";
  }
  if (error === IAM_ACCOUNT_LOCKED) {
    return "Account is temporarily locked due to too many failed login attempts. Please try again later.";
  }
  if (error === IAM_CREDENTIALS_INVALID) return "Invalid email or password";
  if (error === "IAM_MFA_INVALID") return "Invalid verification code.";
  if (error === IAM_MFA_NOT_IMPLEMENTED) return "MFA verification is not yet available via API.";
  if (error === "IAM_SESSION_GRANT_INVALID") return "Session grant is invalid or has already been used.";
  if (error === "IAM_SESSION_GRANT_EXPIRED") return "Session grant has expired.";
  return "Authentication request failed";
}

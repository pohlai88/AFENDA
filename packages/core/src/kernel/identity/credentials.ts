/**
 * Credential verification and password change.
 *
 * Used by NextAuth authorize() via verify-credentials API.
 * Import Direction: api → core (never web → core).
 */

import type { DbClient } from "@afenda/db";
import { iamPrincipal } from "@afenda/db";
import { eq, sql } from "drizzle-orm";
import { hashPassword, verifyPassword } from "./password.js";
import {
  IAM_CREDENTIALS_INVALID,
  IAM_PASSWORD_CHANGE_INVALID,
  IAM_PRINCIPAL_NOT_FOUND,
  type PortalType,
} from "@afenda/contracts";
import { verifyCredentialsForPortal } from "./auth-flows.js";

export type VerifyCredentialsResult =
  | { ok: true; principalId: string; email: string }
  | { ok: false; error: string };

/**
 * Verify email + password. Returns principalId and email if valid.
 * Principal must have a password_hash (SSO-only principals return invalid).
 */
export async function verifyCredentials(
  db: DbClient,
  email: string,
  password: string,
  portal: PortalType = "app",
): Promise<VerifyCredentialsResult> {
  const result = await verifyCredentialsForPortal(db, email, password, portal);
  if (!result.ok) {
    return { ok: false, error: result.error || IAM_CREDENTIALS_INVALID };
  }

  return { ok: true, principalId: result.principalId, email: result.email };
}

export type ChangePasswordResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Change password for a principal. Requires current password.
 */
export async function changePassword(
  db: DbClient,
  principalId: string,
  currentPassword: string,
  newPassword: string,
): Promise<ChangePasswordResult> {
  const rows = await db
    .select({ id: iamPrincipal.id, passwordHash: iamPrincipal.passwordHash })
    .from(iamPrincipal)
    .where(eq(iamPrincipal.id, principalId))
    .limit(1);

  if (rows.length === 0) {
    return { ok: false, error: IAM_PRINCIPAL_NOT_FOUND };
  }

  const row = rows[0]!;
  if (!row.passwordHash) {
    return { ok: false, error: IAM_PASSWORD_CHANGE_INVALID };
  }

  const valid = await verifyPassword(currentPassword, row.passwordHash);
  if (!valid) {
    return { ok: false, error: IAM_PASSWORD_CHANGE_INVALID };
  }

  const newHash = await hashPassword(newPassword);
  await db
    .update(iamPrincipal)
    .set({ passwordHash: newHash, updatedAt: sql`now()` })
    .where(eq(iamPrincipal.id, principalId));

  return { ok: true };
}

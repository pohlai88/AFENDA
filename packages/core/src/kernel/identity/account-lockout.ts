/**
 * Account lockout mechanism for brute-force protection.
 *
 * Lockout policy (configurable):
 *   - 5 failed login attempts within 15 minutes → 15-minute lockout
 *   - Failed attempts older than 1 hour are ignored (auto-expire)
 *
 * Implementation:
 *   - All login attempts are recorded in auth_login_attempt table
 *   - Lockout check queries recent failures before password verification
 *   - Successful logins reset the failure count
 */

import type { DbClient } from "@afenda/db";
import { authLoginAttempt } from "@afenda/db";
import { and, eq, gte, sql } from "drizzle-orm";
import { IAM_ACCOUNT_LOCKED } from "@afenda/contracts";
import type { PortalType } from "@afenda/contracts";

/** Configuration for lockout policy */
const LOCKOUT_CONFIG = {
  /** Max failed attempts before lockout */
  maxAttempts: 5,
  /** Lockout window in minutes (look back for failures) */
  lockoutWindowMinutes: 15,
  /** Lockout duration in minutes (how long the lockout lasts) */
  lockoutDurationMinutes: 15,
  /** Failed attempt expiry in minutes (ignore old failures) */
  attemptExpiryMinutes: 60,
} as const;

export type AccountLockoutResult =
  | { locked: false }
  | { locked: true; unlockAt: Date; failedAttempts: number };

/**
 * Check if an account is currently locked due to too many failed login attempts.
 * 
 * @param db - Database client
 * @param email - Email address to check (normalized)
 * @returns Lockout status with unlock time if locked
 */
export async function checkAccountLockout(
  db: DbClient,
  email: string,
): Promise<AccountLockoutResult> {
  // gate:allow-js-date - Computing lookback time for SQL comparison; uses Date.now() base
  const lookbackTime = new Date(Date.now() - LOCKOUT_CONFIG.attemptExpiryMinutes * 60 * 1000);

  // Count recent failed attempts
  const [result] = await db
    .select({
      failedAttempts: sql<number>`COUNT(*)::int`,
      mostRecentFailure: sql<Date>`MAX(${authLoginAttempt.attemptedAt})`,
    })
    .from(authLoginAttempt)
    .where(
      and(
        eq(authLoginAttempt.email, email),
        eq(authLoginAttempt.success, false),
        gte(authLoginAttempt.attemptedAt, lookbackTime),
      ),
    );

  const failedAttempts = result?.failedAttempts ?? 0;
  const mostRecentFailure = result?.mostRecentFailure;

  // Not locked if below threshold
  if (failedAttempts < LOCKOUT_CONFIG.maxAttempts) {
    return { locked: false };
  }

  // Calculate unlock time based on most recent failure
  if (!mostRecentFailure) {
    return { locked: false };
  }

  // gate:allow-js-date - Computing future unlock time from DB timestamp
  const unlockAt = new Date(
    mostRecentFailure.getTime() + LOCKOUT_CONFIG.lockoutDurationMinutes * 60 * 1000,
  );

  // Check if lockout period has expired
  if (Date.now() >= unlockAt.getTime()) {
    return { locked: false };
  }

  return {
    locked: true,
    unlockAt,
    failedAttempts,
  };
}

/**
 * Record a login attempt (successful or failed).
 * 
 * @param db - Database client
 * @param params - Login attempt parameters
 * @returns The created login attempt record ID
 */
export async function recordLoginAttempt(
  db: DbClient,
  params: {
    email: string;
    success: boolean;
    portal: PortalType;
    principalId?: string;
    errorCode?: string;
    ipAddress?: string;
    userAgent?: string;
  },
): Promise<string> {
  const [attempt] = await db
    .insert(authLoginAttempt)
    .values({
      principalId: params.principalId ?? null,
      email: params.email,
      success: params.success,
      portal: params.portal,
      errorCode: params.errorCode ?? null,
      ipAddress: params.ipAddress ?? null,
      userAgent: params.userAgent ?? null,
    })
    .returning({ id: authLoginAttempt.id });

  return attempt?.id ?? "";
}

/**
 * Get the lockout configuration (for display purposes).
 * Returns a human-readable description of the lockout policy.
 */
export function getLockoutPolicyDescription(): string {
  return `Account will be locked for ${LOCKOUT_CONFIG.lockoutDurationMinutes} minutes after ${LOCKOUT_CONFIG.maxAttempts} failed login attempts within ${LOCKOUT_CONFIG.lockoutWindowMinutes} minutes.`;
}

/**
 * Format a lockout result for error messages.
 * Returns a human-readable message including unlock time.
 */
export function formatLockoutMessage(lockout: AccountLockoutResult): string {
  if (!lockout.locked) {
    return "";
  }

  const minutesRemaining = Math.ceil(
    (lockout.unlockAt.getTime() - Date.now()) / (60 * 1000),
  );

  return `Account is locked due to too many failed login attempts. Please try again in ${minutesRemaining} minute${minutesRemaining === 1 ? "" : "s"}.`;
}

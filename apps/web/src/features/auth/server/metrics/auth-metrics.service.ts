import { and, eq, gte, isNull, lt, sql } from "drizzle-orm";

import { authAuditOutbox, authChallenges } from "@afenda/db";

import { getDbForAuth } from "../auth-db";
import type { AuthSecurityMetrics } from "./auth-metrics.types";

export async function getAuthSecurityMetrics(): Promise<AuthSecurityMetrics> {
  const db = getDbForAuth();

  const [activeChallengesRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(authChallenges)
    .where(
      and(
        eq(authChallenges.revoked, false),
        isNull(authChallenges.consumedAt),
        gte(authChallenges.expiresAt, sql`now()`),
      ),
    );

  const [expiredUnpurgedRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(authChallenges)
    .where(lt(authChallenges.expiresAt, sql`now()`));

  const [pendingAuditRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(authAuditOutbox)
    .where(eq(authAuditOutbox.status, "pending"));

  const [failedAuditRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(authAuditOutbox)
    .where(eq(authAuditOutbox.status, "failed"));

  const [signinFailureRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(authAuditOutbox)
    .where(
      and(
        eq(authAuditOutbox.eventType, "auth.signin.failure"),
        gte(authAuditOutbox.createdAt, sql`now() - interval '24 hours'`),
      ),
    );

  const [mfaFailureRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(authAuditOutbox)
    .where(
      and(
        eq(authAuditOutbox.eventType, "auth.mfa.failure"),
        gte(authAuditOutbox.createdAt, sql`now() - interval '24 hours'`),
      ),
    );

  const [resetFailureRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(authAuditOutbox)
    .where(
      and(
        eq(authAuditOutbox.eventType, "auth.reset.failed"),
        gte(authAuditOutbox.createdAt, sql`now() - interval '24 hours'`),
      ),
    );

  return {
    activeChallenges: Number(activeChallengesRow?.count ?? 0),
    expiredUnpurgedChallenges: Number(expiredUnpurgedRow?.count ?? 0),
    pendingAuditEvents: Number(pendingAuditRow?.count ?? 0),
    failedAuditEvents: Number(failedAuditRow?.count ?? 0),
    recentSigninFailures: Number(signinFailureRow?.count ?? 0),
    recentMfaFailures: Number(mfaFailureRow?.count ?? 0),
    recentResetFailures: Number(resetFailureRow?.count ?? 0),
  };
}

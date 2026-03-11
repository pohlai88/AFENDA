import { and, desc, eq, gte, isNull, sql } from "drizzle-orm";
import { authAuditOutbox, authChallenges } from "@afenda/db";

import { hashChallengeToken } from "../challenge/auth-challenge.crypto";
import { getDbForAuth } from "../auth-db";
import type {
  RevokeChallengeInput,
  SecurityAuditEventListItem,
  SecurityChallengeListItem,
} from "./auth-ops.types";

function mapChallenge(
  row: (typeof authChallenges.$inferSelect),
): SecurityChallengeListItem {
  return {
    id: row.id,
    type: row.type as SecurityChallengeListItem["type"],
    tokenHint: row.tokenHint ?? null,
    email: row.email,
    portal: (row.portal as SecurityChallengeListItem["portal"]) ?? null,
    tenantId: row.tenantId,
    tenantSlug: row.tenantSlug,
    userId: row.userId,
    attemptCount: row.attemptCount,
    maxAttempts: row.maxAttempts,
    expiresAt: row.expiresAt.toISOString(),
    consumedAt: row.consumedAt?.toISOString() ?? null,
    revoked: row.revoked,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapAudit(
  row: (typeof authAuditOutbox.$inferSelect),
): SecurityAuditEventListItem {
  return {
    id: row.id,
    eventType: row.eventType,
    aggregateType: row.aggregateType,
    aggregateId: row.aggregateId ?? null,
    status: row.status,
    attemptCount: row.attemptCount,
    availableAt: row.availableAt.toISOString(),
    processedAt: row.processedAt?.toISOString() ?? null,
    errorMessage: row.errorMessage ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

export class AuthOpsRepository {
  private get db() {
    return getDbForAuth();
  }

  async listRecentChallenges(limit = 100): Promise<SecurityChallengeListItem[]> {
    const rows = await this.db
      .select()
      .from(authChallenges)
      .orderBy(desc(authChallenges.createdAt))
      .limit(limit);

    return rows.map(mapChallenge);
  }

  async listActiveChallenges(limit = 100): Promise<SecurityChallengeListItem[]> {
    const rows = await this.db
      .select()
      .from(authChallenges)
      .where(
        and(
          eq(authChallenges.revoked, false),
          isNull(authChallenges.consumedAt),
          gte(authChallenges.expiresAt, sql`now()`),
        ),
      )
      .orderBy(desc(authChallenges.createdAt))
      .limit(limit);

    return rows.map(mapChallenge);
  }

  async listRecentAuditEvents(
    limit = 100,
  ): Promise<SecurityAuditEventListItem[]> {
    const rows = await this.db
      .select()
      .from(authAuditOutbox)
      .orderBy(desc(authAuditOutbox.createdAt))
      .limit(limit);

    return rows.map(mapAudit);
  }

  async revokeChallenge(input: RevokeChallengeInput): Promise<boolean> {
    if (!input.rawToken && !input.challengeId) {
      return false;
    }

    const whereClause = input.rawToken
      ? eq(authChallenges.tokenHash, hashChallengeToken(input.rawToken))
      : eq(authChallenges.id, input.challengeId!);

    const rows = await this.db
      .update(authChallenges)
      .set({
        revoked: true,
        updatedAt: sql`now()`,
        metadata: sql`coalesce(${authChallenges.metadata}, '{}'::jsonb) || jsonb_build_object(
          'revocationReason', ${input.reason},
          'revokedBy', ${input.actorUserId ?? null},
          'revokedAt', to_char(now() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
        )`,
      })
      .where(whereClause)
      .returning({ id: authChallenges.id });

    return rows.length > 0;
  }
}

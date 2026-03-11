/**
 * Auth challenge repository — DB-backed persistence with transactional semantics.
 *
 * Uses HMAC-SHA256 for token hashing. All mutations use transactions where
 * appropriate for race-condition safety.
 */

import { and, eq, gt, lte, sql } from "drizzle-orm";
import { authChallenges } from "@afenda/db";
import type { DbClient } from "@afenda/db";

import {
  buildChallengeTokenHint,
  hashChallengeToken,
} from "./auth-challenge.crypto";
import type {
  AuthChallengeRecord,
  ConsumeChallengeResult,
  CreateAuthChallengeInput,
  FailedAttemptResult,
} from "./auth-challenge.types";
import { getAuthDatabaseUrl, getDbForAuth } from "../auth-db";

function mapRow(row: (typeof authChallenges.$inferSelect)): AuthChallengeRecord {
  return {
    id: row.id,
    type: row.type as AuthChallengeRecord["type"],
    tokenHash: row.tokenHash,
    tokenHint: row.tokenHint ?? null,
    email: row.email,
    portal: (row.portal as AuthChallengeRecord["portal"]) ?? null,
    callbackUrl: row.callbackUrl,
    tenantId: row.tenantId,
    tenantSlug: row.tenantSlug,
    userId: row.userId,
    metadata: row.metadata ?? null,
    attemptCount: row.attemptCount,
    maxAttempts: row.maxAttempts,
    lastAttemptAt: row.lastAttemptAt?.toISOString() ?? null,
    expiresAt: row.expiresAt.toISOString(),
    consumedAt: row.consumedAt?.toISOString() ?? null,
    revoked: row.revoked,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export class AuthChallengeRepository {
  constructor(private readonly db: DbClient) {}

  async create(input: CreateAuthChallengeInput): Promise<AuthChallengeRecord> {
    const tokenHash = hashChallengeToken(input.rawToken);
    const tokenHint = buildChallengeTokenHint(input.rawToken);

    const [row] = await this.db
      .insert(authChallenges)
      .values({
        type: input.type,
        tokenHash,
        tokenHint,
        email: input.email ?? null,
        portal: input.portal ?? null,
        callbackUrl: input.callbackUrl ?? null,
        tenantId: input.tenantId ?? null,
        tenantSlug: input.tenantSlug ?? null,
        userId: input.userId ?? null,
        metadata: input.metadata ?? null,
        maxAttempts: input.maxAttempts ?? 5,
        expiresAt: new Date(input.expiresAt), // gate:allow-js-date — expiry from caller ISO string
      })
      .returning();

    if (!row) throw new Error("Auth challenge insert failed");
    return mapRow(row);
  }

  async getByRawToken(rawToken: string): Promise<AuthChallengeRecord | null> {
    const tokenHash = hashChallengeToken(rawToken);

    const [row] = await this.db
      .select()
      .from(authChallenges)
      .where(eq(authChallenges.tokenHash, tokenHash))
      .limit(1);

    return row ? mapRow(row) : null;
  }

  async recordFailedAttempt(rawToken: string): Promise<FailedAttemptResult> {
    const tokenHash = hashChallengeToken(rawToken);

    return this.db.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(authChallenges)
        .where(eq(authChallenges.tokenHash, tokenHash))
        .limit(1);

      if (!existing) {
        return { ok: false };
      }

      const [updated] = await tx
        .update(authChallenges)
        .set({
          attemptCount: existing.attemptCount + 1,
          lastAttemptAt: sql`now()`,
          updatedAt: sql`now()`,
        })
        .where(eq(authChallenges.id, existing.id))
        .returning();

      if (!updated) return { ok: false };

      return {
        ok: true,
        challenge: mapRow(updated),
      };
    });
  }

  async consumeIfUsable(
    rawToken: string,
    expectedType?: AuthChallengeRecord["type"],
  ): Promise<ConsumeChallengeResult> {
    const tokenHash = hashChallengeToken(rawToken);

    return this.db.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(authChallenges)
        .where(eq(authChallenges.tokenHash, tokenHash))
        .limit(1);

      if (!existing) {
        return { ok: false, reason: "not_found" };
      }

      if (expectedType && existing.type !== expectedType) {
        return {
          ok: false,
          reason: "type_mismatch",
          challenge: mapRow(existing),
        };
      }

      if (existing.revoked) {
        return {
          ok: false,
          reason: "revoked",
          challenge: mapRow(existing),
        };
      }

      if (existing.consumedAt) {
        return {
          ok: false,
          reason: "already_consumed",
          challenge: mapRow(existing),
        };
      }

      if (existing.expiresAt.getTime() <= Date.now()) {
        return {
          ok: false,
          reason: "expired",
          challenge: mapRow(existing),
        };
      }

      if (existing.attemptCount >= existing.maxAttempts) {
        return {
          ok: false,
          reason: "max_attempts_exceeded",
          challenge: mapRow(existing),
        };
      }

      const [updated] = await tx
        .update(authChallenges)
        .set({
          consumedAt: sql`now()`,
          updatedAt: sql`now()`,
        })
        .where(
          and(
            eq(authChallenges.id, existing.id),
            eq(authChallenges.revoked, false),
            gt(authChallenges.expiresAt, sql`now()`),
          ),
        )
        .returning();

      if (!updated) {
        return {
          ok: false,
          reason: "already_consumed",
          challenge: mapRow(existing),
        };
      }

      return {
        ok: true,
        challenge: mapRow(updated),
      };
    });
  }

  async revoke(rawToken: string): Promise<void> {
    const tokenHash = hashChallengeToken(rawToken);

    await this.db
      .update(authChallenges)
      .set({
        revoked: true,
        updatedAt: sql`now()`,
      })
      .where(eq(authChallenges.tokenHash, tokenHash));
  }

  async purgeExpired(now?: Date): Promise<number> {
    const cutoff = now ?? new Date(); // gate:allow-js-date — optional param for testing
    const rows = await this.db
      .delete(authChallenges)
      .where(lte(authChallenges.expiresAt, cutoff))
      .returning({ id: authChallenges.id });

    return rows.length;
  }
}

let repository: AuthChallengeRepository | null = null;

export function getAuthChallengeRepository(): AuthChallengeRepository | null {
  const url = getAuthDatabaseUrl();
  if (!url) return null;

  if (repository) return repository;

  repository = new AuthChallengeRepository(getDbForAuth());
  return repository;
}

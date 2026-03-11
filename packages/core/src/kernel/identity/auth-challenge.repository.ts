/**
 * Auth challenge repository — DB-backed persistence for MFA, invite, and reset challenges.
 *
 * Implements the same interface as AuthChallengeStore (create, getByToken, consume,
 * deleteExpired) for use by API routes. Web app accesses challenges via API, not directly.
 *
 * Token hashing is injected (e.g. HMAC-SHA256 with server secret) so the app controls the algorithm.
 */

import { eq, lte, or, sql } from "drizzle-orm";
import type { DbClient } from "@afenda/db";
import { authChallenges } from "@afenda/db";
import type {
  AuthChallengeRecord,
  CreateAuthChallengeInput,
} from "@afenda/contracts";

export type ChallengeTokenHashFn = (rawToken: string) => string;
export type ChallengeTokenHintFn = (rawToken: string) => string;

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
  constructor(
    private readonly db: DbClient,
    private readonly hashFn: ChallengeTokenHashFn,
    private readonly hintFn?: ChallengeTokenHintFn,
  ) {}

  async create(input: CreateAuthChallengeInput): Promise<AuthChallengeRecord> {
    const tokenHash = this.hashFn(input.rawToken);
    const tokenHint = this.hintFn
      ? this.hintFn(input.rawToken)
      : tokenHash.slice(0, 6);

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
        expiresAt: new Date(input.expiresAt), // gate:allow-js-date — expiry from caller ISO string, not DB clock
      })
      .returning();

    if (!row) throw new Error("Auth challenge insert failed");
    return mapRow(row);
  }

  async getByToken(token: string): Promise<AuthChallengeRecord | null> {
    const tokenHash = this.hashFn(token);
    const [row] = await this.db
      .select()
      .from(authChallenges)
      .where(eq(authChallenges.tokenHash, tokenHash))
      .limit(1);

    return row ? mapRow(row) : null;
  }

  async consume(token: string): Promise<void> {
    const tokenHash = this.hashFn(token);
    await this.db
      .update(authChallenges)
      .set({
        consumedAt: sql`now()`,
        updatedAt: sql`now()`,
      })
      .where(eq(authChallenges.tokenHash, tokenHash));
  }

  async revoke(token: string): Promise<void> {
    const tokenHash = this.hashFn(token);
    await this.db
      .update(authChallenges)
      .set({
        revoked: true,
        updatedAt: sql`now()`,
      })
      .where(eq(authChallenges.tokenHash, tokenHash));
  }

  async recordAttempt(token: string): Promise<void> {
    const tokenHash = this.hashFn(token);
    await this.db
      .update(authChallenges)
      .set({
        attemptCount: sql`${authChallenges.attemptCount} + 1`,
        lastAttemptAt: sql`now()`,
        updatedAt: sql`now()`,
      })
      .where(eq(authChallenges.tokenHash, tokenHash));
  }

  async deleteExpired(now?: Date): Promise<number> {
    const rows = await this.db
      .delete(authChallenges)
      .where(
        or(
          now !== undefined
            ? lte(authChallenges.expiresAt, now)
            : lte(authChallenges.expiresAt, sql`now()`),
          eq(authChallenges.revoked, true),
        ),
      )
      .returning({ id: authChallenges.id });

    return rows.length;
  }
}

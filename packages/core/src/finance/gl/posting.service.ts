/**
 * GL posting service — post balanced journal entries, reverse entries.
 *
 * Every mutation:
 *   1. Runs inside `withAudit()` — domain write + audit log are atomic.
 *   2. Uses `nextNumber()` for gap-free entry numbers.
 *   3. Validates balance via `validateJournalBalance()` from posting invariants.
 *   4. Enforces SoD via `canPostToGL()` from the policy layer.
 *   5. Verifies all accounts exist and are active.
 *
 * RULES:
 *   - No HTTP/Fastify imports — pure domain service.
 *   - Account active checks are done in the same transaction.
 *   - Reversal entries negate every line (debit↔credit swap).
 */

import type { DbClient } from "@afenda/db";
import {
  journalEntry,
  journalLine,
  account,
  outboxEvent,
} from "@afenda/db";
import { eq, and, inArray } from "drizzle-orm";
import type {
  OrgId,
  PrincipalId,
  CorrelationId,
  JournalEntryId,
  InvoiceId,
  AccountId,
} from "@afenda/contracts";
import { withAudit, type OrgScopedContext } from "../../infra/audit.js";
import { nextNumber } from "../../infra/numbering.js";
import { validateJournalBalance, type JournalLineInput } from "../posting.js";
import { canPostToGL, type PolicyContext } from "../sod.js";

// ── Types ────────────────────────────────────────────────────────────────────

export type GLServiceError = {
  code: string;
  message: string;
  meta?: Record<string, string>;
};

export type GLServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: GLServiceError };

/** Thrown inside transactions to surface domain errors without returning. */
class GLDomainError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly meta?: Record<string, string>,
  ) {
    super(message);
    this.name = "GLDomainError";
  }
}

export interface PostToGLParams {
  correlationId: CorrelationId;
  sourceInvoiceId?: InvoiceId;
  memo?: string;
  idempotencyKey: string;
  lines: Array<{
    accountId: AccountId;
    debitMinor: bigint;
    creditMinor: bigint;
    currencyCode: string;
    memo?: string;
    dimensions?: Record<string, string>;
  }>;
}

// ── Post journal entry ───────────────────────────────────────────────────────

export async function postToGL(
  db: DbClient,
  ctx: OrgScopedContext,
  policyCtx: PolicyContext,
  params: PostToGLParams,
): Promise<GLServiceResult<{ id: JournalEntryId; entryNumber: string }>> {
  const orgId = ctx.activeContext.orgId;

  // SoD check
  const policyResult = canPostToGL(policyCtx);
  if (!policyResult.allowed) {
    return {
      ok: false,
      error: {
        code: "IAM_INSUFFICIENT_PERMISSIONS",
        message: policyResult.reason,
        meta: policyResult.meta,
      },
    };
  }

  // Balance invariant
  const balanceLines: JournalLineInput[] = params.lines.map((l) => ({
    accountId: l.accountId,
    debitMinor: l.debitMinor,
    creditMinor: l.creditMinor,
    currencyCode: l.currencyCode,
  }));

  const validation = validateJournalBalance(balanceLines);
  if (!Array.isArray(validation) && !validation.valid) {
    return {
      ok: false,
      error: {
        code: "GL_JOURNAL_UNBALANCED",
        message: validation.reason,
        meta: validation.meta as Record<string, string> | undefined,
      },
    };
  }

  // Verify all accounts exist, belong to this org, and are active
  const accountIds = [...new Set(params.lines.map((l) => l.accountId))];

  try {
    const result = await withAudit(
    db,
    ctx,
    {
      actorPrincipalId: policyCtx.principalId,
      action: "gl.journal.posted",
      entityType: "journal_entry",
      correlationId: params.correlationId,
      details: {
        sourceInvoiceId: (params.sourceInvoiceId as string | undefined) ?? null,
        lineCount: params.lines.length,
        memo: params.memo ?? null,
      },
    },
    async (tx) => {
      // Account checks inside the transaction to prevent TOCTOU races
      const accounts = await tx
        .select({ id: account.id, isActive: account.isActive })
        .from(account)
        .where(and(eq(account.orgId, orgId), inArray(account.id, accountIds)));

      const foundIds = new Set(accounts.map((a) => a.id));
      for (const aid of accountIds) {
        if (!foundIds.has(aid)) {
          throw new GLDomainError("GL_ACCOUNT_NOT_FOUND", `Account not found: ${aid}`, { accountId: aid });
        }
      }

      const inactiveAccount = accounts.find((a) => !a.isActive);
      if (inactiveAccount) {
        throw new GLDomainError("GL_ACCOUNT_INACTIVE", `Account is inactive: ${inactiveAccount.id}`, { accountId: inactiveAccount.id });
      }

      const entryNumber = await nextNumber(tx, orgId, "journalEntry");

      const [entry] = await tx
        .insert(journalEntry)
        .values({
          orgId,
          entryNumber,
          memo: params.memo ?? null,
          postedByPrincipalId: policyCtx.principalId ?? null,
          correlationId: params.correlationId,
          idempotencyKey: params.idempotencyKey,
          sourceInvoiceId: (params.sourceInvoiceId as string | undefined) ?? null,
        })
        .returning({ id: journalEntry.id });

      if (!entry) throw new Error("Failed to insert journal entry");

      // Insert all lines
      await tx.insert(journalLine).values(
        params.lines.map((l) => ({
          journalEntryId: entry.id,
          accountId: l.accountId,
          debitMinor: l.debitMinor,
          creditMinor: l.creditMinor,
          currencyCode: l.currencyCode,
          memo: l.memo ?? null,
          dimensions: l.dimensions ?? null,
        })),
      );

      // Outbox event
      await tx.insert(outboxEvent).values({
        orgId,
        type: "GL.JOURNAL_POSTED",
        version: "1",
        correlationId: params.correlationId,
        payload: {
          journalEntryId: entry.id,
          entryNumber,
          sourceInvoiceId: (params.sourceInvoiceId as string | undefined) ?? null,
          lineCount: params.lines.length,
        },
      });

      return { id: entry.id as JournalEntryId, entryNumber };
    },
  );

    return { ok: true, data: result };
  } catch (err) {
    if (err instanceof GLDomainError) {
      return { ok: false, error: { code: err.code, message: err.message, meta: err.meta } };
    }
    throw err;
  }
}

// ── Reverse journal entry ────────────────────────────────────────────────────

export async function reverseJournalEntry(
  db: DbClient,
  ctx: OrgScopedContext,
  policyCtx: PolicyContext,
  correlationId: CorrelationId,
  journalEntryId: JournalEntryId,
  memo?: string,
  idempotencyKey?: string,
): Promise<GLServiceResult<{ id: JournalEntryId; entryNumber: string }>> {
  const orgId = ctx.activeContext.orgId;

  // SoD check
  const policyResult = canPostToGL(policyCtx);
  if (!policyResult.allowed) {
    return {
      ok: false,
      error: {
        code: "IAM_INSUFFICIENT_PERMISSIONS",
        message: policyResult.reason,
        meta: policyResult.meta,
      },
    };
  }

  // Fetch original entry + lines
  const [original] = await db
    .select()
    .from(journalEntry)
    .where(and(eq(journalEntry.id, journalEntryId), eq(journalEntry.orgId, orgId)));

  if (!original) {
    return {
      ok: false,
      error: { code: "SHARED_NOT_FOUND", message: "Journal entry not found" },
    };
  }

  const originalLines = await db
    .select()
    .from(journalLine)
    .where(eq(journalLine.journalEntryId, journalEntryId));

  if (originalLines.length === 0) {
    return {
      ok: false,
      error: { code: "SHARED_NOT_FOUND", message: "Journal entry has no lines" },
    };
  }

  const result = await withAudit(
    db,
    ctx,
    {
      actorPrincipalId: policyCtx.principalId,
      action: "gl.journal.reversed",
      entityType: "journal_entry",
      correlationId,
      details: {
        reversalOf: journalEntryId,
        originalEntryNumber: original.entryNumber,
        memo: memo ?? null,
      },
    },
    async (tx) => {
      const entryNumber = await nextNumber(tx, orgId, "journalEntry");

      const [reversal] = await tx
        .insert(journalEntry)
        .values({
          orgId,
          entryNumber,
          memo: memo ?? `Reversal of ${original.entryNumber}`,
          postedByPrincipalId: policyCtx.principalId ?? null,
          correlationId,
          idempotencyKey: idempotencyKey ?? null,
          reversalOfId: journalEntryId,
          sourceInvoiceId: original.sourceInvoiceId,
        })
        .returning({ id: journalEntry.id });

      if (!reversal) throw new Error("Failed to insert reversal entry");

      // Reverse all lines — swap debit ↔ credit
      await tx.insert(journalLine).values(
        originalLines.map((l) => ({
          journalEntryId: reversal.id,
          accountId: l.accountId,
          debitMinor: l.creditMinor,   // swap
          creditMinor: l.debitMinor,   // swap
          currencyCode: l.currencyCode,
          memo: l.memo ? `Reversal: ${l.memo}` : null,
          dimensions: l.dimensions,
        })),
      );

      // Outbox event
      await tx.insert(outboxEvent).values({
        orgId,
        type: "GL.JOURNAL_REVERSED",
        version: "1",
        correlationId,
        payload: {
          journalEntryId: reversal.id,
          entryNumber,
          reversalOf: journalEntryId,
        },
      });

      return { id: reversal.id as JournalEntryId, entryNumber };
    },
  );

  return { ok: true, data: result };
}

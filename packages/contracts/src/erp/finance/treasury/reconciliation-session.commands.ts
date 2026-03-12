import { z } from "zod";
import { IdempotencyKeySchema } from "../../../kernel/execution/idempotency/request-key.js";
import {
  ReconciliationSessionIdSchema,
  ReconciliationMatchIdSchema,
} from "./reconciliation-session.entity.js";
import { ReconciliationTargetTypeSchema } from "./treasury-shared.entity.js";
import { BankAccountIdSchema } from "./bank-account.entity.js";
import { BankStatementIdSchema } from "./bank-statement.entity.js";

// ── Open Session ─────────────────────────────────────────────────────────────

export const OpenReconciliationSessionCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  bankAccountId: BankAccountIdSchema,
  bankStatementId: BankStatementIdSchema,
  /** Allowed delta in minor units before match is rejected; defaults to "0" */
  toleranceMinor: z.string().default("0"),
});
export type OpenReconciliationSessionCommand = z.infer<
  typeof OpenReconciliationSessionCommandSchema
>;

// ── Add Match ────────────────────────────────────────────────────────────────

export const AddReconciliationMatchCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  reconciliationSessionId: ReconciliationSessionIdSchema,
  /** The statement line being matched */
  statementLineId: z.string().uuid(),
  targetType: ReconciliationTargetTypeSchema,
  /** The AP payment / bank transfer / manual adjustment UUID */
  targetId: z.string().uuid(),
  /** Amount to match in minor units */
  matchedAmountMinor: z.string(),
});
export type AddReconciliationMatchCommand = z.infer<
  typeof AddReconciliationMatchCommandSchema
>;

// ── Remove Match ─────────────────────────────────────────────────────────────

export const RemoveReconciliationMatchCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  reconciliationSessionId: ReconciliationSessionIdSchema,
  matchId: ReconciliationMatchIdSchema,
  reason: z.string().trim().min(1).max(255),
});
export type RemoveReconciliationMatchCommand = z.infer<
  typeof RemoveReconciliationMatchCommandSchema
>;

// ── Close Session ────────────────────────────────────────────────────────────

export const CloseReconciliationSessionCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  reconciliationSessionId: ReconciliationSessionIdSchema,
});
export type CloseReconciliationSessionCommand = z.infer<
  typeof CloseReconciliationSessionCommandSchema
>;

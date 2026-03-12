import { z } from "zod";
import { brandedUuid, OrgIdSchema } from "../../../shared/ids.js";
import { UtcDateTimeSchema } from "../../../shared/datetime.js";
import {
  ReconciliationSessionStatusValues,
  ReconciliationTargetTypeSchema,
  ReconciliationMatchStatusValues,
} from "./treasury-shared.entity.js";
import { BankAccountIdSchema } from "./bank-account.entity.js";
import { BankStatementIdSchema } from "./bank-statement.entity.js";

// ── Reconciliation Session ───────────────────────────────────────────────────

export const ReconciliationSessionIdSchema = brandedUuid("ReconciliationSessionId");
export type ReconciliationSessionId = z.infer<typeof ReconciliationSessionIdSchema>;

export const ReconciliationSessionSchema = z.object({
  id: ReconciliationSessionIdSchema,
  orgId: OrgIdSchema,
  bankAccountId: BankAccountIdSchema,
  bankStatementId: BankStatementIdSchema,
  status: z.enum(ReconciliationSessionStatusValues),
  /** Tolerance in minor units (cents) — stored as string for JSON-safety */
  toleranceMinor: z.string(),
  closedAt: UtcDateTimeSchema.nullable(),
  createdAt: UtcDateTimeSchema,
  updatedAt: UtcDateTimeSchema,
});
export type ReconciliationSession = z.infer<typeof ReconciliationSessionSchema>;

// ── Reconciliation Match ─────────────────────────────────────────────────────

export const ReconciliationMatchIdSchema = brandedUuid("ReconciliationMatchId");
export type ReconciliationMatchId = z.infer<typeof ReconciliationMatchIdSchema>;

export const ReconciliationMatchSchema = z.object({
  id: ReconciliationMatchIdSchema,
  orgId: OrgIdSchema,
  reconciliationSessionId: ReconciliationSessionIdSchema,
  statementLineId: z.string().uuid(),
  targetType: ReconciliationTargetTypeSchema,
  targetId: z.string().uuid(),
  /** Amount matched in minor units, stored as string */
  matchedAmountMinor: z.string(),
  status: z.enum(ReconciliationMatchStatusValues),
  matchedAt: UtcDateTimeSchema,
  unmatchedAt: UtcDateTimeSchema.nullable(),
  createdAt: UtcDateTimeSchema,
});
export type ReconciliationMatch = z.infer<typeof ReconciliationMatchSchema>;

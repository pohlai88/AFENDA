import { z } from "zod";
import { brandedUuid, OrgIdSchema } from "../../../shared/ids.js";
import { UtcDateTimeSchema } from "../../../shared/datetime.js";
import { CurrencyCodeSchema } from "../../../shared/money.js";
import {
  BankAccountStatusValues,
  BankStatementStatusValues,
  StatementLineStatusValues,
  CashMovementDirectionValues,
} from "./treasury-shared.entity.js";
import { BankAccountIdSchema } from "./bank-account.entity.js";

// ── BankStatement (header) ────────────────────────────────────────────────────

export const BankStatementIdSchema = brandedUuid("BankStatementId");
export type BankStatementId = z.infer<typeof BankStatementIdSchema>;

export const BankStatementSchema = z.object({
  id: BankStatementIdSchema,
  orgId: OrgIdSchema,
  bankAccountId: BankAccountIdSchema,
  /** Idempotency key supplied by caller — prevents double-ingestion of same file. */
  sourceRef: z.string().trim().min(1).max(255),
  statementDate: UtcDateTimeSchema,
  openingBalance: z.bigint(),
  closingBalance: z.bigint(),
  currencyCode: CurrencyCodeSchema,
  status: z.enum(BankStatementStatusValues),
  lineCount: z.number().int().nonnegative(),
  failureReason: z.string().nullable(),
  createdAt: UtcDateTimeSchema,
  updatedAt: UtcDateTimeSchema,
});

export type BankStatement = z.infer<typeof BankStatementSchema>;

// ── BankStatementLine ─────────────────────────────────────────────────────────

export const BankStatementLineIdSchema = brandedUuid("BankStatementLineId");
export type BankStatementLineId = z.infer<typeof BankStatementLineIdSchema>;

export const BankStatementLineSchema = z.object({
  id: BankStatementLineIdSchema,
  orgId: OrgIdSchema,
  statementId: BankStatementIdSchema,
  lineNumber: z.number().int().positive(),
  transactionDate: UtcDateTimeSchema,
  valueDate: UtcDateTimeSchema.nullable(),
  description: z.string().trim().max(512),
  reference: z.string().trim().max(128).nullable(),
  amount: z.bigint().positive(),
  direction: z.enum(CashMovementDirectionValues),
  status: z.enum(StatementLineStatusValues),
  createdAt: UtcDateTimeSchema,
});

export type BankStatementLine = z.infer<typeof BankStatementLineSchema>;

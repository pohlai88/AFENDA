import { z } from "zod";
import { TreasuryBaseCommandSchema } from "./treasury-shared.commands.js";
import { BankAccountIdSchema } from "./bank-account.entity.js";
import { BankStatementIdSchema } from "./bank-statement.entity.js";
import { CurrencyCodeSchema } from "../../../shared/money.js";
import { UtcDateTimeSchema } from "../../../shared/datetime.js";
import { CashMovementDirectionValues } from "./treasury-shared.entity.js";

// ── IngestBankStatement ───────────────────────────────────────────────────────
// One command creates the header + lines atomically.

const BankStatementLineInputSchema = z.object({
  lineNumber: z.number().int().positive(),
  transactionDate: UtcDateTimeSchema,
  valueDate: UtcDateTimeSchema.optional().nullable(),
  description: z.string().trim().min(1).max(512),
  reference: z.string().trim().max(128).optional().nullable(),
  /** Minor units (cents). Must be positive — direction carries the sign. */
  amount: z.coerce.bigint().positive(),
  direction: z.enum(CashMovementDirectionValues),
});

export type BankStatementLineInput = z.infer<typeof BankStatementLineInputSchema>;

export const IngestBankStatementCommandSchema = TreasuryBaseCommandSchema.merge(
  z.object({
    bankAccountId: BankAccountIdSchema,
    /**
     * Caller-supplied unique reference for this statement file (e.g. filename
     * hash or bank reference ID).  Used for idempotency — re-submitting the
     * same sourceRef for the same bank account is a no-op.
     */
    sourceRef: z.string().trim().min(1).max(255),
    statementDate: UtcDateTimeSchema,
    openingBalance: z.coerce.bigint(),
    closingBalance: z.coerce.bigint(),
    currencyCode: CurrencyCodeSchema,
    lines: z.array(BankStatementLineInputSchema).min(1).max(5000),
  }),
);

export type IngestBankStatementCommand = z.infer<typeof IngestBankStatementCommandSchema>;

// ── MarkStatementFailed ───────────────────────────────────────────────────────

export const MarkStatementFailedCommandSchema = TreasuryBaseCommandSchema.merge(
  z.object({
    statementId: BankStatementIdSchema,
    failureReason: z.string().trim().min(1).max(512),
  }),
);

export type MarkStatementFailedCommand = z.infer<typeof MarkStatementFailedCommandSchema>;

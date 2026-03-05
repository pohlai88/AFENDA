/**
 * GL write commands — post journal entry, reverse entry.
 *
 * RULES:
 *   1. Structural invariants are enforced here (contracts layer):
 *      balanced debits/credits, min 2 lines, XOR debit-or-credit per line.
 *   2. Policy is enforced in `@afenda/core` (period open, account active, FX).
 *   3. Commands carry `correlationId` so the GL posting can be traced back to
 *      the originating request end-to-end across API, worker, and audit log.
 *   4. `tenantId` is never in the command body — resolved from request context.
 */
import { z } from "zod";
import {
  AccountIdSchema,
  CorrelationIdSchema,
  InvoiceIdSchema,
  JournalEntryIdSchema,
} from "../shared/ids.js";
import { CurrencyCodeSchema } from "../shared/money.js";
import { IdempotencyKeySchema } from "../shared/idempotency.js";

/**
 * A single journal line.
 *
 * Debit/credit are optional on input — omitting one side implies zero.
 * The XOR refine then enforces that exactly one side is positive.
 * Amounts are non-negative safe integers (minor units); sign semantics
 * are expressed by which field is populated, not by negative values.
 */
export const JournalLineInputSchema = z
  .object({
    accountId: AccountIdSchema,

    // Either debitMinor or creditMinor must be > 0; the other must be absent
    // or 0. The refine below enforces this invariant.
    debitMinor: z.coerce
      .bigint()
      .refine((n) => n >= 0n, { message: "debitMinor must be non-negative" })
      .optional(),
    creditMinor: z.coerce
      .bigint()
      .refine((n) => n >= 0n, { message: "creditMinor must be non-negative" })
      .optional(),

    currencyCode: CurrencyCodeSchema,

    memo: z.string().trim().min(1).max(255).optional(),

    // JSON-safe dimension bag. Derivation/allocation rules live in core.
    dimensions: z.record(z.string(), z.string().trim().min(1)).optional(),
  })
  .transform((l) => ({
    ...l,
    debitMinor: l.debitMinor ?? 0n,
    creditMinor: l.creditMinor ?? 0n,
  }))
  .superRefine((l, ctx) => {
    const dPos = l.debitMinor > 0n;
    const cPos = l.creditMinor > 0n;

    if (dPos === cPos) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Each line must have either a debit OR credit (> 0), not both or neither",
        path: ["debitMinor"],
      });
    }
  });

export type JournalLineInput = z.infer<typeof JournalLineInputSchema>;

/**
 * Post a balanced journal entry to the GL.
 *
 * Structural invariants enforced here (contracts layer):
 *   - At least 2 lines
 *   - Σdebits = Σcredits
 *
 * Policy enforced in core (NOT here):
 *   - Period is open
 *   - Posting account is active and permitted
 *   - FX/functional currency conversion
 */
export const PostToGLCommandSchema = z
  .object({
    idempotencyKey: IdempotencyKeySchema,
    correlationId: CorrelationIdSchema,

    // If you need to support non-invoice sources later, replace this with a
    // discriminated "source" union: { sourceType, sourceId }.
    sourceInvoiceId: InvoiceIdSchema.optional(),

    memo: z.string().trim().min(1).max(255).optional(),

    lines: z.array(JournalLineInputSchema).min(2),
  })
  .superRefine((cmd, ctx) => {
    // .safe() on each amount guarantees no overflow in this sum.
    const totalDebits = cmd.lines.reduce((s, l) => s + l.debitMinor, 0n);
    const totalCredits = cmd.lines.reduce((s, l) => s + l.creditMinor, 0n);

    if (totalDebits !== totalCredits) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Journal entry must balance: Σdebits (${totalDebits}) must equal Σcredits (${totalCredits})`,
        path: ["lines"],
      });
    }
  });

export type PostToGLCommand = z.infer<typeof PostToGLCommandSchema>;

export const ReverseEntryCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  correlationId: CorrelationIdSchema,
  journalEntryId: JournalEntryIdSchema,
  memo: z.string().trim().min(1).max(255),
});

export type ReverseEntryCommand = z.infer<typeof ReverseEntryCommandSchema>;

/**
 * Treasury base command schema.
 *
 * Every Treasury command MUST embed `idempotencyKey` as a UUID for exactly-once
 * delivery. Extend with `.merge()`:
 *
 *   export const CreateBankAccountCommandSchema = TreasuryBaseCommandSchema.merge(
 *     z.object({
 *       name: z.string().min(1).max(120),
 *       currencyCode: CurrencyCodeSchema,
 *       bankId: z.string().uuid(),
 *     }),
 *   );
 *
 * The `idempotencyKey` is also the deduplication key stored in the outbox — the
 * same command dispatched twice with identical key produces exactly one side-effect.
 */
import { z } from "zod";

export const TreasuryBaseCommandSchema = z.object({
  /** Caller-generated UUID for exactly-once delivery. Required on all Treasury commands. */
  idempotencyKey: z.string().uuid("idempotencyKey must be a UUID"),
  orgId: z.string().uuid(),
});

export type TreasuryBaseCommand = z.infer<typeof TreasuryBaseCommandSchema>;

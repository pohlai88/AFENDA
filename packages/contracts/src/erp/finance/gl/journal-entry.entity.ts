/**
 * GL journal entry entity — read-side DTO for the `journal_entry` table.
 *
 * RULES:
 *   1. Journal entries are append-only — corrections via reversal entries only.
 *   2. `entryNumber` is a human-readable sequential code (JE-2026-0001).
 *      Uniqueness is enforced per-org by the DB constraint.
 *   3. `reversalOfId` is self-referential — points to the entry being reversed.
 *   4. `sourceInvoiceId` traces which invoice triggered the GL posting (nullable
 *      because manual journal entries have no originating invoice).
 *   5. `idempotencyKey` is nullable — server-side deduplication for commands that
 *      carry it (PostToGL, ReverseEntry). Null for legacy/migrated entries.
 */
import { z } from "zod";
import {
  JournalEntryIdSchema,
  OrgIdSchema,
  PrincipalIdSchema,
  CorrelationIdSchema,
  InvoiceIdSchema,
} from "../../../shared/ids.js";
import { IdempotencyKeySchema } from "../../../kernel/execution/idempotency/request-key.js";
import { UtcDateTimeSchema } from "../../../shared/datetime.js";

export const JournalEntrySchema = z.object({
  id: JournalEntryIdSchema,
  orgId: OrgIdSchema,
  entryNumber: z.string().trim().min(1).max(64),
  postedAt: UtcDateTimeSchema,
  memo: z.string().trim().max(1000).nullable(),
  postedByPrincipalId: PrincipalIdSchema.nullable(),
  correlationId: CorrelationIdSchema,
  idempotencyKey: IdempotencyKeySchema.nullable(),
  sourceInvoiceId: InvoiceIdSchema.nullable(),
  reversalOfId: JournalEntryIdSchema.nullable(),
  createdAt: UtcDateTimeSchema,
});

export type JournalEntry = z.infer<typeof JournalEntrySchema>;

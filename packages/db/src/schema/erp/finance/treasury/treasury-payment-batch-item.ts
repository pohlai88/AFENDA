import { index, pgTable, text, unique, uuid } from "drizzle-orm/pg-core";
import { organization } from "../../../kernel/identity";
import { tsz, rlsOrg } from "../../../_helpers";
import { treasuryPaymentBatch } from "./treasury-payment-batch";
import { treasuryPaymentInstruction } from "./treasury-payment-instruction";

export const treasuryPaymentBatchItem = pgTable(
  "treasury_payment_batch_item",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    batchId: uuid("batch_id")
      .notNull()
      .references(() => treasuryPaymentBatch.id, { onDelete: "cascade" }),
    paymentInstructionId: uuid("payment_instruction_id")
      .notNull()
      .references(() => treasuryPaymentInstruction.id, { onDelete: "restrict" }),
    /** Snapshot of instruction amount at batch creation time */
    amountMinor: text("amount_minor").notNull(),
    createdAt: tsz("created_at").defaultNow().notNull(),
  },
  (t) => [
    unique("treasury_batch_item_batch_instr_uidx").on(t.batchId, t.paymentInstructionId),
    index("treasury_batch_item_org_batch_idx").on(t.orgId, t.batchId),
    index("treasury_batch_item_org_instr_idx").on(t.orgId, t.paymentInstructionId),
    rlsOrg,
  ],
);

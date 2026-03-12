import { bigint, index, pgEnum, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { organization } from "../../../kernel/identity";
import { PaymentInstructionStatusValues, TreasuryPaymentMethodValues } from "@afenda/contracts";
import { tsz, rlsOrg } from "../../../_helpers";
import { bankAccount } from "./bank-account";

export const paymentInstructionStatusEnum = pgEnum(
  "payment_instruction_status",
  PaymentInstructionStatusValues,
);
export const treasuryPaymentMethodEnum = pgEnum("treasury_payment_method", TreasuryPaymentMethodValues);

export const treasuryPaymentInstruction = pgTable(
  "treasury_payment_instruction",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    sourceBankAccountId: uuid("source_bank_account_id")
      .notNull()
      .references(() => bankAccount.id, { onDelete: "restrict" }),
    beneficiaryName: text("beneficiary_name").notNull(),
    beneficiaryAccountNumber: text("beneficiary_account_number").notNull(),
    beneficiaryBankCode: text("beneficiary_bank_code"),
    /** Amount in minor units (cents), stored as text for BigInt safety */
    amountMinor: text("amount_minor").notNull(),
    currencyCode: text("currency_code").notNull(),
    paymentMethod: treasuryPaymentMethodEnum("payment_method").notNull(),
    reference: text("reference"),
    requestedExecutionDate: text("requested_execution_date").notNull(),
    status: paymentInstructionStatusEnum("status").notNull().default("pending"),
    /** Principal who created this instruction (for SOD checks) */
    createdByPrincipalId: uuid("created_by_principal_id"),
    submittedAt: tsz("submitted_at"),
    approvedAt: tsz("approved_at"),
    rejectedAt: tsz("rejected_at"),
    rejectionReason: text("rejection_reason"),
    createdAt: tsz("created_at").defaultNow().notNull(),
    updatedAt: tsz("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("treasury_pi_org_status_idx").on(t.orgId, t.status),
    index("treasury_pi_org_account_idx").on(t.orgId, t.sourceBankAccountId),
    index("treasury_pi_org_exec_date_idx").on(t.orgId, t.requestedExecutionDate),
    rlsOrg,
  ],
);

> Treasury Program Status (Updated: 2026-03-12)
>
> - Wave 1: Fully implemented
> - Wave 2: Fully implemented
> - Wave 3: In active development preparation and implementation

Excellent. Below is **Wave 2 drop-in scaffold** for AFENDA Treasury:

* **Sprint 2.1 — Reconciliation session**
* **Sprint 2.2 — Payment factory baseline**

This follows your same law:

**contracts → db → core → api → worker → web**

and keeps the boundaries clean:

* **AP owns payable eligibility / invoice truth**
* **Treasury owns payment instruction, batching, approval, release, execution governance**
* **Reconciliation owns statement-line matching truth**

---

# Wave 2 target file set

## Contracts

* `packages/contracts/src/erp/finance/treasury/reconciliation-session.entity.ts`
* `packages/contracts/src/erp/finance/treasury/reconciliation-session.commands.ts`
* `packages/contracts/src/erp/finance/treasury/reconciliation-match.entity.ts`
* `packages/contracts/src/erp/finance/treasury/treasury-payment-instruction.entity.ts`
* `packages/contracts/src/erp/finance/treasury/treasury-payment-instruction.commands.ts`
* `packages/contracts/src/erp/finance/treasury/treasury-payment-batch.entity.ts`
* `packages/contracts/src/erp/finance/treasury/treasury-payment-batch.commands.ts`

## DB

* `packages/db/src/schema/erp/finance/treasury/reconciliation-session.table.ts`
* `packages/db/src/schema/erp/finance/treasury/reconciliation-match.table.ts`
* `packages/db/src/schema/erp/finance/treasury/treasury-payment-instruction.table.ts`
* `packages/db/src/schema/erp/finance/treasury/treasury-payment-batch.table.ts`
* `packages/db/src/schema/erp/finance/treasury/treasury-payment-batch-item.table.ts`

## Core

* `packages/core/src/erp/finance/treasury/reconciliation-session.service.ts`
* `packages/core/src/erp/finance/treasury/reconciliation-session.queries.ts`
* `packages/core/src/erp/finance/treasury/treasury-payment-instruction.service.ts`
* `packages/core/src/erp/finance/treasury/treasury-payment-instruction.queries.ts`
* `packages/core/src/erp/finance/treasury/treasury-payment-batch.service.ts`
* `packages/core/src/erp/finance/treasury/treasury-payment-batch.queries.ts`
* `packages/core/src/erp/finance/treasury/calculators/reconciliation.calculator.ts`
* `packages/core/src/erp/finance/treasury/__vitest_test__/reconciliation-session.service.test.ts`
* `packages/core/src/erp/finance/treasury/__vitest_test__/treasury-payment-batch.service.test.ts`

## API

* extend `apps/api/src/routes/erp/finance/treasury.ts`

## Worker

* `apps/worker/src/jobs/erp/finance/treasury/handle-reconciliation-suggested.ts`
* `apps/worker/src/jobs/erp/finance/treasury/handle-payment-released.ts`

## Web

* `apps/web/src/app/(erp)/finance/treasury/reconciliation/page.tsx`
* `apps/web/src/app/(erp)/finance/treasury/payments/page.tsx`

---

# 1. Contracts

## `reconciliation-session.entity.ts`

```ts
import { z } from "zod";

export const reconciliationSessionStatusSchema = z.enum([
  "open",
  "closed",
]);

export const reconciliationTargetTypeSchema = z.enum([
  "ap_payment",
  "ar_receipt",
  "gl_cash_journal",
  "manual_adjustment",
]);

export const reconciliationSessionEntitySchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  bankStatementId: z.string().uuid(),
  bankAccountId: z.string().uuid(),
  statementLineId: z.string().uuid(),
  status: reconciliationSessionStatusSchema,
  currencyCode: z.string().trim().length(3),
  statementLineAmountMinor: z.string(),
  matchedAmountMinor: z.string(),
  toleranceMinor: z.string(),
  openedAt: z.string().datetime(),
  closedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type ReconciliationSessionEntity = z.infer<
  typeof reconciliationSessionEntitySchema
>;
```

---

## `reconciliation-match.entity.ts`

```ts
import { z } from "zod";
import { reconciliationTargetTypeSchema } from "./reconciliation-session.entity";

export const reconciliationMatchStatusSchema = z.enum([
  "matched",
  "unmatched",
]);

export const reconciliationMatchEntitySchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  reconciliationSessionId: z.string().uuid(),
  statementLineId: z.string().uuid(),
  targetType: reconciliationTargetTypeSchema,
  targetId: z.string().uuid(),
  matchedAmountMinor: z.string(),
  status: reconciliationMatchStatusSchema,
  createdAt: z.string().datetime(),
  unmatchedAt: z.string().datetime().nullable(),
});

export type ReconciliationMatchEntity = z.infer<
  typeof reconciliationMatchEntitySchema
>;
```

---

## `reconciliation-session.commands.ts`

```ts
import { z } from "zod";
import { idempotencyKeySchema, orgScopedMetadataSchema } from "./shared";
import { reconciliationTargetTypeSchema } from "./reconciliation-session.entity";

export const openReconciliationSessionCommandSchema = z.object({
  ...orgScopedMetadataSchema.shape,
  idempotencyKey: idempotencyKeySchema,
  statementLineId: z.string().uuid(),
  toleranceMinor: z.string().default("0"),
});

export const addReconciliationMatchCommandSchema = z.object({
  ...orgScopedMetadataSchema.shape,
  idempotencyKey: idempotencyKeySchema,
  reconciliationSessionId: z.string().uuid(),
  targetType: reconciliationTargetTypeSchema,
  targetId: z.string().uuid(),
  matchedAmountMinor: z.string(),
});

export const removeReconciliationMatchCommandSchema = z.object({
  ...orgScopedMetadataSchema.shape,
  idempotencyKey: idempotencyKeySchema,
  reconciliationMatchId: z.string().uuid(),
  reason: z.string().trim().min(1).max(255),
});

export const closeReconciliationSessionCommandSchema = z.object({
  ...orgScopedMetadataSchema.shape,
  idempotencyKey: idempotencyKeySchema,
  reconciliationSessionId: z.string().uuid(),
});

export type OpenReconciliationSessionCommand = z.infer<
  typeof openReconciliationSessionCommandSchema
>;
export type AddReconciliationMatchCommand = z.infer<
  typeof addReconciliationMatchCommandSchema
>;
export type RemoveReconciliationMatchCommand = z.infer<
  typeof removeReconciliationMatchCommandSchema
>;
export type CloseReconciliationSessionCommand = z.infer<
  typeof closeReconciliationSessionCommandSchema
>;
```

---

## `treasury-payment-instruction.entity.ts`

```ts
import { z } from "zod";

export const treasuryPaymentInstructionStatusSchema = z.enum([
  "draft",
  "pending_approval",
  "approved",
  "rejected",
  "batched",
  "released",
  "settled",
  "failed",
  "cancelled",
]);

export const treasuryPaymentMethodSchema = z.enum([
  "bank_transfer",
  "wire",
  "ach",
  "sepa",
  "rtgs",
  "manual",
]);

export const treasuryPaymentInstructionEntitySchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  sourceType: z.enum(["ap_payment_proposal", "manual_treasury_payment"]),
  sourceId: z.string().uuid(),
  bankAccountId: z.string().uuid(),
  beneficiaryName: z.string().trim().min(1).max(255),
  beneficiaryBankRef: z.string().trim().max(255).nullable(),
  paymentMethod: treasuryPaymentMethodSchema,
  currencyCode: z.string().trim().length(3),
  amountMinor: z.string(),
  requestedExecutionDate: z.string().date(),
  status: treasuryPaymentInstructionStatusSchema,
  submittedAt: z.string().datetime().nullable(),
  approvedAt: z.string().datetime().nullable(),
  rejectedAt: z.string().datetime().nullable(),
  releasedAt: z.string().datetime().nullable(),
  settledAt: z.string().datetime().nullable(),
  makerUserId: z.string().uuid(),
  checkerUserId: z.string().uuid().nullable(),
  rejectionReason: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type TreasuryPaymentInstructionEntity = z.infer<
  typeof treasuryPaymentInstructionEntitySchema
>;
```

---

## `treasury-payment-instruction.commands.ts`

```ts
import { z } from "zod";
import { idempotencyKeySchema, orgScopedMetadataSchema } from "./shared";
import { treasuryPaymentMethodSchema } from "./treasury-payment-instruction.entity";

export const createTreasuryPaymentInstructionCommandSchema = z.object({
  ...orgScopedMetadataSchema.shape,
  idempotencyKey: idempotencyKeySchema,
  sourceType: z.enum(["ap_payment_proposal", "manual_treasury_payment"]),
  sourceId: z.string().uuid(),
  bankAccountId: z.string().uuid(),
  beneficiaryName: z.string().trim().min(1).max(255),
  beneficiaryBankRef: z.string().trim().max(255).nullable().optional(),
  paymentMethod: treasuryPaymentMethodSchema,
  currencyCode: z.string().trim().length(3),
  amountMinor: z.string(),
  requestedExecutionDate: z.string().date(),
});

export const submitTreasuryPaymentInstructionCommandSchema = z.object({
  ...orgScopedMetadataSchema.shape,
  idempotencyKey: idempotencyKeySchema,
  paymentInstructionId: z.string().uuid(),
});

export const approveTreasuryPaymentInstructionCommandSchema = z.object({
  ...orgScopedMetadataSchema.shape,
  idempotencyKey: idempotencyKeySchema,
  paymentInstructionId: z.string().uuid(),
});

export const rejectTreasuryPaymentInstructionCommandSchema = z.object({
  ...orgScopedMetadataSchema.shape,
  idempotencyKey: idempotencyKeySchema,
  paymentInstructionId: z.string().uuid(),
  reason: z.string().trim().min(1).max(255),
});

export type CreateTreasuryPaymentInstructionCommand = z.infer<
  typeof createTreasuryPaymentInstructionCommandSchema
>;
export type SubmitTreasuryPaymentInstructionCommand = z.infer<
  typeof submitTreasuryPaymentInstructionCommandSchema
>;
export type ApproveTreasuryPaymentInstructionCommand = z.infer<
  typeof approveTreasuryPaymentInstructionCommandSchema
>;
export type RejectTreasuryPaymentInstructionCommand = z.infer<
  typeof rejectTreasuryPaymentInstructionCommandSchema
>;
```

---

## `treasury-payment-batch.entity.ts`

```ts
import { z } from "zod";

export const treasuryPaymentBatchStatusSchema = z.enum([
  "draft",
  "pending_release",
  "released",
  "partially_settled",
  "settled",
  "failed",
  "cancelled",
]);

export const treasuryPaymentBatchEntitySchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  bankAccountId: z.string().uuid(),
  batchNumber: z.string().trim().min(1).max(64),
  currencyCode: z.string().trim().length(3),
  status: treasuryPaymentBatchStatusSchema,
  totalInstructionCount: z.number().int().nonnegative(),
  totalAmountMinor: z.string(),
  releaseRequestedAt: z.string().datetime().nullable(),
  releasedAt: z.string().datetime().nullable(),
  releasedByUserId: z.string().uuid().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type TreasuryPaymentBatchEntity = z.infer<
  typeof treasuryPaymentBatchEntitySchema
>;
```

---

## `treasury-payment-batch.commands.ts`

```ts
import { z } from "zod";
import { idempotencyKeySchema, orgScopedMetadataSchema } from "./shared";

export const createTreasuryPaymentBatchCommandSchema = z.object({
  ...orgScopedMetadataSchema.shape,
  idempotencyKey: idempotencyKeySchema,
  bankAccountId: z.string().uuid(),
  batchNumber: z.string().trim().min(1).max(64),
  currencyCode: z.string().trim().length(3),
  paymentInstructionIds: z.array(z.string().uuid()).min(1),
});

export const requestTreasuryPaymentBatchReleaseCommandSchema = z.object({
  ...orgScopedMetadataSchema.shape,
  idempotencyKey: idempotencyKeySchema,
  paymentBatchId: z.string().uuid(),
});

export const releaseTreasuryPaymentBatchCommandSchema = z.object({
  ...orgScopedMetadataSchema.shape,
  idempotencyKey: idempotencyKeySchema,
  paymentBatchId: z.string().uuid(),
});

export type CreateTreasuryPaymentBatchCommand = z.infer<
  typeof createTreasuryPaymentBatchCommandSchema
>;
export type RequestTreasuryPaymentBatchReleaseCommand = z.infer<
  typeof requestTreasuryPaymentBatchReleaseCommandSchema
>;
export type ReleaseTreasuryPaymentBatchCommand = z.infer<
  typeof releaseTreasuryPaymentBatchReleaseCommandSchema
>;
```

---

# 2. DB schema

## `reconciliation-session.table.ts`

```ts
import {
  index,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const treasuryReconciliationSessionTable = pgTable(
  "treasury_reconciliation_session",
  {
    id: uuid("id").primaryKey(),
    orgId: uuid("org_id").notNull(),
    bankStatementId: uuid("bank_statement_id").notNull(),
    bankAccountId: uuid("bank_account_id").notNull(),
    statementLineId: uuid("statement_line_id").notNull(),
    status: text("status").notNull(),
    currencyCode: text("currency_code").notNull(),
    statementLineAmountMinor: text("statement_line_amount_minor").notNull(),
    matchedAmountMinor: text("matched_amount_minor").notNull(),
    toleranceMinor: text("tolerance_minor").notNull(),
    openedAt: timestamp("opened_at", { withTimezone: true }).notNull(),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => ({
    orgIdx: index("treasury_reconciliation_session__org_idx").on(table.orgId),
    orgStatementLineIdx: index(
      "treasury_reconciliation_session__org_statement_line_idx",
    ).on(table.orgId, table.statementLineId),
  }),
);
```

---

## `reconciliation-match.table.ts`

```ts
import {
  index,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const treasuryReconciliationMatchTable = pgTable(
  "treasury_reconciliation_match",
  {
    id: uuid("id").primaryKey(),
    orgId: uuid("org_id").notNull(),
    reconciliationSessionId: uuid("reconciliation_session_id").notNull(),
    statementLineId: uuid("statement_line_id").notNull(),
    targetType: text("target_type").notNull(),
    targetId: uuid("target_id").notNull(),
    matchedAmountMinor: text("matched_amount_minor").notNull(),
    status: text("status").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    unmatchedAt: timestamp("unmatched_at", { withTimezone: true }),
  },
  (table) => ({
    orgSessionIdx: index("treasury_reconciliation_match__org_session_idx").on(
      table.orgId,
      table.reconciliationSessionId,
    ),
    orgStatementLineIdx: index(
      "treasury_reconciliation_match__org_statement_line_idx",
    ).on(table.orgId, table.statementLineId),
  }),
);
```

---

## `treasury-payment-instruction.table.ts`

```ts
import {
  index,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const treasuryPaymentInstructionTable = pgTable(
  "treasury_payment_instruction",
  {
    id: uuid("id").primaryKey(),
    orgId: uuid("org_id").notNull(),
    sourceType: text("source_type").notNull(),
    sourceId: uuid("source_id").notNull(),
    bankAccountId: uuid("bank_account_id").notNull(),
    beneficiaryName: text("beneficiary_name").notNull(),
    beneficiaryBankRef: text("beneficiary_bank_ref"),
    paymentMethod: text("payment_method").notNull(),
    currencyCode: text("currency_code").notNull(),
    amountMinor: text("amount_minor").notNull(),
    requestedExecutionDate: text("requested_execution_date").notNull(),
    status: text("status").notNull(),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    rejectedAt: timestamp("rejected_at", { withTimezone: true }),
    releasedAt: timestamp("released_at", { withTimezone: true }),
    settledAt: timestamp("settled_at", { withTimezone: true }),
    makerUserId: uuid("maker_user_id").notNull(),
    checkerUserId: uuid("checker_user_id"),
    rejectionReason: text("rejection_reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => ({
    orgIdx: index("treasury_payment_instruction__org_idx").on(table.orgId),
    orgStatusIdx: index("treasury_payment_instruction__org_status_idx").on(
      table.orgId,
      table.status,
    ),
    orgBankAccountIdx: index(
      "treasury_payment_instruction__org_bank_account_idx",
    ).on(table.orgId, table.bankAccountId),
  }),
);
```

---

## `treasury-payment-batch.table.ts`

```ts
import {
  index,
  pgTable,
  text,
  timestamp,
  uuid,
  integer,
} from "drizzle-orm/pg-core";

export const treasuryPaymentBatchTable = pgTable(
  "treasury_payment_batch",
  {
    id: uuid("id").primaryKey(),
    orgId: uuid("org_id").notNull(),
    bankAccountId: uuid("bank_account_id").notNull(),
    batchNumber: text("batch_number").notNull(),
    currencyCode: text("currency_code").notNull(),
    status: text("status").notNull(),
    totalInstructionCount: integer("total_instruction_count").notNull(),
    totalAmountMinor: text("total_amount_minor").notNull(),
    releaseRequestedAt: timestamp("release_requested_at", { withTimezone: true }),
    releasedAt: timestamp("released_at", { withTimezone: true }),
    releasedByUserId: uuid("released_by_user_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => ({
    orgIdx: index("treasury_payment_batch__org_idx").on(table.orgId),
    orgStatusIdx: index("treasury_payment_batch__org_status_idx").on(
      table.orgId,
      table.status,
    ),
  }),
);
```

---

## `treasury-payment-batch-item.table.ts`

```ts
import {
  index,
  pgTable,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const treasuryPaymentBatchItemTable = pgTable(
  "treasury_payment_batch_item",
  {
    id: uuid("id").primaryKey(),
    orgId: uuid("org_id").notNull(),
    paymentBatchId: uuid("payment_batch_id").notNull(),
    paymentInstructionId: uuid("payment_instruction_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (table) => ({
    orgBatchIdx: index("treasury_payment_batch_item__org_batch_idx").on(
      table.orgId,
      table.paymentBatchId,
    ),
    orgInstructionIdx: index(
      "treasury_payment_batch_item__org_instruction_idx",
    ).on(table.orgId, table.paymentInstructionId),
  }),
);
```

---

# 3. Core calculator

## `calculators/reconciliation.calculator.ts`

```ts
export function addMinor(a: string, b: string): string {
  return (BigInt(a) + BigInt(b)).toString();
}

export function lteMinor(a: string, b: string): boolean {
  return BigInt(a) <= BigInt(b);
}

export function absDiffMinor(a: string, b: string): string {
  const x = BigInt(a);
  const y = BigInt(b);
  return (x >= y ? x - y : y - x).toString();
}

export function isWithinTolerance(params: {
  targetMinor: string;
  matchedMinor: string;
  toleranceMinor: string;
}): boolean {
  return BigInt(absDiffMinor(params.targetMinor, params.matchedMinor)) <= BigInt(params.toleranceMinor);
}
```

---

# 4. Core services

## `reconciliation-session.service.ts`

```ts
import { and, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import {
  addReconciliationMatchCommandSchema,
  closeReconciliationSessionCommandSchema,
  openReconciliationSessionCommandSchema,
  removeReconciliationMatchCommandSchema,
} from "@afenda/contracts/erp/finance/treasury/reconciliation-session.commands";
import {
  treasuryBankStatementLineTable,
} from "@afenda/db/schema/erp/finance/treasury";
import { treasuryReconciliationMatchTable } from "@afenda/db/schema/erp/finance/treasury/reconciliation-match.table";
import { treasuryReconciliationSessionTable } from "@afenda/db/schema/erp/finance/treasury/reconciliation-session.table";
import { addMinor, lteMinor } from "./calculators/reconciliation.calculator";

type DbTx = any;
type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } };

async function emitOutboxEvent(_: DbTx, __: unknown) {}
async function withAudit<T>(_: DbTx, __: unknown, fn: () => Promise<T>) {
  return fn();
}

export class TreasuryReconciliationSessionService {
  constructor(private readonly db: DbTx) {}

  async open(raw: unknown): Promise<ServiceResult<{ id: string }>> {
    const input = openReconciliationSessionCommandSchema.parse(raw);

    const line = await this.db.query.treasuryBankStatementLineTable.findFirst({
      where: and(
        eq(treasuryBankStatementLineTable.orgId, input.orgId),
        eq(treasuryBankStatementLineTable.id, input.statementLineId),
      ),
    });

    if (!line) {
      return {
        ok: false,
        error: {
          code: "TREASURY_RECONCILIATION_STATEMENT_LINE_NOT_FOUND",
          message: "Statement line not found",
        },
      };
    }

    const existing = await this.db.query.treasuryReconciliationSessionTable.findFirst({
      where: and(
        eq(treasuryReconciliationSessionTable.orgId, input.orgId),
        eq(treasuryReconciliationSessionTable.statementLineId, input.statementLineId),
        eq(treasuryReconciliationSessionTable.status, "open"),
      ),
    });

    if (existing) return { ok: true, data: { id: existing.id } };

    const id = randomUUID();
    const now = new Date();

    await withAudit(this.db, {}, async () => {
      await this.db.insert(treasuryReconciliationSessionTable).values({
        id,
        orgId: input.orgId,
        bankStatementId: line.bankStatementId,
        bankAccountId: line.bankAccountId,
        statementLineId: line.id,
        status: "open",
        currencyCode: line.currencyCode,
        statementLineAmountMinor: line.amountMinor,
        matchedAmountMinor: "0",
        toleranceMinor: input.toleranceMinor,
        openedAt: now,
        closedAt: null,
        createdAt: now,
        updatedAt: now,
      });

      await emitOutboxEvent(this.db, {
        eventType: "treasury.reconciliation-session.opened",
        aggregateId: id,
      });
    });

    return { ok: true, data: { id } };
  }

  async addMatch(raw: unknown): Promise<ServiceResult<{ id: string }>> {
    const input = addReconciliationMatchCommandSchema.parse(raw);

    const session = await this.db.query.treasuryReconciliationSessionTable.findFirst({
      where: and(
        eq(treasuryReconciliationSessionTable.orgId, input.orgId),
        eq(treasuryReconciliationSessionTable.id, input.reconciliationSessionId),
      ),
    });

    if (!session) {
      return {
        ok: false,
        error: {
          code: "TREASURY_RECONCILIATION_SESSION_NOT_FOUND",
          message: "Reconciliation session not found",
        },
      };
    }

    if (session.status !== "open") {
      return {
        ok: false,
        error: {
          code: "TREASURY_RECONCILIATION_SESSION_CLOSED",
          message: "Closed session cannot be changed",
        },
      };
    }

    const newMatched = addMinor(session.matchedAmountMinor, input.matchedAmountMinor);
    if (!lteMinor(newMatched, session.statementLineAmountMinor)) {
      return {
        ok: false,
        error: {
          code: "TREASURY_RECONCILIATION_MATCH_EXCEEDS_STATEMENT_AMOUNT",
          message: "Matched sum exceeds statement line amount",
        },
      };
    }

    const id = randomUUID();
    const now = new Date();

    await withAudit(this.db, {}, async () => {
      await this.db.insert(treasuryReconciliationMatchTable).values({
        id,
        orgId: input.orgId,
        reconciliationSessionId: session.id,
        statementLineId: session.statementLineId,
        targetType: input.targetType,
        targetId: input.targetId,
        matchedAmountMinor: input.matchedAmountMinor,
        status: "matched",
        createdAt: now,
        unmatchedAt: null,
      });

      await this.db
        .update(treasuryReconciliationSessionTable)
        .set({
          matchedAmountMinor: newMatched,
          updatedAt: now,
        })
        .where(eq(treasuryReconciliationSessionTable.id, session.id));

      await emitOutboxEvent(this.db, {
        eventType: "treasury.reconciliation-match.added",
        aggregateId: id,
      });
    });

    return { ok: true, data: { id } };
  }

  async removeMatch(raw: unknown): Promise<ServiceResult<{ id: string }>> {
    const input = removeReconciliationMatchCommandSchema.parse(raw);

    const match = await this.db.query.treasuryReconciliationMatchTable.findFirst({
      where: and(
        eq(treasuryReconciliationMatchTable.orgId, input.orgId),
        eq(treasuryReconciliationMatchTable.id, input.reconciliationMatchId),
      ),
    });

    if (!match) {
      return {
        ok: false,
        error: {
          code: "TREASURY_RECONCILIATION_MATCH_NOT_FOUND",
          message: "Reconciliation match not found",
        },
      };
    }

    if (match.status !== "matched") {
      return { ok: true, data: { id: match.id } };
    }

    const session = await this.db.query.treasuryReconciliationSessionTable.findFirst({
      where: and(
        eq(treasuryReconciliationSessionTable.orgId, input.orgId),
        eq(treasuryReconciliationSessionTable.id, match.reconciliationSessionId),
      ),
    });

    if (!session || session.status !== "open") {
      return {
        ok: false,
        error: {
          code: "TREASURY_RECONCILIATION_SESSION_CLOSED",
          message: "Closed session cannot be changed",
        },
      };
    }

    const now = new Date();
    const newMatched = (BigInt(session.matchedAmountMinor) - BigInt(match.matchedAmountMinor)).toString();

    await withAudit(this.db, {}, async () => {
      await this.db
        .update(treasuryReconciliationMatchTable)
        .set({
          status: "unmatched",
          unmatchedAt: now,
        })
        .where(eq(treasuryReconciliationMatchTable.id, match.id));

      await this.db
        .update(treasuryReconciliationSessionTable)
        .set({
          matchedAmountMinor: newMatched,
          updatedAt: now,
        })
        .where(eq(treasuryReconciliationSessionTable.id, session.id));

      await emitOutboxEvent(this.db, {
        eventType: "treasury.reconciliation-match.removed",
        aggregateId: match.id,
      });
    });

    return { ok: true, data: { id: match.id } };
  }

  async close(raw: unknown): Promise<ServiceResult<{ id: string }>> {
    const input = closeReconciliationSessionCommandSchema.parse(raw);

    const session = await this.db.query.treasuryReconciliationSessionTable.findFirst({
      where: and(
        eq(treasuryReconciliationSessionTable.orgId, input.orgId),
        eq(treasuryReconciliationSessionTable.id, input.reconciliationSessionId),
      ),
    });

    if (!session) {
      return {
        ok: false,
        error: {
          code: "TREASURY_RECONCILIATION_SESSION_NOT_FOUND",
          message: "Reconciliation session not found",
        },
      };
    }

    if (session.status === "closed") {
      return { ok: true, data: { id: session.id } };
    }

    const now = new Date();

    await withAudit(this.db, {}, async () => {
      await this.db
        .update(treasuryReconciliationSessionTable)
        .set({
          status: "closed",
          closedAt: now,
          updatedAt: now,
        })
        .where(eq(treasuryReconciliationSessionTable.id, session.id));

      await emitOutboxEvent(this.db, {
        eventType: "treasury.reconciliation-session.closed",
        aggregateId: session.id,
      });
    });

    return { ok: true, data: { id: session.id } };
  }
}
```

---

## `reconciliation-session.queries.ts`

```ts
import { and, desc, eq } from "drizzle-orm";
import { treasuryReconciliationMatchTable } from "@afenda/db/schema/erp/finance/treasury/reconciliation-match.table";
import { treasuryReconciliationSessionTable } from "@afenda/db/schema/erp/finance/treasury/reconciliation-session.table";

type DbTx = any;

export class TreasuryReconciliationSessionQueries {
  constructor(private readonly db: DbTx) {}

  async listOpenByOrg(orgId: string) {
    return this.db
      .select()
      .from(treasuryReconciliationSessionTable)
      .where(
        and(
          eq(treasuryReconciliationSessionTable.orgId, orgId),
          eq(treasuryReconciliationSessionTable.status, "open"),
        ),
      )
      .orderBy(desc(treasuryReconciliationSessionTable.createdAt));
  }

  async getById(orgId: string, sessionId: string) {
    const rows = await this.db
      .select()
      .from(treasuryReconciliationSessionTable)
      .where(
        and(
          eq(treasuryReconciliationSessionTable.orgId, orgId),
          eq(treasuryReconciliationSessionTable.id, sessionId),
        ),
      )
      .limit(1);

    return rows[0] ?? null;
  }

  async listMatches(orgId: string, sessionId: string) {
    return this.db
      .select()
      .from(treasuryReconciliationMatchTable)
      .where(
        and(
          eq(treasuryReconciliationMatchTable.orgId, orgId),
          eq(treasuryReconciliationMatchTable.reconciliationSessionId, sessionId),
        ),
      )
      .orderBy(desc(treasuryReconciliationMatchTable.createdAt));
  }
}
```

---

## `treasury-payment-instruction.service.ts`

```ts
import { and, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import {
  approveTreasuryPaymentInstructionCommandSchema,
  createTreasuryPaymentInstructionCommandSchema,
  rejectTreasuryPaymentInstructionCommandSchema,
  submitTreasuryPaymentInstructionCommandSchema,
} from "@afenda/contracts/erp/finance/treasury/treasury-payment-instruction.commands";
import { treasuryBankAccountTable } from "@afenda/db/schema/erp/finance/treasury";
import { treasuryPaymentInstructionTable } from "@afenda/db/schema/erp/finance/treasury/treasury-payment-instruction.table";

type DbTx = any;
type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } };

async function emitOutboxEvent(_: DbTx, __: unknown) {}
async function withAudit<T>(_: DbTx, __: unknown, fn: () => Promise<T>) {
  return fn();
}

export class TreasuryPaymentInstructionService {
  constructor(private readonly db: DbTx) {}

  async create(raw: unknown): Promise<ServiceResult<{ id: string }>> {
    const input = createTreasuryPaymentInstructionCommandSchema.parse(raw);

    const bankAccount = await this.db.query.treasuryBankAccountTable.findFirst({
      where: and(
        eq(treasuryBankAccountTable.orgId, input.orgId),
        eq(treasuryBankAccountTable.id, input.bankAccountId),
      ),
    });

    if (!bankAccount || bankAccount.status !== "active") {
      return {
        ok: false,
        error: {
          code: "TREASURY_PAYMENT_INSTRUCTION_INVALID_BANK_ACCOUNT",
          message: "Active bank account required",
        },
      };
    }

    const id = randomUUID();
    const now = new Date();

    await withAudit(this.db, {}, async () => {
      await this.db.insert(treasuryPaymentInstructionTable).values({
        id,
        orgId: input.orgId,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        bankAccountId: input.bankAccountId,
        beneficiaryName: input.beneficiaryName,
        beneficiaryBankRef: input.beneficiaryBankRef ?? null,
        paymentMethod: input.paymentMethod,
        currencyCode: input.currencyCode,
        amountMinor: input.amountMinor,
        requestedExecutionDate: input.requestedExecutionDate,
        status: "draft",
        submittedAt: null,
        approvedAt: null,
        rejectedAt: null,
        releasedAt: null,
        settledAt: null,
        makerUserId: input.actorUserId,
        checkerUserId: null,
        rejectionReason: null,
        createdAt: now,
        updatedAt: now,
      });

      await emitOutboxEvent(this.db, {
        eventType: "treasury.payment-instruction.created",
        aggregateId: id,
      });
    });

    return { ok: true, data: { id } };
  }

  async submit(raw: unknown): Promise<ServiceResult<{ id: string }>> {
    const input = submitTreasuryPaymentInstructionCommandSchema.parse(raw);

    const row = await this.db.query.treasuryPaymentInstructionTable.findFirst({
      where: and(
        eq(treasuryPaymentInstructionTable.orgId, input.orgId),
        eq(treasuryPaymentInstructionTable.id, input.paymentInstructionId),
      ),
    });

    if (!row) {
      return {
        ok: false,
        error: {
          code: "TREASURY_PAYMENT_INSTRUCTION_NOT_FOUND",
          message: "Payment instruction not found",
        },
      };
    }

    if (row.status !== "draft") {
      return {
        ok: false,
        error: {
          code: "TREASURY_PAYMENT_INSTRUCTION_ILLEGAL_TRANSITION",
          message: "Only draft payment instructions can be submitted",
        },
      };
    }

    const now = new Date();

    await withAudit(this.db, {}, async () => {
      await this.db
        .update(treasuryPaymentInstructionTable)
        .set({
          status: "pending_approval",
          submittedAt: now,
          updatedAt: now,
        })
        .where(eq(treasuryPaymentInstructionTable.id, row.id));

      await emitOutboxEvent(this.db, {
        eventType: "treasury.payment-instruction.submitted",
        aggregateId: row.id,
      });
    });

    return { ok: true, data: { id: row.id } };
  }

  async approve(raw: unknown): Promise<ServiceResult<{ id: string }>> {
    const input = approveTreasuryPaymentInstructionCommandSchema.parse(raw);

    const row = await this.db.query.treasuryPaymentInstructionTable.findFirst({
      where: and(
        eq(treasuryPaymentInstructionTable.orgId, input.orgId),
        eq(treasuryPaymentInstructionTable.id, input.paymentInstructionId),
      ),
    });

    if (!row) {
      return {
        ok: false,
        error: {
          code: "TREASURY_PAYMENT_INSTRUCTION_NOT_FOUND",
          message: "Payment instruction not found",
        },
      };
    }

    if (row.status !== "pending_approval") {
      return {
        ok: false,
        error: {
          code: "TREASURY_PAYMENT_INSTRUCTION_ILLEGAL_TRANSITION",
          message: "Only pending approval instructions can be approved",
        },
      };
    }

    if (row.makerUserId === input.actorUserId) {
      return {
        ok: false,
        error: {
          code: "TREASURY_PAYMENT_SOD_VIOLATION",
          message: "Maker-checker violation",
        },
      };
    }

    const now = new Date();

    await withAudit(this.db, {}, async () => {
      await this.db
        .update(treasuryPaymentInstructionTable)
        .set({
          status: "approved",
          approvedAt: now,
          checkerUserId: input.actorUserId,
          updatedAt: now,
        })
        .where(eq(treasuryPaymentInstructionTable.id, row.id));

      await emitOutboxEvent(this.db, {
        eventType: "treasury.payment-instruction.approved",
        aggregateId: row.id,
      });
    });

    return { ok: true, data: { id: row.id } };
  }

  async reject(raw: unknown): Promise<ServiceResult<{ id: string }>> {
    const input = rejectTreasuryPaymentInstructionCommandSchema.parse(raw);

    const row = await this.db.query.treasuryPaymentInstructionTable.findFirst({
      where: and(
        eq(treasuryPaymentInstructionTable.orgId, input.orgId),
        eq(treasuryPaymentInstructionTable.id, input.paymentInstructionId),
      ),
    });

    if (!row) {
      return {
        ok: false,
        error: {
          code: "TREASURY_PAYMENT_INSTRUCTION_NOT_FOUND",
          message: "Payment instruction not found",
        },
      };
    }

    if (row.status !== "pending_approval") {
      return {
        ok: false,
        error: {
          code: "TREASURY_PAYMENT_INSTRUCTION_ILLEGAL_TRANSITION",
          message: "Only pending approval instructions can be rejected",
        },
      };
    }

    const now = new Date();

    await withAudit(this.db, {}, async () => {
      await this.db
        .update(treasuryPaymentInstructionTable)
        .set({
          status: "rejected",
          rejectedAt: now,
          checkerUserId: input.actorUserId,
          rejectionReason: input.reason,
          updatedAt: now,
        })
        .where(eq(treasuryPaymentInstructionTable.id, row.id));

      await emitOutboxEvent(this.db, {
        eventType: "treasury.payment-instruction.rejected",
        aggregateId: row.id,
      });
    });

    return { ok: true, data: { id: row.id } };
  }
}
```

---

## `treasury-payment-instruction.queries.ts`

```ts
import { and, desc, eq } from "drizzle-orm";
import { treasuryPaymentInstructionTable } from "@afenda/db/schema/erp/finance/treasury/treasury-payment-instruction.table";

type DbTx = any;

export class TreasuryPaymentInstructionQueries {
  constructor(private readonly db: DbTx) {}

  async listByOrg(orgId: string) {
    return this.db
      .select()
      .from(treasuryPaymentInstructionTable)
      .where(eq(treasuryPaymentInstructionTable.orgId, orgId))
      .orderBy(desc(treasuryPaymentInstructionTable.createdAt));
  }

  async listApprovedUnbatchedByOrg(orgId: string) {
    return this.db
      .select()
      .from(treasuryPaymentInstructionTable)
      .where(
        and(
          eq(treasuryPaymentInstructionTable.orgId, orgId),
          eq(treasuryPaymentInstructionTable.status, "approved"),
        ),
      )
      .orderBy(desc(treasuryPaymentInstructionTable.createdAt));
  }
}
```

---

## `treasury-payment-batch.service.ts`

```ts
import { and, eq, inArray } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import {
  createTreasuryPaymentBatchCommandSchema,
  releaseTreasuryPaymentBatchCommandSchema,
  requestTreasuryPaymentBatchReleaseCommandSchema,
} from "@afenda/contracts/erp/finance/treasury/treasury-payment-batch.commands";
import { treasuryPaymentBatchItemTable } from "@afenda/db/schema/erp/finance/treasury/treasury-payment-batch-item.table";
import { treasuryPaymentBatchTable } from "@afenda/db/schema/erp/finance/treasury/treasury-payment-batch.table";
import { treasuryPaymentInstructionTable } from "@afenda/db/schema/erp/finance/treasury/treasury-payment-instruction.table";

type DbTx = any;
type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } };

async function emitOutboxEvent(_: DbTx, __: unknown) {}
async function withAudit<T>(_: DbTx, __: unknown, fn: () => Promise<T>) {
  return fn();
}

export class TreasuryPaymentBatchService {
  constructor(private readonly db: DbTx) {}

  async create(raw: unknown): Promise<ServiceResult<{ id: string }>> {
    const input = createTreasuryPaymentBatchCommandSchema.parse(raw);

    const instructions = await this.db
      .select()
      .from(treasuryPaymentInstructionTable)
      .where(
        and(
          eq(treasuryPaymentInstructionTable.orgId, input.orgId),
          inArray(treasuryPaymentInstructionTable.id, input.paymentInstructionIds),
        ),
      );

    if (instructions.length !== input.paymentInstructionIds.length) {
      return {
        ok: false,
        error: {
          code: "TREASURY_PAYMENT_BATCH_INSTRUCTION_NOT_FOUND",
          message: "One or more payment instructions not found",
        },
      };
    }

    for (const row of instructions) {
      if (row.status !== "approved") {
        return {
          ok: false,
          error: {
            code: "TREASURY_PAYMENT_BATCH_INSTRUCTION_NOT_APPROVED",
            message: "Only approved instructions can be batched",
          },
        };
      }

      if (row.bankAccountId !== input.bankAccountId || row.currencyCode !== input.currencyCode) {
        return {
          ok: false,
          error: {
            code: "TREASURY_PAYMENT_BATCH_DIMENSION_MISMATCH",
            message: "All instructions must share bank account and currency",
          },
        };
      }
    }

    const totalAmountMinor = instructions
      .reduce((sum: bigint, row: any) => sum + BigInt(row.amountMinor), 0n)
      .toString();

    const id = randomUUID();
    const now = new Date();

    await withAudit(this.db, {}, async () => {
      await this.db.insert(treasuryPaymentBatchTable).values({
        id,
        orgId: input.orgId,
        bankAccountId: input.bankAccountId,
        batchNumber: input.batchNumber,
        currencyCode: input.currencyCode,
        status: "draft",
        totalInstructionCount: instructions.length,
        totalAmountMinor,
        releaseRequestedAt: null,
        releasedAt: null,
        releasedByUserId: null,
        createdAt: now,
        updatedAt: now,
      });

      for (const row of instructions) {
        await this.db.insert(treasuryPaymentBatchItemTable).values({
          id: randomUUID(),
          orgId: input.orgId,
          paymentBatchId: id,
          paymentInstructionId: row.id,
          createdAt: now,
        });

        await this.db
          .update(treasuryPaymentInstructionTable)
          .set({
            status: "batched",
            updatedAt: now,
          })
          .where(eq(treasuryPaymentInstructionTable.id, row.id));
      }

      await emitOutboxEvent(this.db, {
        eventType: "treasury.payment-batch.created",
        aggregateId: id,
      });
    });

    return { ok: true, data: { id } };
  }

  async requestRelease(raw: unknown): Promise<ServiceResult<{ id: string }>> {
    const input = requestTreasuryPaymentBatchReleaseCommandSchema.parse(raw);

    const batch = await this.db.query.treasuryPaymentBatchTable.findFirst({
      where: and(
        eq(treasuryPaymentBatchTable.orgId, input.orgId),
        eq(treasuryPaymentBatchTable.id, input.paymentBatchId),
      ),
    });

    if (!batch) {
      return {
        ok: false,
        error: {
          code: "TREASURY_PAYMENT_BATCH_NOT_FOUND",
          message: "Payment batch not found",
        },
      };
    }

    if (batch.status !== "draft") {
      return {
        ok: false,
        error: {
          code: "TREASURY_PAYMENT_BATCH_ILLEGAL_TRANSITION",
          message: "Only draft batch can request release",
        },
      };
    }

    const now = new Date();

    await withAudit(this.db, {}, async () => {
      await this.db
        .update(treasuryPaymentBatchTable)
        .set({
          status: "pending_release",
          releaseRequestedAt: now,
          updatedAt: now,
        })
        .where(eq(treasuryPaymentBatchTable.id, batch.id));

      await emitOutboxEvent(this.db, {
        eventType: "treasury.payment-batch.release-requested",
        aggregateId: batch.id,
      });
    });

    return { ok: true, data: { id: batch.id } };
  }

  async release(raw: unknown): Promise<ServiceResult<{ id: string }>> {
    const input = releaseTreasuryPaymentBatchCommandSchema.parse(raw);

    const batch = await this.db.query.treasuryPaymentBatchTable.findFirst({
      where: and(
        eq(treasuryPaymentBatchTable.orgId, input.orgId),
        eq(treasuryPaymentBatchTable.id, input.paymentBatchId),
      ),
    });

    if (!batch) {
      return {
        ok: false,
        error: {
          code: "TREASURY_PAYMENT_BATCH_NOT_FOUND",
          message: "Payment batch not found",
        },
      };
    }

    if (batch.status !== "pending_release") {
      return {
        ok: false,
        error: {
          code: "TREASURY_PAYMENT_BATCH_ILLEGAL_TRANSITION",
          message: "Only pending_release batch can be released",
        },
      };
    }

    const items = await this.db
      .select()
      .from(treasuryPaymentBatchItemTable)
      .where(
        and(
          eq(treasuryPaymentBatchItemTable.orgId, input.orgId),
          eq(treasuryPaymentBatchItemTable.paymentBatchId, batch.id),
        ),
      );

    const instructionIds = items.map((x: any) => x.paymentInstructionId);
    const instructions = instructionIds.length
      ? await this.db
          .select()
          .from(treasuryPaymentInstructionTable)
          .where(
            and(
              eq(treasuryPaymentInstructionTable.orgId, input.orgId),
              inArray(treasuryPaymentInstructionTable.id, instructionIds),
            ),
          )
      : [];

    for (const row of instructions) {
      if (row.makerUserId === input.actorUserId) {
        return {
          ok: false,
          error: {
            code: "TREASURY_PAYMENT_SOD_VIOLATION",
            message: "Batch releaser cannot be maker of underlying instruction",
          },
        };
      }
    }

    const now = new Date();

    await withAudit(this.db, {}, async () => {
      await this.db
        .update(treasuryPaymentBatchTable)
        .set({
          status: "released",
          releasedAt: now,
          releasedByUserId: input.actorUserId,
          updatedAt: now,
        })
        .where(eq(treasuryPaymentBatchTable.id, batch.id));

      for (const row of instructions) {
        await this.db
          .update(treasuryPaymentInstructionTable)
          .set({
            status: "released",
            releasedAt: now,
            updatedAt: now,
          })
          .where(eq(treasuryPaymentInstructionTable.id, row.id));
      }

      await emitOutboxEvent(this.db, {
        eventType: "treasury.payment-batch.released",
        aggregateId: batch.id,
      });
    });

    return { ok: true, data: { id: batch.id } };
  }
}
```

---

## `treasury-payment-batch.queries.ts`

```ts
import { and, desc, eq } from "drizzle-orm";
import { treasuryPaymentBatchItemTable } from "@afenda/db/schema/erp/finance/treasury/treasury-payment-batch-item.table";
import { treasuryPaymentBatchTable } from "@afenda/db/schema/erp/finance/treasury/treasury-payment-batch.table";

type DbTx = any;

export class TreasuryPaymentBatchQueries {
  constructor(private readonly db: DbTx) {}

  async listByOrg(orgId: string) {
    return this.db
      .select()
      .from(treasuryPaymentBatchTable)
      .where(eq(treasuryPaymentBatchTable.orgId, orgId))
      .orderBy(desc(treasuryPaymentBatchTable.createdAt));
  }

  async getById(orgId: string, batchId: string) {
    const rows = await this.db
      .select()
      .from(treasuryPaymentBatchTable)
      .where(
        and(
          eq(treasuryPaymentBatchTable.orgId, orgId),
          eq(treasuryPaymentBatchTable.id, batchId),
        ),
      )
      .limit(1);

    return rows[0] ?? null;
  }

  async listItems(orgId: string, batchId: string) {
    return this.db
      .select()
      .from(treasuryPaymentBatchItemTable)
      .where(
        and(
          eq(treasuryPaymentBatchItemTable.orgId, orgId),
          eq(treasuryPaymentBatchItemTable.paymentBatchId, batchId),
        ),
      )
      .orderBy(desc(treasuryPaymentBatchItemTable.createdAt));
  }
}
```

---

# 5. API route extensions

Add these into `apps/api/src/routes/erp/finance/treasury.ts`.

```ts
import {
  addReconciliationMatchCommandSchema,
  closeReconciliationSessionCommandSchema,
  openReconciliationSessionCommandSchema,
  removeReconciliationMatchCommandSchema,
} from "@afenda/contracts/erp/finance/treasury/reconciliation-session.commands";
import {
  approveTreasuryPaymentInstructionCommandSchema,
  createTreasuryPaymentInstructionCommandSchema,
  rejectTreasuryPaymentInstructionCommandSchema,
  submitTreasuryPaymentInstructionCommandSchema,
} from "@afenda/contracts/erp/finance/treasury/treasury-payment-instruction.commands";
import {
  createTreasuryPaymentBatchCommandSchema,
  releaseTreasuryPaymentBatchCommandSchema,
  requestTreasuryPaymentBatchReleaseCommandSchema,
} from "@afenda/contracts/erp/finance/treasury/treasury-payment-batch.commands";
import {
  TreasuryPaymentBatchQueries,
  TreasuryPaymentBatchService,
  TreasuryPaymentInstructionQueries,
  TreasuryPaymentInstructionService,
  TreasuryReconciliationSessionQueries,
  TreasuryReconciliationSessionService,
} from "@afenda/core/erp/finance/treasury";
```

```ts
  app.post("/v1/commands/erp/finance/treasury/reconciliation/open", async (req, reply) => {
    const input = openReconciliationSessionCommandSchema.parse(req.body);
    const service = new TreasuryReconciliationSessionService(app.db);
    const result = await service.open(input);
    if (!result.ok) return reply.code(400).send(result.error);
    return reply.code(201).send(result.data);
  });

  app.post("/v1/commands/erp/finance/treasury/reconciliation/add-match", async (req, reply) => {
    const input = addReconciliationMatchCommandSchema.parse(req.body);
    const service = new TreasuryReconciliationSessionService(app.db);
    const result = await service.addMatch(input);
    if (!result.ok) return reply.code(400).send(result.error);
    return reply.send(result.data);
  });

  app.post("/v1/commands/erp/finance/treasury/reconciliation/remove-match", async (req, reply) => {
    const input = removeReconciliationMatchCommandSchema.parse(req.body);
    const service = new TreasuryReconciliationSessionService(app.db);
    const result = await service.removeMatch(input);
    if (!result.ok) return reply.code(400).send(result.error);
    return reply.send(result.data);
  });

  app.post("/v1/commands/erp/finance/treasury/reconciliation/close", async (req, reply) => {
    const input = closeReconciliationSessionCommandSchema.parse(req.body);
    const service = new TreasuryReconciliationSessionService(app.db);
    const result = await service.close(input);
    if (!result.ok) return reply.code(400).send(result.error);
    return reply.send(result.data);
  });

  app.get("/v1/erp/finance/treasury/reconciliation/sessions", async (req: any) => {
    const queries = new TreasuryReconciliationSessionQueries(app.db);
    return queries.listOpenByOrg(req.user.orgId);
  });

  app.get("/v1/erp/finance/treasury/reconciliation/sessions/:id", async (req: any, reply) => {
    const queries = new TreasuryReconciliationSessionQueries(app.db);
    const session = await queries.getById(req.user.orgId, req.params.id);
    if (!session) return reply.code(404).send({ code: "NOT_FOUND" });
    const matches = await queries.listMatches(req.user.orgId, req.params.id);
    return { session, matches };
  });

  app.post("/v1/commands/erp/finance/treasury/payment-instructions/create", async (req, reply) => {
    const input = createTreasuryPaymentInstructionCommandSchema.parse(req.body);
    const service = new TreasuryPaymentInstructionService(app.db);
    const result = await service.create(input);
    if (!result.ok) return reply.code(400).send(result.error);
    return reply.code(201).send(result.data);
  });

  app.post("/v1/commands/erp/finance/treasury/payment-instructions/submit", async (req, reply) => {
    const input = submitTreasuryPaymentInstructionCommandSchema.parse(req.body);
    const service = new TreasuryPaymentInstructionService(app.db);
    const result = await service.submit(input);
    if (!result.ok) return reply.code(400).send(result.error);
    return reply.send(result.data);
  });

  app.post("/v1/commands/erp/finance/treasury/payment-instructions/approve", async (req, reply) => {
    const input = approveTreasuryPaymentInstructionCommandSchema.parse(req.body);
    const service = new TreasuryPaymentInstructionService(app.db);
    const result = await service.approve(input);
    if (!result.ok) return reply.code(400).send(result.error);
    return reply.send(result.data);
  });

  app.post("/v1/commands/erp/finance/treasury/payment-instructions/reject", async (req, reply) => {
    const input = rejectTreasuryPaymentInstructionCommandSchema.parse(req.body);
    const service = new TreasuryPaymentInstructionService(app.db);
    const result = await service.reject(input);
    if (!result.ok) return reply.code(400).send(result.error);
    return reply.send(result.data);
  });

  app.get("/v1/erp/finance/treasury/payment-instructions", async (req: any) => {
    const queries = new TreasuryPaymentInstructionQueries(app.db);
    return queries.listByOrg(req.user.orgId);
  });

  app.post("/v1/commands/erp/finance/treasury/payment-batches/create", async (req, reply) => {
    const input = createTreasuryPaymentBatchCommandSchema.parse(req.body);
    const service = new TreasuryPaymentBatchService(app.db);
    const result = await service.create(input);
    if (!result.ok) return reply.code(400).send(result.error);
    return reply.code(201).send(result.data);
  });

  app.post("/v1/commands/erp/finance/treasury/payment-batches/request-release", async (req, reply) => {
    const input = requestTreasuryPaymentBatchReleaseCommandSchema.parse(req.body);
    const service = new TreasuryPaymentBatchService(app.db);
    const result = await service.requestRelease(input);
    if (!result.ok) return reply.code(400).send(result.error);
    return reply.send(result.data);
  });

  app.post("/v1/commands/erp/finance/treasury/payment-batches/release", async (req, reply) => {
    const input = releaseTreasuryPaymentBatchCommandSchema.parse(req.body);
    const service = new TreasuryPaymentBatchService(app.db);
    const result = await service.release(input);
    if (!result.ok) return reply.code(400).send(result.error);
    return reply.send(result.data);
  });

  app.get("/v1/erp/finance/treasury/payment-batches", async (req: any) => {
    const queries = new TreasuryPaymentBatchQueries(app.db);
    return queries.listByOrg(req.user.orgId);
  });
```

---

# 6. Worker jobs

## `handle-reconciliation-suggested.ts`

```ts
type JobContext = {
  logger: {
    info: (payload: Record<string, unknown>, msg?: string) => void;
  };
};

export async function handleReconciliationSuggested(
  ctx: JobContext,
  event: {
    orgId: string;
    statementLineId: string;
    correlationId: string;
  },
) {
  ctx.logger.info(
    {
      orgId: event.orgId,
      statementLineId: event.statementLineId,
      correlationId: event.correlationId,
    },
    "Handling treasury reconciliation suggestion",
  );

  return { ok: true };
}
```

---

## `handle-payment-released.ts`

```ts
type JobContext = {
  logger: {
    info: (payload: Record<string, unknown>, msg?: string) => void;
  };
};

export async function handlePaymentReleased(
  ctx: JobContext,
  event: {
    orgId: string;
    paymentBatchId: string;
    correlationId: string;
  },
) {
  ctx.logger.info(
    {
      orgId: event.orgId,
      paymentBatchId: event.paymentBatchId,
      correlationId: event.correlationId,
    },
    "Handling treasury payment batch released",
  );

  // next step:
  // 1. connector adapter dispatch
  // 2. bank submission tracking
  // 3. execution status callback intake

  return { ok: true };
}
```

---

# 7. Web actions

Add into `apps/web/src/app/(erp)/finance/treasury/actions.ts`.

```ts
export async function openReconciliationSessionAction(formData: FormData) {
  await postJson("/v1/commands/erp/finance/treasury/reconciliation/open", {
    orgId: formData.get("orgId"),
    actorUserId: formData.get("actorUserId"),
    correlationId: crypto.randomUUID(),
    idempotencyKey: crypto.randomUUID(),
    statementLineId: formData.get("statementLineId"),
    toleranceMinor: formData.get("toleranceMinor") || "0",
  });

  revalidatePath("/finance/treasury/reconciliation");
}

export async function createTreasuryPaymentInstructionAction(formData: FormData) {
  await postJson("/v1/commands/erp/finance/treasury/payment-instructions/create", {
    orgId: formData.get("orgId"),
    actorUserId: formData.get("actorUserId"),
    correlationId: crypto.randomUUID(),
    idempotencyKey: crypto.randomUUID(),
    sourceType: formData.get("sourceType"),
    sourceId: formData.get("sourceId"),
    bankAccountId: formData.get("bankAccountId"),
    beneficiaryName: formData.get("beneficiaryName"),
    beneficiaryBankRef: formData.get("beneficiaryBankRef") || null,
    paymentMethod: formData.get("paymentMethod"),
    currencyCode: formData.get("currencyCode"),
    amountMinor: formData.get("amountMinor"),
    requestedExecutionDate: formData.get("requestedExecutionDate"),
  });

  revalidatePath("/finance/treasury/payments");
}
```

---

# 8. Web pages

## `reconciliation/page.tsx`

```tsx
import { openReconciliationSessionAction } from "../actions";
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from "@afenda/ui";

const API_BASE_URL = process.env.API_BASE_URL!;

async function getSessions() {
  const res = await fetch(`${API_BASE_URL}/v1/erp/finance/treasury/reconciliation/sessions`, {
    cache: "no-store",
  });
  if (!res.ok) return [];
  return res.json();
}

export default async function TreasuryReconciliationPage() {
  const rows = await getSessions();

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Treasury Reconciliation</h1>
        <p className="text-sm text-muted-foreground">
          Deterministic statement-line matching with closed-session immutability.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Open reconciliation session</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={openReconciliationSessionAction} className="grid gap-4 md:grid-cols-2">
            <input type="hidden" name="orgId" value="00000000-0000-0000-0000-000000000001" />
            <input type="hidden" name="actorUserId" value="00000000-0000-0000-0000-000000000002" />

            <div className="space-y-2">
              <Label htmlFor="statementLineId">Statement line ID</Label>
              <Input id="statementLineId" name="statementLineId" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="toleranceMinor">Tolerance minor</Label>
              <Input id="toleranceMinor" name="toleranceMinor" defaultValue="0" />
            </div>

            <div className="md:col-span-2">
              <Button type="submit">Open session</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Open sessions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">No open sessions.</p>
            ) : (
              rows.map((row: any) => (
                <div key={row.id} className="rounded-xl border p-4">
                  <div className="font-medium">{row.id}</div>
                  <div className="text-sm text-muted-foreground">
                    matched {row.matchedAmountMinor} / {row.statementLineAmountMinor} {row.currencyCode}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## `payments/page.tsx`

```tsx
import { createTreasuryPaymentInstructionAction } from "../actions";
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from "@afenda/ui";

const API_BASE_URL = process.env.API_BASE_URL!;

async function getInstructions() {
  const res = await fetch(`${API_BASE_URL}/v1/erp/finance/treasury/payment-instructions`, {
    cache: "no-store",
  });
  if (!res.ok) return [];
  return res.json();
}

async function getBatches() {
  const res = await fetch(`${API_BASE_URL}/v1/erp/finance/treasury/payment-batches`, {
    cache: "no-store",
  });
  if (!res.ok) return [];
  return res.json();
}

export default async function TreasuryPaymentsPage() {
  const [instructions, batches] = await Promise.all([getInstructions(), getBatches()]);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Treasury Payments</h1>
        <p className="text-sm text-muted-foreground">
          Payment instruction approval, batching, and release governance.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create payment instruction</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createTreasuryPaymentInstructionAction} className="grid gap-4 md:grid-cols-2">
            <input type="hidden" name="orgId" value="00000000-0000-0000-0000-000000000001" />
            <input type="hidden" name="actorUserId" value="00000000-0000-0000-0000-000000000002" />

            <div className="space-y-2">
              <Label htmlFor="sourceType">Source type</Label>
              <Input id="sourceType" name="sourceType" defaultValue="manual_treasury_payment" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sourceId">Source ID</Label>
              <Input id="sourceId" name="sourceId" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bankAccountId">Bank account ID</Label>
              <Input id="bankAccountId" name="bankAccountId" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="beneficiaryName">Beneficiary</Label>
              <Input id="beneficiaryName" name="beneficiaryName" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="beneficiaryBankRef">Beneficiary bank ref</Label>
              <Input id="beneficiaryBankRef" name="beneficiaryBankRef" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentMethod">Payment method</Label>
              <Input id="paymentMethod" name="paymentMethod" defaultValue="bank_transfer" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="currencyCode">Currency</Label>
              <Input id="currencyCode" name="currencyCode" defaultValue="USD" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="amountMinor">Amount minor</Label>
              <Input id="amountMinor" name="amountMinor" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="requestedExecutionDate">Execution date</Label>
              <Input id="requestedExecutionDate" name="requestedExecutionDate" type="date" required />
            </div>

            <div className="md:col-span-2">
              <Button type="submit">Create instruction</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payment instructions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {instructions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No payment instructions.</p>
            ) : (
              instructions.map((row: any) => (
                <div key={row.id} className="flex items-center justify-between rounded-xl border p-4">
                  <div>
                    <div className="font-medium">{row.beneficiaryName}</div>
                    <div className="text-sm text-muted-foreground">
                      {row.amountMinor} {row.currencyCode} · {row.paymentMethod}
                    </div>
                  </div>
                  <div className="text-sm">{row.status}</div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payment batches</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {batches.length === 0 ? (
              <p className="text-sm text-muted-foreground">No payment batches.</p>
            ) : (
              batches.map((row: any) => (
                <div key={row.id} className="flex items-center justify-between rounded-xl border p-4">
                  <div>
                    <div className="font-medium">{row.batchNumber}</div>
                    <div className="text-sm text-muted-foreground">
                      {row.totalInstructionCount} instructions · {row.totalAmountMinor} {row.currencyCode}
                    </div>
                  </div>
                  <div className="text-sm">{row.status}</div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

---

# 9. Tests

## `reconciliation-session.service.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { TreasuryReconciliationSessionService } from "../reconciliation-session.service";

describe("TreasuryReconciliationSessionService", () => {
  it("blocks match amount exceeding statement line amount", async () => {
    const db = {
      query: {
        treasuryReconciliationSessionTable: {
          findFirst: async () => ({
            id: "session-1",
            orgId: "org-1",
            status: "open",
            statementLineId: "line-1",
            statementLineAmountMinor: "100",
            matchedAmountMinor: "90",
          }),
        },
      },
    };

    const service = new TreasuryReconciliationSessionService(db as any);

    const result = await service.addMatch({
      orgId: "org-1",
      actorUserId: "user-1",
      correlationId: "corr-1",
      idempotencyKey: "idem-1",
      reconciliationSessionId: "session-1",
      targetType: "ap_payment",
      targetId: "00000000-0000-0000-0000-000000000010",
      matchedAmountMinor: "20",
    });

    expect(result.ok).toBe(false);
  });
});
```

---

## `treasury-payment-batch.service.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { TreasuryPaymentBatchService } from "../treasury-payment-batch.service";

describe("TreasuryPaymentBatchService", () => {
  it("blocks batching of non-approved instructions", async () => {
    const db = {
      select: () => ({
        from: () => ({
          where: async () => [
            {
              id: "pi-1",
              status: "draft",
              bankAccountId: "ba-1",
              currencyCode: "USD",
              amountMinor: "100",
            },
          ],
        }),
      }),
    };

    const service = new TreasuryPaymentBatchService(db as any);

    const result = await service.create({
      orgId: "00000000-0000-0000-0000-000000000001",
      actorUserId: "00000000-0000-0000-0000-000000000002",
      correlationId: "corr-1",
      idempotencyKey: "idem-1",
      bankAccountId: "ba-1",
      batchNumber: "PB-0001",
      currencyCode: "USD",
      paymentInstructionIds: ["pi-1"],
    });

    expect(result.ok).toBe(false);
  });
});
```

---

# 10. Migration starter

## `packages/db/drizzle/<timestamp>_treasury_wave_2.sql`

```sql
CREATE TABLE treasury_reconciliation_session (
  id uuid PRIMARY KEY,
  org_id uuid NOT NULL,
  bank_statement_id uuid NOT NULL,
  bank_account_id uuid NOT NULL,
  statement_line_id uuid NOT NULL,
  status text NOT NULL,
  currency_code text NOT NULL,
  statement_line_amount_minor text NOT NULL,
  matched_amount_minor text NOT NULL,
  tolerance_minor text NOT NULL,
  opened_at timestamptz NOT NULL,
  closed_at timestamptz,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);

CREATE TABLE treasury_reconciliation_match (
  id uuid PRIMARY KEY,
  org_id uuid NOT NULL,
  reconciliation_session_id uuid NOT NULL,
  statement_line_id uuid NOT NULL,
  target_type text NOT NULL,
  target_id uuid NOT NULL,
  matched_amount_minor text NOT NULL,
  status text NOT NULL,
  created_at timestamptz NOT NULL,
  unmatched_at timestamptz
);

CREATE TABLE treasury_payment_instruction (
  id uuid PRIMARY KEY,
  org_id uuid NOT NULL,
  source_type text NOT NULL,
  source_id uuid NOT NULL,
  bank_account_id uuid NOT NULL,
  beneficiary_name text NOT NULL,
  beneficiary_bank_ref text,
  payment_method text NOT NULL,
  currency_code text NOT NULL,
  amount_minor text NOT NULL,
  requested_execution_date text NOT NULL,
  status text NOT NULL,
  submitted_at timestamptz,
  approved_at timestamptz,
  rejected_at timestamptz,
  released_at timestamptz,
  settled_at timestamptz,
  maker_user_id uuid NOT NULL,
  checker_user_id uuid,
  rejection_reason text,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);

CREATE TABLE treasury_payment_batch (
  id uuid PRIMARY KEY,
  org_id uuid NOT NULL,
  bank_account_id uuid NOT NULL,
  batch_number text NOT NULL,
  currency_code text NOT NULL,
  status text NOT NULL,
  total_instruction_count integer NOT NULL,
  total_amount_minor text NOT NULL,
  release_requested_at timestamptz,
  released_at timestamptz,
  released_by_user_id uuid,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);

CREATE TABLE treasury_payment_batch_item (
  id uuid PRIMARY KEY,
  org_id uuid NOT NULL,
  payment_batch_id uuid NOT NULL,
  payment_instruction_id uuid NOT NULL,
  created_at timestamptz NOT NULL
);
```

---

# 11. Cross-cutting registry additions

## Permissions

```ts
"erp.finance.treasury.reconciliation.read"
"erp.finance.treasury.reconciliation.manage"
"erp.finance.treasury.payment-instruction.read"
"erp.finance.treasury.payment-instruction.manage"
"erp.finance.treasury.payment-batch.read"
"erp.finance.treasury.payment-batch.release"
```

## Audit actions

```ts
"treasury.reconciliation-session.open"
"treasury.reconciliation-match.add"
"treasury.reconciliation-match.remove"
"treasury.reconciliation-session.close"
"treasury.payment-instruction.create"
"treasury.payment-instruction.submit"
"treasury.payment-instruction.approve"
"treasury.payment-instruction.reject"
"treasury.payment-batch.create"
"treasury.payment-batch.request-release"
"treasury.payment-batch.release"
```

## Error codes

```ts
TREASURY_RECONCILIATION_STATEMENT_LINE_NOT_FOUND
TREASURY_RECONCILIATION_SESSION_NOT_FOUND
TREASURY_RECONCILIATION_SESSION_CLOSED
TREASURY_RECONCILIATION_MATCH_NOT_FOUND
TREASURY_RECONCILIATION_MATCH_EXCEEDS_STATEMENT_AMOUNT
TREASURY_PAYMENT_INSTRUCTION_NOT_FOUND
TREASURY_PAYMENT_INSTRUCTION_INVALID_BANK_ACCOUNT
TREASURY_PAYMENT_INSTRUCTION_ILLEGAL_TRANSITION
TREASURY_PAYMENT_BATCH_NOT_FOUND
TREASURY_PAYMENT_BATCH_INSTRUCTION_NOT_FOUND
TREASURY_PAYMENT_BATCH_INSTRUCTION_NOT_APPROVED
TREASURY_PAYMENT_BATCH_DIMENSION_MISMATCH
TREASURY_PAYMENT_BATCH_ILLEGAL_TRANSITION
TREASURY_PAYMENT_SOD_VIOLATION
```

## Outbox events

```ts
treasury.reconciliation-session.opened
treasury.reconciliation-match.added
treasury.reconciliation-match.removed
treasury.reconciliation-session.closed
treasury.payment-instruction.created
treasury.payment-instruction.submitted
treasury.payment-instruction.approved
treasury.payment-instruction.rejected
treasury.payment-batch.created
treasury.payment-batch.release-requested
treasury.payment-batch.released
```

---

# 12. What Wave 2 gives AFENDA

This wave turns Treasury from passive visibility into **execution truth**.

## Sprint 2.1

You now have:

* statement-line reconciliation sessions
* partial match support
* “matched sum cannot exceed line amount”
* closed-session mutation lock
* append-only reconciliation history

## Sprint 2.2

You now have:

* treasury-owned payment instructions
* maker-checker approval
* treasury payment batching
* release governance
* AP → Treasury bridge seam
* release event for future bank adapter execution

This is the first point where Treasury becomes a real **control plane**, not just a reporting page.

---

# 13. What I would harden next

Your northstar is not just features, but **truth**. So before Wave 3, I would sharpen these:

Add a proper bridge entity between AP and Treasury, for example:

* `ap_payable_payment_candidate`
* `treasury_payment_instruction_source_link`

That avoids Treasury silently re-deriving AP truth.

Also add:

* `approval_matrix_id`
* `sod_policy_result`
* `payment_release_evidence_id`

So the release itself becomes auditable evidence, not just a status update.

And for reconciliation, I would avoid mutating the statement line directly. Keep line immutable and derive state from reconciliation records or a projection.

---

# 14. Recommended Wave 3 shape

The next best move is:

* cash position snapshot
* pending outflow / inflow projection from approved treasury instructions
* AP due-date liquidity feed
* AR expected receipt feed
* snapshot reproducibility from source events

That is where AFENDA starts looking like a real treasury system instead of a payment admin tool.

If you want, next I’ll give you **Wave 3 full drop-in scaffold** in the exact same style.

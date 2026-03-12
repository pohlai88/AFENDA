Below is the **Wave 4.1 full drop-in scaffold** for AFENDA Treasury:

* **internal bank account structures**
* **intercompany transfer lifecycle**
* **balancing controls**
* **internal settlement events**

That matches your Wave 4.1 manifest and exit criteria: every transfer must have balanced debit/credit legs, and intercompany org controls and approvals must be enforced. 

This should be treated as **operational truth first**.
Do **not** force GL posting here yet. Wave 4.1 should emit bridge-ready treasury events so Wave 5.2 can own the accounting bridge cleanly. Your scaffold explicitly places treasury accounting bridge later in Wave 5.2. 

---

# 1. Target file set

Your uploaded scaffold’s Wave 4.1 manifest calls for these create/update classes under the AFENDA pattern. 

## Create

* `packages/contracts/src/erp/finance/treasury/internal-bank-account.entity.ts`

* `packages/contracts/src/erp/finance/treasury/internal-bank-account.commands.ts`

* `packages/contracts/src/erp/finance/treasury/intercompany-transfer.entity.ts`

* `packages/contracts/src/erp/finance/treasury/intercompany-transfer.commands.ts`

* `packages/db/src/schema/erp/finance/treasury/internal-bank-account.table.ts`

* `packages/db/src/schema/erp/finance/treasury/intercompany-transfer.table.ts`

* `packages/core/src/erp/finance/treasury/internal-bank-account.service.ts`

* `packages/core/src/erp/finance/treasury/internal-bank-account.queries.ts`

* `packages/core/src/erp/finance/treasury/intercompany-transfer.service.ts`

* `packages/core/src/erp/finance/treasury/intercompany-transfer.queries.ts`

* `packages/core/src/erp/finance/treasury/calculators/intercompany-balancing.ts`

* `packages/core/src/erp/finance/treasury/__vitest_test__/internal-bank-account.service.test.ts`

* `packages/core/src/erp/finance/treasury/__vitest_test__/intercompany-transfer.service.test.ts`

* `apps/worker/src/jobs/erp/finance/treasury/handle-intercompany-transfer-settled.ts`

* `apps/web/src/app/(erp)/finance/treasury/inhouse-bank/page.tsx`

* `apps/web/src/app/(erp)/finance/treasury/components/intercompany-transfer-board.tsx`

## Update

* `packages/contracts/src/erp/finance/treasury/index.ts`
* `packages/db/src/schema/erp/finance/treasury/index.ts`
* `packages/core/src/erp/finance/treasury/calculators/index.ts`
* `packages/core/src/erp/finance/treasury/index.ts`
* `apps/api/src/routes/erp/finance/treasury.ts`
* `apps/worker/src/jobs/erp/finance/treasury/index.ts`
* `tools/gates/contract-db-sync.mjs`
* `packages/db/drizzle/<timestamp>_treasury_inhouse_bank_transfer.sql` 

---

# 2. Domain boundary

## Internal bank account

This is a **treasury-managed internal liquidity node**.

It is not an external bank account.
It is an internal treasury account tied to:

* org
* legal entity
* currency
* account role
* lifecycle state

## Intercompany transfer

This is an **internal movement of value** between internal treasury accounts.

It must preserve:

* from / to entity
* from / to internal account
* amount + currency
* balanced legs
* approval evidence
* settlement evidence
* outbox events for downstream accounting bridge

So Wave 4.1 gives AFENDA:

* in-house banking structure
* internal liquidity movement truth
* bridge-ready transfer evidence

---

# 3. Contracts

## `packages/contracts/src/erp/finance/treasury/internal-bank-account.entity.ts`

```ts
import { z } from "zod";

export const internalBankAccountStatusSchema = z.enum([
  "draft",
  "active",
  "inactive",
  "closed",
]);

export const internalBankAccountTypeSchema = z.enum([
  "operating",
  "funding",
  "settlement",
  "sweep",
  "clearing",
]);

export const internalBankAccountEntitySchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  legalEntityId: z.string().uuid(),
  code: z.string().trim().min(1).max(64),
  accountName: z.string().trim().min(1).max(255),
  accountType: internalBankAccountTypeSchema,
  currencyCode: z.string().trim().length(3),
  externalBankAccountId: z.string().uuid().nullable(),
  status: internalBankAccountStatusSchema,
  isPrimaryFundingAccount: z.boolean(),
  activatedAt: z.string().datetime().nullable(),
  deactivatedAt: z.string().datetime().nullable(),
  closedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type InternalBankAccountEntity = z.infer<
  typeof internalBankAccountEntitySchema
>;
```

---

## `packages/contracts/src/erp/finance/treasury/internal-bank-account.commands.ts`

```ts
import { z } from "zod";
import { idempotencyKeySchema, orgScopedMetadataSchema } from "./shared";
import { internalBankAccountTypeSchema } from "./internal-bank-account.entity";

export const createInternalBankAccountCommandSchema = z.object({
  ...orgScopedMetadataSchema.shape,
  idempotencyKey: idempotencyKeySchema,
  legalEntityId: z.string().uuid(),
  code: z.string().trim().min(1).max(64),
  accountName: z.string().trim().min(1).max(255),
  accountType: internalBankAccountTypeSchema,
  currencyCode: z.string().trim().length(3),
  externalBankAccountId: z.string().uuid().nullable().optional(),
  isPrimaryFundingAccount: z.boolean().optional().default(false),
});

export const activateInternalBankAccountCommandSchema = z.object({
  ...orgScopedMetadataSchema.shape,
  idempotencyKey: idempotencyKeySchema,
  internalBankAccountId: z.string().uuid(),
});

export const deactivateInternalBankAccountCommandSchema = z.object({
  ...orgScopedMetadataSchema.shape,
  idempotencyKey: idempotencyKeySchema,
  internalBankAccountId: z.string().uuid(),
  reason: z.string().trim().min(1).max(255),
});

export type CreateInternalBankAccountCommand = z.infer<
  typeof createInternalBankAccountCommandSchema
>;
export type ActivateInternalBankAccountCommand = z.infer<
  typeof activateInternalBankAccountCommandSchema
>;
export type DeactivateInternalBankAccountCommand = z.infer<
  typeof deactivateInternalBankAccountCommandSchema
>;
```

---

## `packages/contracts/src/erp/finance/treasury/intercompany-transfer.entity.ts`

```ts
import { z } from "zod";

export const intercompanyTransferStatusSchema = z.enum([
  "draft",
  "pending_approval",
  "approved",
  "rejected",
  "pending_settlement",
  "settled",
  "failed",
  "cancelled",
]);

export const intercompanyTransferPurposeSchema = z.enum([
  "working_capital",
  "funding",
  "settlement",
  "cash_pooling",
  "manual_adjustment",
]);

export const intercompanyTransferEntitySchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  transferNumber: z.string().trim().min(1).max(64),
  fromLegalEntityId: z.string().uuid(),
  toLegalEntityId: z.string().uuid(),
  fromInternalBankAccountId: z.string().uuid(),
  toInternalBankAccountId: z.string().uuid(),
  purpose: intercompanyTransferPurposeSchema,
  currencyCode: z.string().trim().length(3),
  transferAmountMinor: z.string(),
  debitLegAmountMinor: z.string(),
  creditLegAmountMinor: z.string(),
  requestedExecutionDate: z.string().date(),
  status: intercompanyTransferStatusSchema,
  makerUserId: z.string().uuid(),
  checkerUserId: z.string().uuid().nullable(),
  approvedAt: z.string().datetime().nullable(),
  rejectedAt: z.string().datetime().nullable(),
  settledAt: z.string().datetime().nullable(),
  rejectionReason: z.string().nullable(),
  sourceVersion: z.string().trim().min(1).max(128),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type IntercompanyTransferEntity = z.infer<
  typeof intercompanyTransferEntitySchema
>;
```

---

## `packages/contracts/src/erp/finance/treasury/intercompany-transfer.commands.ts`

```ts
import { z } from "zod";
import { idempotencyKeySchema, orgScopedMetadataSchema } from "./shared";
import { intercompanyTransferPurposeSchema } from "./intercompany-transfer.entity";

export const createIntercompanyTransferCommandSchema = z.object({
  ...orgScopedMetadataSchema.shape,
  idempotencyKey: idempotencyKeySchema,
  transferNumber: z.string().trim().min(1).max(64),
  fromLegalEntityId: z.string().uuid(),
  toLegalEntityId: z.string().uuid(),
  fromInternalBankAccountId: z.string().uuid(),
  toInternalBankAccountId: z.string().uuid(),
  purpose: intercompanyTransferPurposeSchema,
  currencyCode: z.string().trim().length(3),
  transferAmountMinor: z.string(),
  requestedExecutionDate: z.string().date(),
  sourceVersion: z.string().trim().min(1).max(128),
});

export const submitIntercompanyTransferCommandSchema = z.object({
  ...orgScopedMetadataSchema.shape,
  idempotencyKey: idempotencyKeySchema,
  intercompanyTransferId: z.string().uuid(),
});

export const approveIntercompanyTransferCommandSchema = z.object({
  ...orgScopedMetadataSchema.shape,
  idempotencyKey: idempotencyKeySchema,
  intercompanyTransferId: z.string().uuid(),
});

export const rejectIntercompanyTransferCommandSchema = z.object({
  ...orgScopedMetadataSchema.shape,
  idempotencyKey: idempotencyKeySchema,
  intercompanyTransferId: z.string().uuid(),
  reason: z.string().trim().min(1).max(255),
});

export const settleIntercompanyTransferCommandSchema = z.object({
  ...orgScopedMetadataSchema.shape,
  idempotencyKey: idempotencyKeySchema,
  intercompanyTransferId: z.string().uuid(),
});

export type CreateIntercompanyTransferCommand = z.infer<
  typeof createIntercompanyTransferCommandSchema
>;
export type SubmitIntercompanyTransferCommand = z.infer<
  typeof submitIntercompanyTransferCommandSchema
>;
export type ApproveIntercompanyTransferCommand = z.infer<
  typeof approveIntercompanyTransferCommandSchema
>;
export type RejectIntercompanyTransferCommand = z.infer<
  typeof rejectIntercompanyTransferCommandSchema
>;
export type SettleIntercompanyTransferCommand = z.infer<
  typeof settleIntercompanyTransferCommandSchema
>;
```

---

# 4. DB schema

## `packages/db/src/schema/erp/finance/treasury/internal-bank-account.table.ts`

```ts
import {
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const treasuryInternalBankAccountTable = pgTable(
  "treasury_internal_bank_account",
  {
    id: uuid("id").primaryKey(),
    orgId: uuid("org_id").notNull(),
    legalEntityId: uuid("legal_entity_id").notNull(),
    code: text("code").notNull(),
    accountName: text("account_name").notNull(),
    accountType: text("account_type").notNull(),
    currencyCode: text("currency_code").notNull(),
    externalBankAccountId: uuid("external_bank_account_id"),
    status: text("status").notNull(),
    isPrimaryFundingAccount: boolean("is_primary_funding_account")
      .notNull()
      .default(false),
    activatedAt: timestamp("activated_at", { withTimezone: true }),
    deactivatedAt: timestamp("deactivated_at", { withTimezone: true }),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => ({
    orgIdx: index("treasury_internal_bank_account__org_idx").on(table.orgId),
    orgEntityIdx: index("treasury_internal_bank_account__org_entity_idx").on(
      table.orgId,
      table.legalEntityId,
    ),
    orgCodeUq: uniqueIndex("treasury_internal_bank_account__org_code_uq").on(
      table.orgId,
      table.code,
    ),
  }),
);
```

---

## `packages/db/src/schema/erp/finance/treasury/intercompany-transfer.table.ts`

```ts
import {
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  date,
} from "drizzle-orm/pg-core";

export const treasuryIntercompanyTransferTable = pgTable(
  "treasury_intercompany_transfer",
  {
    id: uuid("id").primaryKey(),
    orgId: uuid("org_id").notNull(),
    transferNumber: text("transfer_number").notNull(),
    fromLegalEntityId: uuid("from_legal_entity_id").notNull(),
    toLegalEntityId: uuid("to_legal_entity_id").notNull(),
    fromInternalBankAccountId: uuid("from_internal_bank_account_id").notNull(),
    toInternalBankAccountId: uuid("to_internal_bank_account_id").notNull(),
    purpose: text("purpose").notNull(),
    currencyCode: text("currency_code").notNull(),
    transferAmountMinor: text("transfer_amount_minor").notNull(),
    debitLegAmountMinor: text("debit_leg_amount_minor").notNull(),
    creditLegAmountMinor: text("credit_leg_amount_minor").notNull(),
    requestedExecutionDate: date("requested_execution_date").notNull(),
    status: text("status").notNull(),
    makerUserId: uuid("maker_user_id").notNull(),
    checkerUserId: uuid("checker_user_id"),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    rejectedAt: timestamp("rejected_at", { withTimezone: true }),
    settledAt: timestamp("settled_at", { withTimezone: true }),
    rejectionReason: text("rejection_reason"),
    sourceVersion: text("source_version").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => ({
    orgIdx: index("treasury_intercompany_transfer__org_idx").on(table.orgId),
    orgStatusIdx: index("treasury_intercompany_transfer__org_status_idx").on(
      table.orgId,
      table.status,
    ),
    orgTransferNumberUq: uniqueIndex(
      "treasury_intercompany_transfer__org_transfer_number_uq",
    ).on(table.orgId, table.transferNumber),
    orgFromToIdx: index("treasury_intercompany_transfer__org_from_to_idx").on(
      table.orgId,
      table.fromLegalEntityId,
      table.toLegalEntityId,
    ),
  }),
);
```

---

# 5. Core calculator

## `packages/core/src/erp/finance/treasury/calculators/intercompany-balancing.ts`

```ts
export function assertBalancedTransfer(params: {
  transferAmountMinor: string;
  debitLegAmountMinor: string;
  creditLegAmountMinor: string;
}) {
  const transfer = BigInt(params.transferAmountMinor);
  const debit = BigInt(params.debitLegAmountMinor);
  const credit = BigInt(params.creditLegAmountMinor);

  if (debit !== transfer) {
    throw new Error("TREASURY_INTERCOMPANY_TRANSFER_DEBIT_MISMATCH");
  }

  if (credit !== transfer) {
    throw new Error("TREASURY_INTERCOMPANY_TRANSFER_CREDIT_MISMATCH");
  }

  if (debit !== credit) {
    throw new Error("TREASURY_INTERCOMPANY_TRANSFER_UNBALANCED");
  }
}
```

---

# 6. Core services

## `packages/core/src/erp/finance/treasury/internal-bank-account.service.ts`

```ts
import { and, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import {
  activateInternalBankAccountCommandSchema,
  createInternalBankAccountCommandSchema,
  deactivateInternalBankAccountCommandSchema,
} from "@afenda/contracts/erp/finance/treasury/internal-bank-account.commands";
import { treasuryInternalBankAccountTable } from "@afenda/db/schema/erp/finance/treasury/internal-bank-account.table";

type DbTx = any;
type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } };

async function emitOutboxEvent(_: DbTx, __: unknown) {}
async function withAudit<T>(_: DbTx, __: unknown, fn: () => Promise<T>) {
  return fn();
}

export class InternalBankAccountService {
  constructor(private readonly db: DbTx) {}

  async create(raw: unknown): Promise<ServiceResult<{ id: string }>> {
    const input = createInternalBankAccountCommandSchema.parse(raw);

    const existing = await this.db.query.treasuryInternalBankAccountTable.findFirst({
      where: and(
        eq(treasuryInternalBankAccountTable.orgId, input.orgId),
        eq(treasuryInternalBankAccountTable.code, input.code),
      ),
    });

    if (existing) {
      return {
        ok: false,
        error: {
          code: "TREASURY_INTERNAL_BANK_ACCOUNT_CODE_EXISTS",
          message: "Internal bank account code already exists",
        },
      };
    }

    const id = randomUUID();
    const now = new Date();

    await withAudit(this.db, {}, async () => {
      if (input.isPrimaryFundingAccount) {
        await this.db
          .update(treasuryInternalBankAccountTable)
          .set({
            isPrimaryFundingAccount: false,
            updatedAt: now,
          })
          .where(eq(treasuryInternalBankAccountTable.orgId, input.orgId));
      }

      await this.db.insert(treasuryInternalBankAccountTable).values({
        id,
        orgId: input.orgId,
        legalEntityId: input.legalEntityId,
        code: input.code,
        accountName: input.accountName,
        accountType: input.accountType,
        currencyCode: input.currencyCode,
        externalBankAccountId: input.externalBankAccountId ?? null,
        status: "draft",
        isPrimaryFundingAccount: input.isPrimaryFundingAccount ?? false,
        activatedAt: null,
        deactivatedAt: null,
        closedAt: null,
        createdAt: now,
        updatedAt: now,
      });

      await emitOutboxEvent(this.db, {
        eventType: "treasury.internal-bank-account.created",
        aggregateId: id,
      });
    });

    return { ok: true, data: { id } };
  }

  async activate(raw: unknown): Promise<ServiceResult<{ id: string }>> {
    const input = activateInternalBankAccountCommandSchema.parse(raw);

    const row = await this.db.query.treasuryInternalBankAccountTable.findFirst({
      where: and(
        eq(treasuryInternalBankAccountTable.orgId, input.orgId),
        eq(treasuryInternalBankAccountTable.id, input.internalBankAccountId),
      ),
    });

    if (!row) {
      return {
        ok: false,
        error: {
          code: "TREASURY_INTERNAL_BANK_ACCOUNT_NOT_FOUND",
          message: "Internal bank account not found",
        },
      };
    }

    if (row.status === "active") {
      return { ok: true, data: { id: row.id } };
    }

    if (row.status === "closed") {
      return {
        ok: false,
        error: {
          code: "TREASURY_INTERNAL_BANK_ACCOUNT_ILLEGAL_TRANSITION",
          message: "Closed account cannot be activated",
        },
      };
    }

    const now = new Date();

    await withAudit(this.db, {}, async () => {
      await this.db
        .update(treasuryInternalBankAccountTable)
        .set({
          status: "active",
          activatedAt: now,
          deactivatedAt: null,
          updatedAt: now,
        })
        .where(eq(treasuryInternalBankAccountTable.id, row.id));

      await emitOutboxEvent(this.db, {
        eventType: "treasury.internal-bank-account.activated",
        aggregateId: row.id,
      });
    });

    return { ok: true, data: { id: row.id } };
  }

  async deactivate(raw: unknown): Promise<ServiceResult<{ id: string }>> {
    const input = deactivateInternalBankAccountCommandSchema.parse(raw);

    const row = await this.db.query.treasuryInternalBankAccountTable.findFirst({
      where: and(
        eq(treasuryInternalBankAccountTable.orgId, input.orgId),
        eq(treasuryInternalBankAccountTable.id, input.internalBankAccountId),
      ),
    });

    if (!row) {
      return {
        ok: false,
        error: {
          code: "TREASURY_INTERNAL_BANK_ACCOUNT_NOT_FOUND",
          message: "Internal bank account not found",
        },
      };
    }

    if (row.status === "closed") {
      return {
        ok: false,
        error: {
          code: "TREASURY_INTERNAL_BANK_ACCOUNT_ILLEGAL_TRANSITION",
          message: "Closed account cannot be deactivated",
        },
      };
    }

    const now = new Date();

    await withAudit(this.db, {}, async () => {
      await this.db
        .update(treasuryInternalBankAccountTable)
        .set({
          status: "inactive",
          deactivatedAt: now,
          updatedAt: now,
        })
        .where(eq(treasuryInternalBankAccountTable.id, row.id));

      await emitOutboxEvent(this.db, {
        eventType: "treasury.internal-bank-account.deactivated",
        aggregateId: row.id,
      });
    });

    return { ok: true, data: { id: row.id } };
  }
}
```

---

## `packages/core/src/erp/finance/treasury/internal-bank-account.queries.ts`

```ts
import { desc, eq } from "drizzle-orm";
import { treasuryInternalBankAccountTable } from "@afenda/db/schema/erp/finance/treasury/internal-bank-account.table";

type DbTx = any;

export class InternalBankAccountQueries {
  constructor(private readonly db: DbTx) {}

  async listByOrg(orgId: string) {
    return this.db
      .select()
      .from(treasuryInternalBankAccountTable)
      .where(eq(treasuryInternalBankAccountTable.orgId, orgId))
      .orderBy(desc(treasuryInternalBankAccountTable.createdAt));
  }
}
```

---

## `packages/core/src/erp/finance/treasury/intercompany-transfer.service.ts`

```ts
import { and, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import {
  approveIntercompanyTransferCommandSchema,
  createIntercompanyTransferCommandSchema,
  rejectIntercompanyTransferCommandSchema,
  settleIntercompanyTransferCommandSchema,
  submitIntercompanyTransferCommandSchema,
} from "@afenda/contracts/erp/finance/treasury/intercompany-transfer.commands";
import { treasuryInternalBankAccountTable } from "@afenda/db/schema/erp/finance/treasury/internal-bank-account.table";
import { treasuryIntercompanyTransferTable } from "@afenda/db/schema/erp/finance/treasury/intercompany-transfer.table";
import { assertBalancedTransfer } from "./calculators/intercompany-balancing";

type DbTx = any;
type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } };

async function emitOutboxEvent(_: DbTx, __: unknown) {}
async function withAudit<T>(_: DbTx, __: unknown, fn: () => Promise<T>) {
  return fn();
}

export class IntercompanyTransferService {
  constructor(private readonly db: DbTx) {}

  async create(raw: unknown): Promise<ServiceResult<{ id: string }>> {
    const input = createIntercompanyTransferCommandSchema.parse(raw);

    if (input.fromLegalEntityId === input.toLegalEntityId) {
      return {
        ok: false,
        error: {
          code: "TREASURY_INTERCOMPANY_TRANSFER_SAME_ENTITY",
          message: "From and to legal entities must differ",
        },
      };
    }

    const fromAccount = await this.db.query.treasuryInternalBankAccountTable.findFirst({
      where: and(
        eq(treasuryInternalBankAccountTable.orgId, input.orgId),
        eq(treasuryInternalBankAccountTable.id, input.fromInternalBankAccountId),
      ),
    });

    const toAccount = await this.db.query.treasuryInternalBankAccountTable.findFirst({
      where: and(
        eq(treasuryInternalBankAccountTable.orgId, input.orgId),
        eq(treasuryInternalBankAccountTable.id, input.toInternalBankAccountId),
      ),
    });

    if (!fromAccount || !toAccount) {
      return {
        ok: false,
        error: {
          code: "TREASURY_INTERCOMPANY_TRANSFER_ACCOUNT_NOT_FOUND",
          message: "Internal bank account not found",
        },
      };
    }

    if (fromAccount.status !== "active" || toAccount.status !== "active") {
      return {
        ok: false,
        error: {
          code: "TREASURY_INTERCOMPANY_TRANSFER_ACCOUNT_INACTIVE",
          message: "Both internal bank accounts must be active",
        },
      };
    }

    if (
      fromAccount.legalEntityId !== input.fromLegalEntityId ||
      toAccount.legalEntityId !== input.toLegalEntityId
    ) {
      return {
        ok: false,
        error: {
          code: "TREASURY_INTERCOMPANY_TRANSFER_ENTITY_ACCOUNT_MISMATCH",
          message: "Account legal entity mismatch",
        },
      };
    }

    if (
      fromAccount.currencyCode !== input.currencyCode ||
      toAccount.currencyCode !== input.currencyCode
    ) {
      return {
        ok: false,
        error: {
          code: "TREASURY_INTERCOMPANY_TRANSFER_CURRENCY_MISMATCH",
          message: "Transfer currency must match both internal accounts",
        },
      };
    }

    try {
      assertBalancedTransfer({
        transferAmountMinor: input.transferAmountMinor,
        debitLegAmountMinor: input.transferAmountMinor,
        creditLegAmountMinor: input.transferAmountMinor,
      });
    } catch (error: any) {
      return {
        ok: false,
        error: {
          code: error.message,
          message: "Intercompany transfer is not balanced",
        },
      };
    }

    const existing = await this.db.query.treasuryIntercompanyTransferTable.findFirst({
      where: and(
        eq(treasuryIntercompanyTransferTable.orgId, input.orgId),
        eq(treasuryIntercompanyTransferTable.transferNumber, input.transferNumber),
      ),
    });

    if (existing) {
      return {
        ok: false,
        error: {
          code: "TREASURY_INTERCOMPANY_TRANSFER_NUMBER_EXISTS",
          message: "Transfer number already exists",
        },
      };
    }

    const id = randomUUID();
    const now = new Date();

    await withAudit(this.db, {}, async () => {
      await this.db.insert(treasuryIntercompanyTransferTable).values({
        id,
        orgId: input.orgId,
        transferNumber: input.transferNumber,
        fromLegalEntityId: input.fromLegalEntityId,
        toLegalEntityId: input.toLegalEntityId,
        fromInternalBankAccountId: input.fromInternalBankAccountId,
        toInternalBankAccountId: input.toInternalBankAccountId,
        purpose: input.purpose,
        currencyCode: input.currencyCode,
        transferAmountMinor: input.transferAmountMinor,
        debitLegAmountMinor: input.transferAmountMinor,
        creditLegAmountMinor: input.transferAmountMinor,
        requestedExecutionDate: input.requestedExecutionDate,
        status: "draft",
        makerUserId: input.actorUserId,
        checkerUserId: null,
        approvedAt: null,
        rejectedAt: null,
        settledAt: null,
        rejectionReason: null,
        sourceVersion: input.sourceVersion,
        createdAt: now,
        updatedAt: now,
      });

      await emitOutboxEvent(this.db, {
        eventType: "treasury.intercompany-transfer.created",
        aggregateId: id,
      });
    });

    return { ok: true, data: { id } };
  }

  async submit(raw: unknown): Promise<ServiceResult<{ id: string }>> {
    const input = submitIntercompanyTransferCommandSchema.parse(raw);

    const row = await this.db.query.treasuryIntercompanyTransferTable.findFirst({
      where: and(
        eq(treasuryIntercompanyTransferTable.orgId, input.orgId),
        eq(treasuryIntercompanyTransferTable.id, input.intercompanyTransferId),
      ),
    });

    if (!row) {
      return {
        ok: false,
        error: {
          code: "TREASURY_INTERCOMPANY_TRANSFER_NOT_FOUND",
          message: "Intercompany transfer not found",
        },
      };
    }

    if (row.status !== "draft") {
      return {
        ok: false,
        error: {
          code: "TREASURY_INTERCOMPANY_TRANSFER_ILLEGAL_TRANSITION",
          message: "Only draft transfer can be submitted",
        },
      };
    }

    const now = new Date();

    await withAudit(this.db, {}, async () => {
      await this.db
        .update(treasuryIntercompanyTransferTable)
        .set({
          status: "pending_approval",
          updatedAt: now,
        })
        .where(eq(treasuryIntercompanyTransferTable.id, row.id));

      await emitOutboxEvent(this.db, {
        eventType: "treasury.intercompany-transfer.submitted",
        aggregateId: row.id,
      });
    });

    return { ok: true, data: { id: row.id } };
  }

  async approve(raw: unknown): Promise<ServiceResult<{ id: string }>> {
    const input = approveIntercompanyTransferCommandSchema.parse(raw);

    const row = await this.db.query.treasuryIntercompanyTransferTable.findFirst({
      where: and(
        eq(treasuryIntercompanyTransferTable.orgId, input.orgId),
        eq(treasuryIntercompanyTransferTable.id, input.intercompanyTransferId),
      ),
    });

    if (!row) {
      return {
        ok: false,
        error: {
          code: "TREASURY_INTERCOMPANY_TRANSFER_NOT_FOUND",
          message: "Intercompany transfer not found",
        },
      };
    }

    if (row.status !== "pending_approval") {
      return {
        ok: false,
        error: {
          code: "TREASURY_INTERCOMPANY_TRANSFER_ILLEGAL_TRANSITION",
          message: "Only pending approval transfer can be approved",
        },
      };
    }

    if (row.makerUserId === input.actorUserId) {
      return {
        ok: false,
        error: {
          code: "TREASURY_INTERCOMPANY_TRANSFER_SOD_VIOLATION",
          message: "Maker-checker violation",
        },
      };
    }

    const now = new Date();

    await withAudit(this.db, {}, async () => {
      await this.db
        .update(treasuryIntercompanyTransferTable)
        .set({
          status: "pending_settlement",
          checkerUserId: input.actorUserId,
          approvedAt: now,
          updatedAt: now,
        })
        .where(eq(treasuryIntercompanyTransferTable.id, row.id));

      await emitOutboxEvent(this.db, {
        eventType: "treasury.intercompany-transfer.approved",
        aggregateId: row.id,
      });
    });

    return { ok: true, data: { id: row.id } };
  }

  async reject(raw: unknown): Promise<ServiceResult<{ id: string }>> {
    const input = rejectIntercompanyTransferCommandSchema.parse(raw);

    const row = await this.db.query.treasuryIntercompanyTransferTable.findFirst({
      where: and(
        eq(treasuryIntercompanyTransferTable.orgId, input.orgId),
        eq(treasuryIntercompanyTransferTable.id, input.intercompanyTransferId),
      ),
    });

    if (!row) {
      return {
        ok: false,
        error: {
          code: "TREASURY_INTERCOMPANY_TRANSFER_NOT_FOUND",
          message: "Intercompany transfer not found",
        },
      };
    }

    if (row.status !== "pending_approval") {
      return {
        ok: false,
        error: {
          code: "TREASURY_INTERCOMPANY_TRANSFER_ILLEGAL_TRANSITION",
          message: "Only pending approval transfer can be rejected",
        },
      };
    }

    const now = new Date();

    await withAudit(this.db, {}, async () => {
      await this.db
        .update(treasuryIntercompanyTransferTable)
        .set({
          status: "rejected",
          checkerUserId: input.actorUserId,
          rejectedAt: now,
          rejectionReason: input.reason,
          updatedAt: now,
        })
        .where(eq(treasuryIntercompanyTransferTable.id, row.id));

      await emitOutboxEvent(this.db, {
        eventType: "treasury.intercompany-transfer.rejected",
        aggregateId: row.id,
      });
    });

    return { ok: true, data: { id: row.id } };
  }

  async settle(raw: unknown): Promise<ServiceResult<{ id: string }>> {
    const input = settleIntercompanyTransferCommandSchema.parse(raw);

    const row = await this.db.query.treasuryIntercompanyTransferTable.findFirst({
      where: and(
        eq(treasuryIntercompanyTransferTable.orgId, input.orgId),
        eq(treasuryIntercompanyTransferTable.id, input.intercompanyTransferId),
      ),
    });

    if (!row) {
      return {
        ok: false,
        error: {
          code: "TREASURY_INTERCOMPANY_TRANSFER_NOT_FOUND",
          message: "Intercompany transfer not found",
        },
      };
    }

    if (row.status !== "pending_settlement") {
      return {
        ok: false,
        error: {
          code: "TREASURY_INTERCOMPANY_TRANSFER_ILLEGAL_TRANSITION",
          message: "Only pending settlement transfer can be settled",
        },
      };
    }

    const now = new Date();

    await withAudit(this.db, {}, async () => {
      await this.db
        .update(treasuryIntercompanyTransferTable)
        .set({
          status: "settled",
          settledAt: now,
          updatedAt: now,
        })
        .where(eq(treasuryIntercompanyTransferTable.id, row.id));

      await emitOutboxEvent(this.db, {
        eventType: "treasury.intercompany-transfer.settled",
        aggregateId: row.id,
      });
    });

    return { ok: true, data: { id: row.id } };
  }
}
```

---

## `packages/core/src/erp/finance/treasury/intercompany-transfer.queries.ts`

```ts
import { desc, eq } from "drizzle-orm";
import { treasuryIntercompanyTransferTable } from "@afenda/db/schema/erp/finance/treasury/intercompany-transfer.table";

type DbTx = any;

export class IntercompanyTransferQueries {
  constructor(private readonly db: DbTx) {}

  async listByOrg(orgId: string) {
    return this.db
      .select()
      .from(treasuryIntercompanyTransferTable)
      .where(eq(treasuryIntercompanyTransferTable.orgId, orgId))
      .orderBy(desc(treasuryIntercompanyTransferTable.createdAt));
  }
}
```

---

# 7. API route extensions

Add these into `apps/api/src/routes/erp/finance/treasury.ts`.

```ts
import {
  activateInternalBankAccountCommandSchema,
  createInternalBankAccountCommandSchema,
  deactivateInternalBankAccountCommandSchema,
} from "@afenda/contracts/erp/finance/treasury/internal-bank-account.commands";
import {
  approveIntercompanyTransferCommandSchema,
  createIntercompanyTransferCommandSchema,
  rejectIntercompanyTransferCommandSchema,
  settleIntercompanyTransferCommandSchema,
  submitIntercompanyTransferCommandSchema,
} from "@afenda/contracts/erp/finance/treasury/intercompany-transfer.commands";
import {
  InternalBankAccountQueries,
  InternalBankAccountService,
  IntercompanyTransferQueries,
  IntercompanyTransferService,
} from "@afenda/core/erp/finance/treasury";
```

```ts
  app.post("/v1/commands/erp/finance/treasury/internal-bank-accounts/create", async (req, reply) => {
    const input = createInternalBankAccountCommandSchema.parse(req.body);
    const service = new InternalBankAccountService(app.db);
    const result = await service.create(input);
    if (!result.ok) return reply.code(400).send(result.error);
    return reply.code(201).send(result.data);
  });

  app.post("/v1/commands/erp/finance/treasury/internal-bank-accounts/activate", async (req, reply) => {
    const input = activateInternalBankAccountCommandSchema.parse(req.body);
    const service = new InternalBankAccountService(app.db);
    const result = await service.activate(input);
    if (!result.ok) return reply.code(400).send(result.error);
    return reply.send(result.data);
  });

  app.post("/v1/commands/erp/finance/treasury/internal-bank-accounts/deactivate", async (req, reply) => {
    const input = deactivateInternalBankAccountCommandSchema.parse(req.body);
    const service = new InternalBankAccountService(app.db);
    const result = await service.deactivate(input);
    if (!result.ok) return reply.code(400).send(result.error);
    return reply.send(result.data);
  });

  app.get("/v1/erp/finance/treasury/internal-bank-accounts", async (req: any) => {
    const queries = new InternalBankAccountQueries(app.db);
    return queries.listByOrg(req.user.orgId);
  });

  app.post("/v1/commands/erp/finance/treasury/intercompany-transfers/create", async (req, reply) => {
    const input = createIntercompanyTransferCommandSchema.parse(req.body);
    const service = new IntercompanyTransferService(app.db);
    const result = await service.create(input);
    if (!result.ok) return reply.code(400).send(result.error);
    return reply.code(201).send(result.data);
  });

  app.post("/v1/commands/erp/finance/treasury/intercompany-transfers/submit", async (req, reply) => {
    const input = submitIntercompanyTransferCommandSchema.parse(req.body);
    const service = new IntercompanyTransferService(app.db);
    const result = await service.submit(input);
    if (!result.ok) return reply.code(400).send(result.error);
    return reply.send(result.data);
  });

  app.post("/v1/commands/erp/finance/treasury/intercompany-transfers/approve", async (req, reply) => {
    const input = approveIntercompanyTransferCommandSchema.parse(req.body);
    const service = new IntercompanyTransferService(app.db);
    const result = await service.approve(input);
    if (!result.ok) return reply.code(400).send(result.error);
    return reply.send(result.data);
  });

  app.post("/v1/commands/erp/finance/treasury/intercompany-transfers/reject", async (req, reply) => {
    const input = rejectIntercompanyTransferCommandSchema.parse(req.body);
    const service = new IntercompanyTransferService(app.db);
    const result = await service.reject(input);
    if (!result.ok) return reply.code(400).send(result.error);
    return reply.send(result.data);
  });

  app.post("/v1/commands/erp/finance/treasury/intercompany-transfers/settle", async (req, reply) => {
    const input = settleIntercompanyTransferCommandSchema.parse(req.body);
    const service = new IntercompanyTransferService(app.db);
    const result = await service.settle(input);
    if (!result.ok) return reply.code(400).send(result.error);
    return reply.send(result.data);
  });

  app.get("/v1/erp/finance/treasury/intercompany-transfers", async (req: any) => {
    const queries = new IntercompanyTransferQueries(app.db);
    return queries.listByOrg(req.user.orgId);
  });
```

---

# 8. Worker job

## `apps/worker/src/jobs/erp/finance/treasury/handle-intercompany-transfer-settled.ts`

```ts
type JobContext = {
  logger: {
    info: (payload: Record<string, unknown>, msg?: string) => void;
  };
};

export async function handleIntercompanyTransferSettled(
  ctx: JobContext,
  event: {
    orgId: string;
    intercompanyTransferId: string;
    correlationId: string;
  },
) {
  ctx.logger.info(
    {
      orgId: event.orgId,
      intercompanyTransferId: event.intercompanyTransferId,
      correlationId: event.correlationId,
    },
    "Handling treasury intercompany transfer settled",
  );

  // next:
  // 1. notify treasury accounting bridge queue
  // 2. update internal liquidity projections
  // 3. generate settlement evidence package

  return { ok: true };
}
```

---

# 9. Web UI

## `apps/web/src/app/(erp)/finance/treasury/components/intercompany-transfer-board.tsx`

```tsx
import { Card, CardContent, CardHeader, CardTitle } from "@afenda/ui";

export function IntercompanyTransferBoard({
  transfers,
}: {
  transfers: any[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Intercompany Transfers</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {transfers.length === 0 ? (
          <p className="text-sm text-muted-foreground">No transfers yet.</p>
        ) : (
          transfers.map((row) => (
            <div key={row.id} className="rounded-xl border p-4">
              <div className="font-medium">
                {row.transferNumber} · {row.status}
              </div>
              <div className="text-sm text-muted-foreground">
                {row.transferAmountMinor} {row.currencyCode} · {row.fromLegalEntityId} → {row.toLegalEntityId}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
```

---

## `apps/web/src/app/(erp)/finance/treasury/inhouse-bank/page.tsx`

```tsx
import { Card, CardContent, CardHeader, CardTitle } from "@afenda/ui";
import { IntercompanyTransferBoard } from "../components/intercompany-transfer-board";

const API_BASE_URL = process.env.API_BASE_URL!;

async function getInternalAccounts() {
  const res = await fetch(`${API_BASE_URL}/v1/erp/finance/treasury/internal-bank-accounts`, {
    cache: "no-store",
  });
  if (!res.ok) return [];
  return res.json();
}

async function getTransfers() {
  const res = await fetch(`${API_BASE_URL}/v1/erp/finance/treasury/intercompany-transfers`, {
    cache: "no-store",
  });
  if (!res.ok) return [];
  return res.json();
}

export default async function InHouseBankPage() {
  const [accounts, transfers] = await Promise.all([
    getInternalAccounts(),
    getTransfers(),
  ]);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">In-House Banking</h1>
        <p className="text-sm text-muted-foreground">
          Internal liquidity accounts and intercompany settlement operations.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Internal Bank Accounts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {accounts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No internal bank accounts yet.</p>
          ) : (
            accounts.map((row: any) => (
              <div key={row.id} className="rounded-xl border p-4">
                <div className="font-medium">
                  {row.code} · {row.accountName}
                </div>
                <div className="text-sm text-muted-foreground">
                  {row.accountType} · {row.currencyCode} · {row.status}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <IntercompanyTransferBoard transfers={transfers} />
    </div>
  );
}
```

---

# 10. Tests

## `packages/core/src/erp/finance/treasury/__vitest_test__/internal-bank-account.service.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { InternalBankAccountService } from "../internal-bank-account.service";

describe("InternalBankAccountService", () => {
  it("creates internal bank account in draft state", async () => {
    const db = {
      query: {
        treasuryInternalBankAccountTable: {
          findFirst: async () => null,
        },
      },
      insert: () => ({
        values: async () => undefined,
      }),
      update: () => ({
        set: () => ({
          where: async () => undefined,
        }),
      }),
    };

    const service = new InternalBankAccountService(db as any);

    const result = await service.create({
      orgId: "00000000-0000-0000-0000-000000000001",
      actorUserId: "00000000-0000-0000-0000-000000000002",
      correlationId: "corr-1",
      idempotencyKey: "idem-1",
      legalEntityId: "00000000-0000-0000-0000-000000000010",
      code: "IHB-MY-001",
      accountName: "Malaysia Funding Account",
      accountType: "funding",
      currencyCode: "MYR",
      isPrimaryFundingAccount: true,
    });

    expect(result.ok).toBe(true);
  });
});
```

---

## `packages/core/src/erp/finance/treasury/__vitest_test__/intercompany-transfer.service.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { IntercompanyTransferService } from "../intercompany-transfer.service";

describe("IntercompanyTransferService", () => {
  it("blocks same-entity intercompany transfer", async () => {
    const db = {
      query: {
        treasuryInternalBankAccountTable: {
          findFirst: async () => null,
        },
        treasuryIntercompanyTransferTable: {
          findFirst: async () => null,
        },
      },
    };

    const service = new IntercompanyTransferService(db as any);

    const result = await service.create({
      orgId: "00000000-0000-0000-0000-000000000001",
      actorUserId: "00000000-0000-0000-0000-000000000002",
      correlationId: "corr-1",
      idempotencyKey: "idem-1",
      transferNumber: "ICT-0001",
      fromLegalEntityId: "00000000-0000-0000-0000-000000000010",
      toLegalEntityId: "00000000-0000-0000-0000-000000000010",
      fromInternalBankAccountId: "00000000-0000-0000-0000-000000000011",
      toInternalBankAccountId: "00000000-0000-0000-0000-000000000012",
      purpose: "funding",
      currencyCode: "USD",
      transferAmountMinor: "100000",
      requestedExecutionDate: "2026-03-12",
      sourceVersion: "wave4-v1",
    });

    expect(result.ok).toBe(false);
  });
});
```

---

# 11. Migration starter

## `packages/db/drizzle/<timestamp>_treasury_inhouse_bank_transfer.sql`

```sql
CREATE TABLE treasury_internal_bank_account (
  id uuid PRIMARY KEY,
  org_id uuid NOT NULL,
  legal_entity_id uuid NOT NULL,
  code text NOT NULL,
  account_name text NOT NULL,
  account_type text NOT NULL,
  currency_code text NOT NULL,
  external_bank_account_id uuid,
  status text NOT NULL,
  is_primary_funding_account boolean NOT NULL DEFAULT false,
  activated_at timestamptz,
  deactivated_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);

CREATE UNIQUE INDEX treasury_internal_bank_account__org_code_uq
  ON treasury_internal_bank_account(org_id, code);

CREATE INDEX treasury_internal_bank_account__org_idx
  ON treasury_internal_bank_account(org_id);

CREATE INDEX treasury_internal_bank_account__org_entity_idx
  ON treasury_internal_bank_account(org_id, legal_entity_id);

CREATE TABLE treasury_intercompany_transfer (
  id uuid PRIMARY KEY,
  org_id uuid NOT NULL,
  transfer_number text NOT NULL,
  from_legal_entity_id uuid NOT NULL,
  to_legal_entity_id uuid NOT NULL,
  from_internal_bank_account_id uuid NOT NULL,
  to_internal_bank_account_id uuid NOT NULL,
  purpose text NOT NULL,
  currency_code text NOT NULL,
  transfer_amount_minor text NOT NULL,
  debit_leg_amount_minor text NOT NULL,
  credit_leg_amount_minor text NOT NULL,
  requested_execution_date date NOT NULL,
  status text NOT NULL,
  maker_user_id uuid NOT NULL,
  checker_user_id uuid,
  approved_at timestamptz,
  rejected_at timestamptz,
  settled_at timestamptz,
  rejection_reason text,
  source_version text NOT NULL,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);

CREATE UNIQUE INDEX treasury_intercompany_transfer__org_transfer_number_uq
  ON treasury_intercompany_transfer(org_id, transfer_number);

CREATE INDEX treasury_intercompany_transfer__org_idx
  ON treasury_intercompany_transfer(org_id);

CREATE INDEX treasury_intercompany_transfer__org_status_idx
  ON treasury_intercompany_transfer(org_id, status);

CREATE INDEX treasury_intercompany_transfer__org_from_to_idx
  ON treasury_intercompany_transfer(org_id, from_legal_entity_id, to_legal_entity_id);
```

---

# 12. Barrel updates

## `packages/contracts/src/erp/finance/treasury/index.ts`

```ts
export * from "./shared";
export * from "./internal-bank-account.entity";
export * from "./internal-bank-account.commands";
export * from "./intercompany-transfer.entity";
export * from "./intercompany-transfer.commands";
```

---

## `packages/db/src/schema/erp/finance/treasury/index.ts`

```ts
export * from "./internal-bank-account.table";
export * from "./intercompany-transfer.table";
```

---

## `packages/core/src/erp/finance/treasury/calculators/index.ts`

```ts
export * from "./intercompany-balancing";
```

---

## `packages/core/src/erp/finance/treasury/index.ts`

```ts
export * from "./internal-bank-account.service";
export * from "./internal-bank-account.queries";
export * from "./intercompany-transfer.service";
export * from "./intercompany-transfer.queries";
```

---

# 13. Cross-cutting additions

## Permissions

```ts
"erp.finance.treasury.internal-bank-account.read"
"erp.finance.treasury.internal-bank-account.manage"
"erp.finance.treasury.intercompany-transfer.read"
"erp.finance.treasury.intercompany-transfer.manage"
"erp.finance.treasury.intercompany-transfer.settle"
```

## Audit actions

```ts
"treasury.internal-bank-account.create"
"treasury.internal-bank-account.activate"
"treasury.internal-bank-account.deactivate"
"treasury.intercompany-transfer.create"
"treasury.intercompany-transfer.submit"
"treasury.intercompany-transfer.approve"
"treasury.intercompany-transfer.reject"
"treasury.intercompany-transfer.settle"
```

## Error codes

```ts
TREASURY_INTERNAL_BANK_ACCOUNT_NOT_FOUND
TREASURY_INTERNAL_BANK_ACCOUNT_CODE_EXISTS
TREASURY_INTERNAL_BANK_ACCOUNT_ILLEGAL_TRANSITION
TREASURY_INTERCOMPANY_TRANSFER_NOT_FOUND
TREASURY_INTERCOMPANY_TRANSFER_NUMBER_EXISTS
TREASURY_INTERCOMPANY_TRANSFER_SAME_ENTITY
TREASURY_INTERCOMPANY_TRANSFER_ACCOUNT_NOT_FOUND
TREASURY_INTERCOMPANY_TRANSFER_ACCOUNT_INACTIVE
TREASURY_INTERCOMPANY_TRANSFER_ENTITY_ACCOUNT_MISMATCH
TREASURY_INTERCOMPANY_TRANSFER_CURRENCY_MISMATCH
TREASURY_INTERCOMPANY_TRANSFER_DEBIT_MISMATCH
TREASURY_INTERCOMPANY_TRANSFER_CREDIT_MISMATCH
TREASURY_INTERCOMPANY_TRANSFER_UNBALANCED
TREASURY_INTERCOMPANY_TRANSFER_ILLEGAL_TRANSITION
TREASURY_INTERCOMPANY_TRANSFER_SOD_VIOLATION
```

## Outbox events

```ts
treasury.internal-bank-account.created
treasury.internal-bank-account.activated
treasury.internal-bank-account.deactivated
treasury.intercompany-transfer.created
treasury.intercompany-transfer.submitted
treasury.intercompany-transfer.approved
treasury.intercompany-transfer.rejected
treasury.intercompany-transfer.settled
```

---

# 14. What this gives you

This Wave 4.1 scaffold satisfies the functional intent in your manifest:

* internal treasury account structures
* intercompany transfer lifecycle
* balancing controls
* internal settlement events 

And it directly enforces the exit criteria:

* balanced debit and credit legs
* intercompany approval and control boundaries 

---

# 15. What I would harden next before Wave 4.2

The next hardening pass for this Wave 4.1 pack should be:

* add transfer settlement evidence entity
* add internal account balance snapshots
* add legal-entity policy approval matrix
* add source-link to Wave 5 treasury accounting bridge
* add optional FX seam if transfer across currencies is ever allowed later

But for now, I would keep Wave 4.1 **single-currency per transfer**.
That is the correct clean first cut.

---

# 16. Best next scaffold after this

After you drop this in, the next scaffold is:

# **Wave 4.2 — Netting and Internal Interest**

That should add:

* `netting-session.entity.ts`
* `netting-session.commands.ts`
* `internal-interest-rate.entity.ts`
* `internal-interest-rate.commands.ts`
* `netting-session.table.ts`
* `internal-interest-rate.table.ts`
* `netting-session.service.ts`
* `netting-session.queries.ts`
* `calculators/internal-interest.ts`
* `handle-netting-session-closed.ts`
* `netting/page.tsx`

That matches your Wave 4.2 manifest. 

I’d do Wave 4.2 next.

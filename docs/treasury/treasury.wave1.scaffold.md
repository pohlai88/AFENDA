> Treasury Program Status (Updated: 2026-03-12)
>
> - Wave 1: Fully implemented
> - Wave 2: Fully implemented
> - Wave 3: In active development preparation and implementation

Yes. Below is a **Wave 1 drop-in scaffold** for AFENDA Treasury, aligned to your law:

**contracts → db → core → api → worker → web**

This is designed to be:

* org-scoped
* idempotent
* audit-ready
* outbox-ready
* AP-grade in style
* thin-route / fat-core compliant

I am giving you a **practical v1 vertical slice** for:

* **Sprint 1.1 — Bank account management**
* **Sprint 1.2 — Bank statement + statement line ingestion**

I am not using fake enterprise fluff here. This is a scaffold you can actually drop in and extend.

---

# 1. Suggested Wave 1 file set

## Contracts

* `packages/contracts/src/erp/finance/treasury/index.ts`
* `packages/contracts/src/erp/finance/treasury/shared.ts`
* `packages/contracts/src/erp/finance/treasury/bank-account.entity.ts`
* `packages/contracts/src/erp/finance/treasury/bank-account.commands.ts`
* `packages/contracts/src/erp/finance/treasury/bank-statement.entity.ts`
* `packages/contracts/src/erp/finance/treasury/bank-statement.commands.ts`
* `packages/contracts/src/erp/finance/treasury/bank-statement-line.entity.ts`

## DB

* `packages/db/src/schema/erp/finance/treasury/index.ts`
* `packages/db/src/schema/erp/finance/treasury/bank-account.table.ts`
* `packages/db/src/schema/erp/finance/treasury/bank-statement.table.ts`
* `packages/db/src/schema/erp/finance/treasury/bank-statement-line.table.ts`

## Core

* `packages/core/src/erp/finance/treasury/index.ts`
* `packages/core/src/erp/finance/treasury/bank-account.service.ts`
* `packages/core/src/erp/finance/treasury/bank-account.queries.ts`
* `packages/core/src/erp/finance/treasury/bank-statement.service.ts`
* `packages/core/src/erp/finance/treasury/bank-statement.queries.ts`
* `packages/core/src/erp/finance/treasury/__vitest_test__/treasury-test-builders.ts`
* `packages/core/src/erp/finance/treasury/__vitest_test__/bank-account.service.test.ts`

## API

* `apps/api/src/routes/erp/finance/treasury.ts`

## Worker

* `apps/worker/src/jobs/erp/finance/treasury/index.ts`
* `apps/worker/src/jobs/erp/finance/treasury/handle-bank-statement-ingested.ts`

## Web

* `apps/web/src/app/(erp)/finance/treasury/page.tsx`
* `apps/web/src/app/(erp)/finance/treasury/bank-accounts/page.tsx`
* `apps/web/src/app/(erp)/finance/treasury/bank-statements/page.tsx`
* `apps/web/src/app/(erp)/finance/treasury/actions.ts`

---

# 2. Contracts

## `packages/contracts/src/erp/finance/treasury/shared.ts`

```ts
import { z } from "zod";

export const treasuryBankAccountStatusSchema = z.enum([
  "draft",
  "active",
  "inactive",
  "closed",
]);

export type TreasuryBankAccountStatus = z.infer<
  typeof treasuryBankAccountStatusSchema
>;

export const treasuryBankStatementStatusSchema = z.enum([
  "received",
  "parsing",
  "parsed",
  "failed",
  "archived",
]);

export type TreasuryBankStatementStatus = z.infer<
  typeof treasuryBankStatementStatusSchema
>;

export const treasuryReconciliationStateSchema = z.enum([
  "unreconciled",
  "partially_reconciled",
  "reconciled",
]);

export type TreasuryReconciliationState = z.infer<
  typeof treasuryReconciliationStateSchema
>;

export const treasuryCashDirectionSchema = z.enum(["inflow", "outflow"]);

export type TreasuryCashDirection = z.infer<typeof treasuryCashDirectionSchema>;

export const idempotencyKeySchema = z
  .string()
  .trim()
  .min(8)
  .max(128);

export const orgScopedMetadataSchema = z.object({
  orgId: z.string().uuid(),
  actorUserId: z.string().uuid(),
  correlationId: z.string().min(8).max(128),
});

export type OrgScopedMetadata = z.infer<typeof orgScopedMetadataSchema>;
```

---

## `packages/contracts/src/erp/finance/treasury/bank-account.entity.ts`

```ts
import { z } from "zod";
import { treasuryBankAccountStatusSchema } from "./shared";

export const bankAccountEntitySchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  code: z.string().trim().min(1).max(64),
  accountName: z.string().trim().min(1).max(255),
  bankName: z.string().trim().min(1).max(255),
  bankCode: z.string().trim().min(1).max(64),
  accountNumberMasked: z.string().trim().min(4).max(64),
  iban: z.string().trim().max(64).nullable(),
  swiftBic: z.string().trim().max(32).nullable(),
  currencyCode: z.string().trim().length(3),
  countryCode: z.string().trim().length(2).nullable(),
  externalBankRef: z.string().trim().max(128).nullable(),
  status: treasuryBankAccountStatusSchema,
  isPrimary: z.boolean(),
  activatedAt: z.string().datetime().nullable(),
  deactivatedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type BankAccountEntity = z.infer<typeof bankAccountEntitySchema>;
```

---

## `packages/contracts/src/erp/finance/treasury/bank-account.commands.ts`

```ts
import { z } from "zod";
import { idempotencyKeySchema, orgScopedMetadataSchema } from "./shared";

export const createBankAccountCommandSchema = z.object({
  ...orgScopedMetadataSchema.shape,
  idempotencyKey: idempotencyKeySchema,
  code: z.string().trim().min(1).max(64),
  accountName: z.string().trim().min(1).max(255),
  bankName: z.string().trim().min(1).max(255),
  bankCode: z.string().trim().min(1).max(64),
  accountNumber: z.string().trim().min(4).max(64),
  iban: z.string().trim().max(64).nullable().optional(),
  swiftBic: z.string().trim().max(32).nullable().optional(),
  currencyCode: z.string().trim().length(3),
  countryCode: z.string().trim().length(2).nullable().optional(),
  externalBankRef: z.string().trim().max(128).nullable().optional(),
  isPrimary: z.boolean().optional().default(false),
});

export const updateBankAccountCommandSchema = z.object({
  ...orgScopedMetadataSchema.shape,
  idempotencyKey: idempotencyKeySchema,
  bankAccountId: z.string().uuid(),
  accountName: z.string().trim().min(1).max(255).optional(),
  bankName: z.string().trim().min(1).max(255).optional(),
  bankCode: z.string().trim().min(1).max(64).optional(),
  iban: z.string().trim().max(64).nullable().optional(),
  swiftBic: z.string().trim().max(32).nullable().optional(),
  externalBankRef: z.string().trim().max(128).nullable().optional(),
  isPrimary: z.boolean().optional(),
});

export const activateBankAccountCommandSchema = z.object({
  ...orgScopedMetadataSchema.shape,
  idempotencyKey: idempotencyKeySchema,
  bankAccountId: z.string().uuid(),
});

export const deactivateBankAccountCommandSchema = z.object({
  ...orgScopedMetadataSchema.shape,
  idempotencyKey: idempotencyKeySchema,
  bankAccountId: z.string().uuid(),
  reason: z.string().trim().min(1).max(255),
});

export type CreateBankAccountCommand = z.infer<
  typeof createBankAccountCommandSchema
>;
export type UpdateBankAccountCommand = z.infer<
  typeof updateBankAccountCommandSchema
>;
export type ActivateBankAccountCommand = z.infer<
  typeof activateBankAccountCommandSchema
>;
export type DeactivateBankAccountCommand = z.infer<
  typeof deactivateBankAccountCommandSchema
>;
```

---

## `packages/contracts/src/erp/finance/treasury/bank-statement.entity.ts`

```ts
import { z } from "zod";
import { treasuryBankStatementStatusSchema } from "./shared";

export const bankStatementEntitySchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  bankAccountId: z.string().uuid(),
  statementDate: z.string().date(),
  sourceFileName: z.string().trim().min(1).max(255),
  sourceHash: z.string().trim().min(16).max(128),
  sourceFormat: z.string().trim().min(1).max(32),
  status: treasuryBankStatementStatusSchema,
  openingBalanceMinor: z.string(),
  closingBalanceMinor: z.string(),
  currencyCode: z.string().trim().length(3),
  ingestionError: z.string().nullable(),
  parsedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type BankStatementEntity = z.infer<typeof bankStatementEntitySchema>;
```

---

## `packages/contracts/src/erp/finance/treasury/bank-statement.commands.ts`

```ts
import { z } from "zod";
import { idempotencyKeySchema, orgScopedMetadataSchema } from "./shared";

export const ingestBankStatementCommandSchema = z.object({
  ...orgScopedMetadataSchema.shape,
  idempotencyKey: idempotencyKeySchema,
  bankAccountId: z.string().uuid(),
  statementDate: z.string().date(),
  sourceFileName: z.string().trim().min(1).max(255),
  sourceHash: z.string().trim().min(16).max(128),
  sourceFormat: z.string().trim().min(1).max(32),
  openingBalanceMinor: z.string(),
  closingBalanceMinor: z.string(),
  currencyCode: z.string().trim().length(3),
  lines: z.array(
    z.object({
      externalLineRef: z.string().trim().min(1).max(128),
      bookingDate: z.string().date(),
      valueDate: z.string().date().nullable().optional(),
      description: z.string().trim().min(1).max(1000),
      direction: z.enum(["inflow", "outflow"]),
      amountMinor: z.string(),
      currencyCode: z.string().trim().length(3),
      runningBalanceMinor: z.string().nullable().optional(),
      rawPayload: z.record(z.string(), z.unknown()).optional(),
    }),
  ).min(1),
});

export type IngestBankStatementCommand = z.infer<
  typeof ingestBankStatementCommandSchema
>;
```

---

## `packages/contracts/src/erp/finance/treasury/bank-statement-line.entity.ts`

```ts
import { z } from "zod";
import {
  treasuryCashDirectionSchema,
  treasuryReconciliationStateSchema,
} from "./shared";

export const bankStatementLineEntitySchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  bankStatementId: z.string().uuid(),
  bankAccountId: z.string().uuid(),
  externalLineRef: z.string().trim().min(1).max(128),
  bookingDate: z.string().date(),
  valueDate: z.string().date().nullable(),
  description: z.string().trim().min(1).max(1000),
  direction: treasuryCashDirectionSchema,
  amountMinor: z.string(),
  currencyCode: z.string().trim().length(3),
  runningBalanceMinor: z.string().nullable(),
  reconciliationState: treasuryReconciliationStateSchema,
  rawPayload: z.record(z.string(), z.unknown()).nullable(),
  createdAt: z.string().datetime(),
});

export type BankStatementLineEntity = z.infer<
  typeof bankStatementLineEntitySchema
>;
```

---

## `packages/contracts/src/erp/finance/treasury/index.ts`

```ts
export * from "./shared";
export * from "./bank-account.entity";
export * from "./bank-account.commands";
export * from "./bank-statement.entity";
export * from "./bank-statement.commands";
export * from "./bank-statement-line.entity";
```

---

# 3. DB schema

## `packages/db/src/schema/erp/finance/treasury/bank-account.table.ts`

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

export const treasuryBankAccountTable = pgTable(
  "treasury_bank_account",
  {
    id: uuid("id").primaryKey(),
    orgId: uuid("org_id").notNull(),
    code: text("code").notNull(),
    accountName: text("account_name").notNull(),
    bankName: text("bank_name").notNull(),
    bankCode: text("bank_code").notNull(),
    accountNumberMasked: text("account_number_masked").notNull(),
    accountNumberHash: text("account_number_hash").notNull(),
    iban: text("iban"),
    swiftBic: text("swift_bic"),
    currencyCode: text("currency_code").notNull(),
    countryCode: text("country_code"),
    externalBankRef: text("external_bank_ref"),
    status: text("status").notNull(),
    isPrimary: boolean("is_primary").notNull().default(false),
    activatedAt: timestamp("activated_at", { withTimezone: true }),
    deactivatedAt: timestamp("deactivated_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => ({
    orgIdx: index("treasury_bank_account__org_idx").on(table.orgId),
    orgCodeUq: uniqueIndex("treasury_bank_account__org_code_uq").on(
      table.orgId,
      table.code,
    ),
    orgExternalBankRefIdx: index(
      "treasury_bank_account__org_external_bank_ref_idx",
    ).on(table.orgId, table.externalBankRef),
    orgAccountHashIdx: index("treasury_bank_account__org_account_hash_idx").on(
      table.orgId,
      table.accountNumberHash,
    ),
  }),
);
```

---

## `packages/db/src/schema/erp/finance/treasury/bank-statement.table.ts`

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

export const treasuryBankStatementTable = pgTable(
  "treasury_bank_statement",
  {
    id: uuid("id").primaryKey(),
    orgId: uuid("org_id").notNull(),
    bankAccountId: uuid("bank_account_id").notNull(),
    statementDate: date("statement_date").notNull(),
    sourceFileName: text("source_file_name").notNull(),
    sourceHash: text("source_hash").notNull(),
    sourceFormat: text("source_format").notNull(),
    status: text("status").notNull(),
    openingBalanceMinor: text("opening_balance_minor").notNull(),
    closingBalanceMinor: text("closing_balance_minor").notNull(),
    currencyCode: text("currency_code").notNull(),
    ingestionError: text("ingestion_error"),
    parsedAt: timestamp("parsed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => ({
    orgIdx: index("treasury_bank_statement__org_idx").on(table.orgId),
    orgBankAccountIdx: index("treasury_bank_statement__org_bank_account_idx").on(
      table.orgId,
      table.bankAccountId,
    ),
    orgSourceHashUq: uniqueIndex(
      "treasury_bank_statement__org_source_hash_uq",
    ).on(table.orgId, table.sourceHash),
  }),
);
```

---

## `packages/db/src/schema/erp/finance/treasury/bank-statement-line.table.ts`

```ts
import {
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  date,
  jsonb,
} from "drizzle-orm/pg-core";

export const treasuryBankStatementLineTable = pgTable(
  "treasury_bank_statement_line",
  {
    id: uuid("id").primaryKey(),
    orgId: uuid("org_id").notNull(),
    bankStatementId: uuid("bank_statement_id").notNull(),
    bankAccountId: uuid("bank_account_id").notNull(),
    externalLineRef: text("external_line_ref").notNull(),
    bookingDate: date("booking_date").notNull(),
    valueDate: date("value_date"),
    description: text("description").notNull(),
    direction: text("direction").notNull(),
    amountMinor: text("amount_minor").notNull(),
    currencyCode: text("currency_code").notNull(),
    runningBalanceMinor: text("running_balance_minor"),
    reconciliationState: text("reconciliation_state").notNull(),
    rawPayload: jsonb("raw_payload"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (table) => ({
    orgStatementIdx: index("treasury_bank_statement_line__org_statement_idx").on(
      table.orgId,
      table.bankStatementId,
    ),
    orgBankAccountIdx: index(
      "treasury_bank_statement_line__org_bank_account_idx",
    ).on(table.orgId, table.bankAccountId),
    orgStatementExternalRefUq: uniqueIndex(
      "treasury_bank_statement_line__org_statement_external_ref_uq",
    ).on(table.orgId, table.bankStatementId, table.externalLineRef),
  }),
);
```

---

## `packages/db/src/schema/erp/finance/treasury/index.ts`

```ts
export * from "./bank-account.table";
export * from "./bank-statement.table";
export * from "./bank-statement-line.table";
```

---

# 4. Core services

Below I assume you already have equivalents like:

* `db`
* `withAudit(...)`
* outbox writer
* typed `Result`
* shared app errors

If your exact helpers differ, keep the service shape and swap the infra.

---

## `packages/core/src/erp/finance/treasury/bank-account.service.ts`

```ts
import { and, desc, eq } from "drizzle-orm";
import { randomUUID, createHash } from "node:crypto";

import {
  activateBankAccountCommandSchema,
  createBankAccountCommandSchema,
  deactivateBankAccountCommandSchema,
  updateBankAccountCommandSchema,
  type ActivateBankAccountCommand,
  type CreateBankAccountCommand,
  type DeactivateBankAccountCommand,
  type UpdateBankAccountCommand,
} from "@afenda/contracts/erp/finance/treasury";
import { treasuryBankAccountTable } from "@afenda/db/schema/erp/finance/treasury";

type DbTx = any;
type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } };

function maskAccountNumber(accountNumber: string): string {
  const last4 = accountNumber.slice(-4);
  return `****${last4}`;
}

function hashAccountNumber(accountNumber: string): string {
  return createHash("sha256").update(accountNumber).digest("hex");
}

async function emitOutboxEvent(tx: DbTx, input: {
  orgId: string;
  actorUserId: string;
  correlationId: string;
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  payload: Record<string, unknown>;
}) {
  // Replace with your real outbox write
  void tx;
  void input;
}

async function withAudit<T>(
  tx: DbTx,
  input: {
    orgId: string;
    actorUserId: string;
    correlationId: string;
    action: string;
    entityType: string;
    entityId: string;
    payload: Record<string, unknown>;
  },
  fn: () => Promise<T>,
): Promise<T> {
  // Replace with your real audit wrapper
  void tx;
  void input;
  return fn();
}

function illegalTransition(message: string): ServiceResult<never> {
  return {
    ok: false,
    error: {
      code: "TREASURY_BANK_ACCOUNT_ILLEGAL_TRANSITION",
      message,
    },
  };
}

export class TreasuryBankAccountService {
  constructor(private readonly db: DbTx) {}

  async create(
    raw: CreateBankAccountCommand,
  ): Promise<ServiceResult<{ id: string }>> {
    const input = createBankAccountCommandSchema.parse(raw);

    const existing = await this.db.query.treasuryBankAccountTable.findFirst({
      where: and(
        eq(treasuryBankAccountTable.orgId, input.orgId),
        eq(treasuryBankAccountTable.code, input.code),
      ),
    });

    if (existing) {
      return {
        ok: false,
        error: {
          code: "TREASURY_BANK_ACCOUNT_CODE_EXISTS",
          message: `Bank account code '${input.code}' already exists`,
        },
      };
    }

    const id = randomUUID();
    const now = new Date();

    await withAudit(
      this.db,
      {
        orgId: input.orgId,
        actorUserId: input.actorUserId,
        correlationId: input.correlationId,
        action: "treasury.bank-account.create",
        entityType: "treasury_bank_account",
        entityId: id,
        payload: {
          code: input.code,
          currencyCode: input.currencyCode,
        },
      },
      async () => {
        if (input.isPrimary) {
          await this.db
            .update(treasuryBankAccountTable)
            .set({
              isPrimary: false,
              updatedAt: now,
            })
            .where(eq(treasuryBankAccountTable.orgId, input.orgId));
        }

        await this.db.insert(treasuryBankAccountTable).values({
          id,
          orgId: input.orgId,
          code: input.code,
          accountName: input.accountName,
          bankName: input.bankName,
          bankCode: input.bankCode,
          accountNumberMasked: maskAccountNumber(input.accountNumber),
          accountNumberHash: hashAccountNumber(input.accountNumber),
          iban: input.iban ?? null,
          swiftBic: input.swiftBic ?? null,
          currencyCode: input.currencyCode.toUpperCase(),
          countryCode: input.countryCode?.toUpperCase() ?? null,
          externalBankRef: input.externalBankRef ?? null,
          status: "draft",
          isPrimary: input.isPrimary ?? false,
          activatedAt: null,
          deactivatedAt: null,
          createdAt: now,
          updatedAt: now,
        });

        await emitOutboxEvent(this.db, {
          orgId: input.orgId,
          actorUserId: input.actorUserId,
          correlationId: input.correlationId,
          eventType: "treasury.bank-account.created",
          aggregateType: "treasury_bank_account",
          aggregateId: id,
          payload: {
            id,
            code: input.code,
            status: "draft",
          },
        });
      },
    );

    return { ok: true, data: { id } };
  }

  async update(
    raw: UpdateBankAccountCommand,
  ): Promise<ServiceResult<{ id: string }>> {
    const input = updateBankAccountCommandSchema.parse(raw);

    const existing = await this.db.query.treasuryBankAccountTable.findFirst({
      where: and(
        eq(treasuryBankAccountTable.orgId, input.orgId),
        eq(treasuryBankAccountTable.id, input.bankAccountId),
      ),
    });

    if (!existing) {
      return {
        ok: false,
        error: {
          code: "TREASURY_BANK_ACCOUNT_NOT_FOUND",
          message: "Bank account not found",
        },
      };
    }

    if (existing.status === "closed") {
      return illegalTransition("Closed bank account cannot be updated");
    }

    const now = new Date();

    await withAudit(
      this.db,
      {
        orgId: input.orgId,
        actorUserId: input.actorUserId,
        correlationId: input.correlationId,
        action: "treasury.bank-account.update",
        entityType: "treasury_bank_account",
        entityId: existing.id,
        payload: {
          status: existing.status,
        },
      },
      async () => {
        if (input.isPrimary === true) {
          await this.db
            .update(treasuryBankAccountTable)
            .set({
              isPrimary: false,
              updatedAt: now,
            })
            .where(eq(treasuryBankAccountTable.orgId, input.orgId));
        }

        await this.db
          .update(treasuryBankAccountTable)
          .set({
            accountName: input.accountName ?? existing.accountName,
            bankName: input.bankName ?? existing.bankName,
            bankCode: input.bankCode ?? existing.bankCode,
            iban: input.iban ?? existing.iban,
            swiftBic: input.swiftBic ?? existing.swiftBic,
            externalBankRef: input.externalBankRef ?? existing.externalBankRef,
            isPrimary: input.isPrimary ?? existing.isPrimary,
            updatedAt: now,
          })
          .where(eq(treasuryBankAccountTable.id, existing.id));

        await emitOutboxEvent(this.db, {
          orgId: input.orgId,
          actorUserId: input.actorUserId,
          correlationId: input.correlationId,
          eventType: "treasury.bank-account.updated",
          aggregateType: "treasury_bank_account",
          aggregateId: existing.id,
          payload: { id: existing.id },
        });
      },
    );

    return { ok: true, data: { id: existing.id } };
  }

  async activate(
    raw: ActivateBankAccountCommand,
  ): Promise<ServiceResult<{ id: string }>> {
    const input = activateBankAccountCommandSchema.parse(raw);

    const existing = await this.db.query.treasuryBankAccountTable.findFirst({
      where: and(
        eq(treasuryBankAccountTable.orgId, input.orgId),
        eq(treasuryBankAccountTable.id, input.bankAccountId),
      ),
    });

    if (!existing) {
      return {
        ok: false,
        error: {
          code: "TREASURY_BANK_ACCOUNT_NOT_FOUND",
          message: "Bank account not found",
        },
      };
    }

    if (existing.status === "active") {
      return { ok: true, data: { id: existing.id } };
    }

    if (existing.status === "closed") {
      return illegalTransition("Closed bank account cannot be activated");
    }

    const now = new Date();

    await withAudit(
      this.db,
      {
        orgId: input.orgId,
        actorUserId: input.actorUserId,
        correlationId: input.correlationId,
        action: "treasury.bank-account.activate",
        entityType: "treasury_bank_account",
        entityId: existing.id,
        payload: {},
      },
      async () => {
        await this.db
          .update(treasuryBankAccountTable)
          .set({
            status: "active",
            activatedAt: now,
            deactivatedAt: null,
            updatedAt: now,
          })
          .where(eq(treasuryBankAccountTable.id, existing.id));

        await emitOutboxEvent(this.db, {
          orgId: input.orgId,
          actorUserId: input.actorUserId,
          correlationId: input.correlationId,
          eventType: "treasury.bank-account.activated",
          aggregateType: "treasury_bank_account",
          aggregateId: existing.id,
          payload: { id: existing.id },
        });
      },
    );

    return { ok: true, data: { id: existing.id } };
  }

  async deactivate(
    raw: DeactivateBankAccountCommand,
  ): Promise<ServiceResult<{ id: string }>> {
    const input = deactivateBankAccountCommandSchema.parse(raw);

    const existing = await this.db.query.treasuryBankAccountTable.findFirst({
      where: and(
        eq(treasuryBankAccountTable.orgId, input.orgId),
        eq(treasuryBankAccountTable.id, input.bankAccountId),
      ),
    });

    if (!existing) {
      return {
        ok: false,
        error: {
          code: "TREASURY_BANK_ACCOUNT_NOT_FOUND",
          message: "Bank account not found",
        },
      };
    }

    if (existing.status === "inactive") {
      return { ok: true, data: { id: existing.id } };
    }

    if (existing.status === "closed") {
      return illegalTransition("Closed bank account cannot be deactivated");
    }

    const now = new Date();

    await withAudit(
      this.db,
      {
        orgId: input.orgId,
        actorUserId: input.actorUserId,
        correlationId: input.correlationId,
        action: "treasury.bank-account.deactivate",
        entityType: "treasury_bank_account",
        entityId: existing.id,
        payload: {
          reason: input.reason,
        },
      },
      async () => {
        await this.db
          .update(treasuryBankAccountTable)
          .set({
            status: "inactive",
            deactivatedAt: now,
            updatedAt: now,
          })
          .where(eq(treasuryBankAccountTable.id, existing.id));

        await emitOutboxEvent(this.db, {
          orgId: input.orgId,
          actorUserId: input.actorUserId,
          correlationId: input.correlationId,
          eventType: "treasury.bank-account.deactivated",
          aggregateType: "treasury_bank_account",
          aggregateId: existing.id,
          payload: {
            id: existing.id,
            reason: input.reason,
          },
        });
      },
    );

    return { ok: true, data: { id: existing.id } };
  }
}
```

---

## `packages/core/src/erp/finance/treasury/bank-account.queries.ts`

```ts
import { and, desc, eq } from "drizzle-orm";
import { treasuryBankAccountTable } from "@afenda/db/schema/erp/finance/treasury";

type DbTx = any;

export class TreasuryBankAccountQueries {
  constructor(private readonly db: DbTx) {}

  async listByOrg(orgId: string) {
    return this.db
      .select()
      .from(treasuryBankAccountTable)
      .where(eq(treasuryBankAccountTable.orgId, orgId))
      .orderBy(desc(treasuryBankAccountTable.createdAt));
  }

  async getById(orgId: string, bankAccountId: string) {
    const rows = await this.db
      .select()
      .from(treasuryBankAccountTable)
      .where(
        and(
          eq(treasuryBankAccountTable.orgId, orgId),
          eq(treasuryBankAccountTable.id, bankAccountId),
        ),
      )
      .limit(1);

    return rows[0] ?? null;
  }
}
```

---

## `packages/core/src/erp/finance/treasury/bank-statement.service.ts`

```ts
import { and, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";

import {
  ingestBankStatementCommandSchema,
  type IngestBankStatementCommand,
} from "@afenda/contracts/erp/finance/treasury";
import {
  treasuryBankAccountTable,
  treasuryBankStatementLineTable,
  treasuryBankStatementTable,
} from "@afenda/db/schema/erp/finance/treasury";

type DbTx = any;
type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } };

async function emitOutboxEvent(tx: DbTx, input: {
  orgId: string;
  actorUserId: string;
  correlationId: string;
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  payload: Record<string, unknown>;
}) {
  void tx;
  void input;
}

async function withAudit<T>(
  tx: DbTx,
  input: {
    orgId: string;
    actorUserId: string;
    correlationId: string;
    action: string;
    entityType: string;
    entityId: string;
    payload: Record<string, unknown>;
  },
  fn: () => Promise<T>,
): Promise<T> {
  void tx;
  void input;
  return fn();
}

export class TreasuryBankStatementService {
  constructor(private readonly db: DbTx) {}

  async ingest(
    raw: IngestBankStatementCommand,
  ): Promise<ServiceResult<{ statementId: string }>> {
    const input = ingestBankStatementCommandSchema.parse(raw);

    const bankAccount = await this.db.query.treasuryBankAccountTable.findFirst({
      where: and(
        eq(treasuryBankAccountTable.orgId, input.orgId),
        eq(treasuryBankAccountTable.id, input.bankAccountId),
      ),
    });

    if (!bankAccount) {
      return {
        ok: false,
        error: {
          code: "TREASURY_BANK_ACCOUNT_NOT_FOUND",
          message: "Bank account not found",
        },
      };
    }

    const existingStatement =
      await this.db.query.treasuryBankStatementTable.findFirst({
        where: and(
          eq(treasuryBankStatementTable.orgId, input.orgId),
          eq(treasuryBankStatementTable.sourceHash, input.sourceHash),
        ),
      });

    if (existingStatement) {
      return {
        ok: true,
        data: {
          statementId: existingStatement.id,
        },
      };
    }

    const statementId = randomUUID();
    const now = new Date();

    await withAudit(
      this.db,
      {
        orgId: input.orgId,
        actorUserId: input.actorUserId,
        correlationId: input.correlationId,
        action: "treasury.bank-statement.ingest",
        entityType: "treasury_bank_statement",
        entityId: statementId,
        payload: {
          sourceFileName: input.sourceFileName,
          sourceHash: input.sourceHash,
          lineCount: input.lines.length,
        },
      },
      async () => {
        await this.db.insert(treasuryBankStatementTable).values({
          id: statementId,
          orgId: input.orgId,
          bankAccountId: input.bankAccountId,
          statementDate: input.statementDate,
          sourceFileName: input.sourceFileName,
          sourceHash: input.sourceHash,
          sourceFormat: input.sourceFormat,
          status: "parsed",
          openingBalanceMinor: input.openingBalanceMinor,
          closingBalanceMinor: input.closingBalanceMinor,
          currencyCode: input.currencyCode,
          ingestionError: null,
          parsedAt: now,
          createdAt: now,
          updatedAt: now,
        });

        for (const line of input.lines) {
          await this.db.insert(treasuryBankStatementLineTable).values({
            id: randomUUID(),
            orgId: input.orgId,
            bankStatementId: statementId,
            bankAccountId: input.bankAccountId,
            externalLineRef: line.externalLineRef,
            bookingDate: line.bookingDate,
            valueDate: line.valueDate ?? null,
            description: line.description,
            direction: line.direction,
            amountMinor: line.amountMinor,
            currencyCode: line.currencyCode,
            runningBalanceMinor: line.runningBalanceMinor ?? null,
            reconciliationState: "unreconciled",
            rawPayload: line.rawPayload ?? null,
            createdAt: now,
          });
        }

        await emitOutboxEvent(this.db, {
          orgId: input.orgId,
          actorUserId: input.actorUserId,
          correlationId: input.correlationId,
          eventType: "treasury.bank-statement.ingested",
          aggregateType: "treasury_bank_statement",
          aggregateId: statementId,
          payload: {
            statementId,
            bankAccountId: input.bankAccountId,
            lineCount: input.lines.length,
            statementDate: input.statementDate,
          },
        });
      },
    );

    return {
      ok: true,
      data: {
        statementId,
      },
    };
  }
}
```

---

## `packages/core/src/erp/finance/treasury/bank-statement.queries.ts`

```ts
import { and, desc, eq } from "drizzle-orm";
import {
  treasuryBankStatementLineTable,
  treasuryBankStatementTable,
} from "@afenda/db/schema/erp/finance/treasury";

type DbTx = any;

export class TreasuryBankStatementQueries {
  constructor(private readonly db: DbTx) {}

  async listByOrg(orgId: string) {
    return this.db
      .select()
      .from(treasuryBankStatementTable)
      .where(eq(treasuryBankStatementTable.orgId, orgId))
      .orderBy(desc(treasuryBankStatementTable.createdAt));
  }

  async getById(orgId: string, statementId: string) {
    const rows = await this.db
      .select()
      .from(treasuryBankStatementTable)
      .where(
        and(
          eq(treasuryBankStatementTable.orgId, orgId),
          eq(treasuryBankStatementTable.id, statementId),
        ),
      )
      .limit(1);

    return rows[0] ?? null;
  }

  async listLines(orgId: string, statementId: string) {
    return this.db
      .select()
      .from(treasuryBankStatementLineTable)
      .where(
        and(
          eq(treasuryBankStatementLineTable.orgId, orgId),
          eq(treasuryBankStatementLineTable.bankStatementId, statementId),
        ),
      )
      .orderBy(desc(treasuryBankStatementLineTable.bookingDate));
  }
}
```

---

## `packages/core/src/erp/finance/treasury/index.ts`

```ts
export * from "./bank-account.service";
export * from "./bank-account.queries";
export * from "./bank-statement.service";
export * from "./bank-statement.queries";
```

---

# 5. API route

## `apps/api/src/routes/erp/finance/treasury.ts`

This stays thin. No direct db logic outside service/query composition.

```ts
import type { FastifyInstance } from "fastify";

import {
  activateBankAccountCommandSchema,
  createBankAccountCommandSchema,
  deactivateBankAccountCommandSchema,
  ingestBankStatementCommandSchema,
  updateBankAccountCommandSchema,
} from "@afenda/contracts/erp/finance/treasury";
import {
  TreasuryBankAccountQueries,
  TreasuryBankAccountService,
  TreasuryBankStatementQueries,
  TreasuryBankStatementService,
} from "@afenda/core/erp/finance/treasury";

export async function registerTreasuryRoutes(app: FastifyInstance) {
  app.post("/v1/commands/erp/finance/treasury/bank-accounts/create", async (req, reply) => {
    const input = createBankAccountCommandSchema.parse(req.body);
    const service = new TreasuryBankAccountService(app.db);
    const result = await service.create(input);

    if (!result.ok) return reply.code(400).send(result.error);
    return reply.code(201).send(result.data);
  });

  app.post("/v1/commands/erp/finance/treasury/bank-accounts/update", async (req, reply) => {
    const input = updateBankAccountCommandSchema.parse(req.body);
    const service = new TreasuryBankAccountService(app.db);
    const result = await service.update(input);

    if (!result.ok) return reply.code(400).send(result.error);
    return reply.send(result.data);
  });

  app.post("/v1/commands/erp/finance/treasury/bank-accounts/activate", async (req, reply) => {
    const input = activateBankAccountCommandSchema.parse(req.body);
    const service = new TreasuryBankAccountService(app.db);
    const result = await service.activate(input);

    if (!result.ok) return reply.code(400).send(result.error);
    return reply.send(result.data);
  });

  app.post("/v1/commands/erp/finance/treasury/bank-accounts/deactivate", async (req, reply) => {
    const input = deactivateBankAccountCommandSchema.parse(req.body);
    const service = new TreasuryBankAccountService(app.db);
    const result = await service.deactivate(input);

    if (!result.ok) return reply.code(400).send(result.error);
    return reply.send(result.data);
  });

  app.get("/v1/erp/finance/treasury/bank-accounts", async (req: any) => {
    const orgId = req.user.orgId;
    const queries = new TreasuryBankAccountQueries(app.db);
    return queries.listByOrg(orgId);
  });

  app.get("/v1/erp/finance/treasury/bank-accounts/:id", async (req: any, reply) => {
    const orgId = req.user.orgId;
    const queries = new TreasuryBankAccountQueries(app.db);
    const row = await queries.getById(orgId, req.params.id);

    if (!row) return reply.code(404).send({ code: "NOT_FOUND" });
    return row;
  });

  app.post("/v1/commands/erp/finance/treasury/bank-statements/ingest", async (req, reply) => {
    const input = ingestBankStatementCommandSchema.parse(req.body);
    const service = new TreasuryBankStatementService(app.db);
    const result = await service.ingest(input);

    if (!result.ok) return reply.code(400).send(result.error);
    return reply.code(201).send(result.data);
  });

  app.get("/v1/erp/finance/treasury/bank-statements", async (req: any) => {
    const orgId = req.user.orgId;
    const queries = new TreasuryBankStatementQueries(app.db);
    return queries.listByOrg(orgId);
  });

  app.get("/v1/erp/finance/treasury/bank-statements/:id", async (req: any, reply) => {
    const orgId = req.user.orgId;
    const queries = new TreasuryBankStatementQueries(app.db);
    const statement = await queries.getById(orgId, req.params.id);

    if (!statement) return reply.code(404).send({ code: "NOT_FOUND" });

    const lines = await queries.listLines(orgId, req.params.id);
    return { statement, lines };
  });
}
```

---

# 6. Worker

## `apps/worker/src/jobs/erp/finance/treasury/handle-bank-statement-ingested.ts`

This is where you enrich, auto-tag, and schedule reconciliation suggestions.

```ts
type JobContext = {
  db: any;
  logger: {
    info: (payload: Record<string, unknown>, msg?: string) => void;
    error: (payload: Record<string, unknown>, msg?: string) => void;
  };
};

type BankStatementIngestedEvent = {
  statementId: string;
  bankAccountId: string;
  lineCount: number;
  statementDate: string;
  orgId: string;
  correlationId: string;
};

export async function handleBankStatementIngested(
  ctx: JobContext,
  event: BankStatementIngestedEvent,
) {
  ctx.logger.info(
    {
      statementId: event.statementId,
      bankAccountId: event.bankAccountId,
      orgId: event.orgId,
      lineCount: event.lineCount,
      correlationId: event.correlationId,
    },
    "Handling treasury.bank-statement.ingested",
  );

  // future:
  // 1. auto-classification
  // 2. enrichment from AP/AR refs
  // 3. create reconciliation suggestion session
  // 4. push observability metrics

  return { ok: true };
}
```

---

## `apps/worker/src/jobs/erp/finance/treasury/index.ts`

```ts
export * from "./handle-bank-statement-ingested";
```

---

# 7. Web actions

## `apps/web/src/app/(erp)/finance/treasury/actions.ts`

```ts
"use server";

import { revalidatePath } from "next/cache";

const API_BASE_URL = process.env.API_BASE_URL!;

async function postJson(path: string, body: unknown) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: "Request failed" }));
    throw new Error(error.message ?? "Request failed");
  }

  return res.json();
}

export async function createTreasuryBankAccountAction(formData: FormData) {
  await postJson("/v1/commands/erp/finance/treasury/bank-accounts/create", {
    orgId: formData.get("orgId"),
    actorUserId: formData.get("actorUserId"),
    correlationId: crypto.randomUUID(),
    idempotencyKey: crypto.randomUUID(),
    code: formData.get("code"),
    accountName: formData.get("accountName"),
    bankName: formData.get("bankName"),
    bankCode: formData.get("bankCode"),
    accountNumber: formData.get("accountNumber"),
    currencyCode: formData.get("currencyCode"),
    iban: formData.get("iban") || null,
    swiftBic: formData.get("swiftBic") || null,
    countryCode: formData.get("countryCode") || null,
    externalBankRef: formData.get("externalBankRef") || null,
    isPrimary: formData.get("isPrimary") === "on",
  });

  revalidatePath("/finance/treasury/bank-accounts");
}

export async function ingestTreasuryBankStatementAction(formData: FormData) {
  const linesJson = formData.get("linesJson");
  const parsedLines = JSON.parse(String(linesJson));

  await postJson("/v1/commands/erp/finance/treasury/bank-statements/ingest", {
    orgId: formData.get("orgId"),
    actorUserId: formData.get("actorUserId"),
    correlationId: crypto.randomUUID(),
    idempotencyKey: crypto.randomUUID(),
    bankAccountId: formData.get("bankAccountId"),
    statementDate: formData.get("statementDate"),
    sourceFileName: formData.get("sourceFileName"),
    sourceHash: formData.get("sourceHash"),
    sourceFormat: formData.get("sourceFormat"),
    openingBalanceMinor: formData.get("openingBalanceMinor"),
    closingBalanceMinor: formData.get("closingBalanceMinor"),
    currencyCode: formData.get("currencyCode"),
    lines: parsedLines,
  });

  revalidatePath("/finance/treasury/bank-statements");
}
```

---

# 8. Web pages

## `apps/web/src/app/(erp)/finance/treasury/page.tsx`

```tsx
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, Button } from "@afenda/ui";

export default function TreasuryHomePage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Treasury</h1>
        <p className="text-sm text-muted-foreground">
          Cash visibility, bank operations, and statement ingestion.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Bank Accounts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Manage operational bank accounts with state transitions.
            </p>
            <Button asChild>
              <Link href="/finance/treasury/bank-accounts">Open</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Bank Statements</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Ingest statements and monitor line-level cash activity.
            </p>
            <Button asChild>
              <Link href="/finance/treasury/bank-statements">Open</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

---

## `apps/web/src/app/(erp)/finance/treasury/bank-accounts/page.tsx`

```tsx
import { createTreasuryBankAccountAction } from "../actions";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from "@afenda/ui";

const API_BASE_URL = process.env.API_BASE_URL!;

async function getBankAccounts() {
  const res = await fetch(
    `${API_BASE_URL}/v1/erp/finance/treasury/bank-accounts`,
    { cache: "no-store" },
  );

  if (!res.ok) return [];
  return res.json();
}

export default async function TreasuryBankAccountsPage() {
  const rows = await getBankAccounts();

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Treasury Bank Accounts</h1>
        <p className="text-sm text-muted-foreground">
          Org-scoped operational bank accounts for treasury execution.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create bank account</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createTreasuryBankAccountAction} className="grid gap-4 md:grid-cols-2">
            <input type="hidden" name="orgId" value="00000000-0000-0000-0000-000000000001" />
            <input type="hidden" name="actorUserId" value="00000000-0000-0000-0000-000000000002" />

            <div className="space-y-2">
              <Label htmlFor="code">Code</Label>
              <Input id="code" name="code" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="accountName">Account name</Label>
              <Input id="accountName" name="accountName" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bankName">Bank name</Label>
              <Input id="bankName" name="bankName" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bankCode">Bank code</Label>
              <Input id="bankCode" name="bankCode" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="accountNumber">Account number</Label>
              <Input id="accountNumber" name="accountNumber" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="currencyCode">Currency</Label>
              <Input id="currencyCode" name="currencyCode" defaultValue="USD" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="iban">IBAN</Label>
              <Input id="iban" name="iban" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="swiftBic">SWIFT/BIC</Label>
              <Input id="swiftBic" name="swiftBic" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="countryCode">Country</Label>
              <Input id="countryCode" name="countryCode" defaultValue="US" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="externalBankRef">External bank ref</Label>
              <Input id="externalBankRef" name="externalBankRef" />
            </div>

            <div className="md:col-span-2">
              <Button type="submit">Create</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Existing bank accounts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">No bank accounts yet.</p>
            ) : (
              rows.map((row: any) => (
                <div
                  key={row.id}
                  className="flex items-center justify-between rounded-xl border p-4"
                >
                  <div>
                    <div className="font-medium">{row.code} · {row.accountName}</div>
                    <div className="text-sm text-muted-foreground">
                      {row.bankName} · {row.currencyCode} · {row.accountNumberMasked}
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

## `apps/web/src/app/(erp)/finance/treasury/bank-statements/page.tsx`

```tsx
import { ingestTreasuryBankStatementAction } from "../actions";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Textarea,
} from "@afenda/ui";

const API_BASE_URL = process.env.API_BASE_URL!;

async function getStatements() {
  const res = await fetch(
    `${API_BASE_URL}/v1/erp/finance/treasury/bank-statements`,
    { cache: "no-store" },
  );

  if (!res.ok) return [];
  return res.json();
}

const sampleLines = JSON.stringify(
  [
    {
      externalLineRef: "LINE-0001",
      bookingDate: "2026-03-12",
      valueDate: "2026-03-12",
      description: "Supplier payment batch PB-1001",
      direction: "outflow",
      amountMinor: "125000",
      currencyCode: "USD",
      runningBalanceMinor: "875000",
      rawPayload: { channel: "manual-upload" },
    },
    {
      externalLineRef: "LINE-0002",
      bookingDate: "2026-03-12",
      valueDate: "2026-03-12",
      description: "Customer receipt RC-1002",
      direction: "inflow",
      amountMinor: "400000",
      currencyCode: "USD",
      runningBalanceMinor: "1275000",
      rawPayload: { channel: "manual-upload" },
    },
  ],
  null,
  2,
);

export default async function TreasuryBankStatementsPage() {
  const rows = await getStatements();

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Treasury Bank Statements</h1>
        <p className="text-sm text-muted-foreground">
          Idempotent ingestion and append-only statement line history.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ingest statement</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={ingestTreasuryBankStatementAction} className="grid gap-4">
            <input type="hidden" name="orgId" value="00000000-0000-0000-0000-000000000001" />
            <input type="hidden" name="actorUserId" value="00000000-0000-0000-0000-000000000002" />

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="bankAccountId">Bank account ID</Label>
                <Input id="bankAccountId" name="bankAccountId" required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="statementDate">Statement date</Label>
                <Input id="statementDate" name="statementDate" type="date" required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sourceFormat">Source format</Label>
                <Input id="sourceFormat" name="sourceFormat" defaultValue="csv" required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sourceFileName">Source file name</Label>
                <Input id="sourceFileName" name="sourceFileName" defaultValue="statement.csv" required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sourceHash">Source hash</Label>
                <Input id="sourceHash" name="sourceHash" defaultValue="hash-demo-20260312-0001" required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="currencyCode">Currency</Label>
                <Input id="currencyCode" name="currencyCode" defaultValue="USD" required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="openingBalanceMinor">Opening balance minor</Label>
                <Input id="openingBalanceMinor" name="openingBalanceMinor" defaultValue="1000000" required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="closingBalanceMinor">Closing balance minor</Label>
                <Input id="closingBalanceMinor" name="closingBalanceMinor" defaultValue="1275000" required />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="linesJson">Statement lines JSON</Label>
              <Textarea id="linesJson" name="linesJson" defaultValue={sampleLines} rows={16} />
            </div>

            <div>
              <Button type="submit">Ingest statement</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Statements</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">No statements yet.</p>
            ) : (
              rows.map((row: any) => (
                <div
                  key={row.id}
                  className="flex items-center justify-between rounded-xl border p-4"
                >
                  <div>
                    <div className="font-medium">
                      {row.sourceFileName} · {row.statementDate}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {row.currencyCode} · open {row.openingBalanceMinor} · close {row.closingBalanceMinor}
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

## `packages/core/src/erp/finance/treasury/__vitest_test__/treasury-test-builders.ts`

```ts
export function buildTreasuryCommandContext(overrides?: Partial<{
  orgId: string;
  actorUserId: string;
  correlationId: string;
  idempotencyKey: string;
}>) {
  return {
    orgId: "00000000-0000-0000-0000-000000000001",
    actorUserId: "00000000-0000-0000-0000-000000000002",
    correlationId: "corr-treasury-test-001",
    idempotencyKey: "idem-treasury-test-001",
    ...overrides,
  };
}
```

---

## `packages/core/src/erp/finance/treasury/__vitest_test__/bank-account.service.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { TreasuryBankAccountService } from "../bank-account.service";
import { buildTreasuryCommandContext } from "./treasury-test-builders";

describe("TreasuryBankAccountService", () => {
  it("creates bank account in draft state", async () => {
    const db = {
      query: {
        treasuryBankAccountTable: {
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

    const service = new TreasuryBankAccountService(db);

    const result = await service.create({
      ...buildTreasuryCommandContext(),
      code: "MAIN-USD-001",
      accountName: "Main USD Account",
      bankName: "JPM",
      bankCode: "JPMUS",
      accountNumber: "1234567890",
      currencyCode: "USD",
      isPrimary: true,
    });

    expect(result.ok).toBe(true);

    if (result.ok) {
      expect(result.data.id).toBeTruthy();
    }
  });
});
```

---

# 10. Minimal migration starter

## `packages/db/drizzle/<timestamp>_treasury_wave_1.sql`

You likely prefer manual SQL anyway because of the BigInt/gen drift issue.

```sql
CREATE TABLE treasury_bank_account (
  id uuid PRIMARY KEY,
  org_id uuid NOT NULL,
  code text NOT NULL,
  account_name text NOT NULL,
  bank_name text NOT NULL,
  bank_code text NOT NULL,
  account_number_masked text NOT NULL,
  account_number_hash text NOT NULL,
  iban text,
  swift_bic text,
  currency_code text NOT NULL,
  country_code text,
  external_bank_ref text,
  status text NOT NULL,
  is_primary boolean NOT NULL DEFAULT false,
  activated_at timestamptz,
  deactivated_at timestamptz,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);

CREATE UNIQUE INDEX treasury_bank_account__org_code_uq
  ON treasury_bank_account(org_id, code);

CREATE INDEX treasury_bank_account__org_idx
  ON treasury_bank_account(org_id);

CREATE INDEX treasury_bank_account__org_external_bank_ref_idx
  ON treasury_bank_account(org_id, external_bank_ref);

CREATE INDEX treasury_bank_account__org_account_hash_idx
  ON treasury_bank_account(org_id, account_number_hash);

CREATE TABLE treasury_bank_statement (
  id uuid PRIMARY KEY,
  org_id uuid NOT NULL,
  bank_account_id uuid NOT NULL,
  statement_date date NOT NULL,
  source_file_name text NOT NULL,
  source_hash text NOT NULL,
  source_format text NOT NULL,
  status text NOT NULL,
  opening_balance_minor text NOT NULL,
  closing_balance_minor text NOT NULL,
  currency_code text NOT NULL,
  ingestion_error text,
  parsed_at timestamptz,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);

CREATE UNIQUE INDEX treasury_bank_statement__org_source_hash_uq
  ON treasury_bank_statement(org_id, source_hash);

CREATE INDEX treasury_bank_statement__org_idx
  ON treasury_bank_statement(org_id);

CREATE INDEX treasury_bank_statement__org_bank_account_idx
  ON treasury_bank_statement(org_id, bank_account_id);

CREATE TABLE treasury_bank_statement_line (
  id uuid PRIMARY KEY,
  org_id uuid NOT NULL,
  bank_statement_id uuid NOT NULL,
  bank_account_id uuid NOT NULL,
  external_line_ref text NOT NULL,
  booking_date date NOT NULL,
  value_date date,
  description text NOT NULL,
  direction text NOT NULL,
  amount_minor text NOT NULL,
  currency_code text NOT NULL,
  running_balance_minor text,
  reconciliation_state text NOT NULL,
  raw_payload jsonb,
  created_at timestamptz NOT NULL
);

CREATE UNIQUE INDEX treasury_bank_statement_line__org_statement_external_ref_uq
  ON treasury_bank_statement_line(org_id, bank_statement_id, external_line_ref);

CREATE INDEX treasury_bank_statement_line__org_statement_idx
  ON treasury_bank_statement_line(org_id, bank_statement_id);

CREATE INDEX treasury_bank_statement_line__org_bank_account_idx
  ON treasury_bank_statement_line(org_id, bank_account_id);
```

---

# 11. Required cross-cutting additions

You explicitly said AP-grade patterns. So Wave 1 should also add these registry entries.

## Permissions

Add at least:

```ts
"erp.finance.treasury.bank-account.read"
"erp.finance.treasury.bank-account.manage"
"erp.finance.treasury.bank-statement.read"
"erp.finance.treasury.bank-statement.ingest"
```

## Audit actions

Add at least:

```ts
"treasury.bank-account.create"
"treasury.bank-account.update"
"treasury.bank-account.activate"
"treasury.bank-account.deactivate"
"treasury.bank-statement.ingest"
```

## Error codes

Add at least:

```ts
TREASURY_BANK_ACCOUNT_NOT_FOUND
TREASURY_BANK_ACCOUNT_CODE_EXISTS
TREASURY_BANK_ACCOUNT_ILLEGAL_TRANSITION
TREASURY_BANK_STATEMENT_DUPLICATE_SOURCE
TREASURY_BANK_STATEMENT_INVALID_ACCOUNT
```

## Outbox event types

Add at least:

```ts
treasury.bank-account.created
treasury.bank-account.updated
treasury.bank-account.activated
treasury.bank-account.deactivated
treasury.bank-statement.ingested
```

---

# 12. What this Wave 1 gives you

This scaffold gives you a real first treasury slice:

## Sprint 1.1

* bank account entity and commands
* org isolation
* state transitions
* primary account switching
* masked account persistence
* outbox + audit hook points
* thin API
* basic web CRUD entry point

## Sprint 1.2

* idempotent bank statement ingestion
* duplicate detection via `sourceHash`
* append-only statement lines
* line-level reconciliation state baseline
* worker hook for enrichment and auto-reconciliation
* monitoring UI starter

---

# 13. What I would change immediately for AFENDA v2

Because you are building **The Machine / Business Truth Engine**, I would harden this next:

## A. Do not store raw account number in DB

Current scaffold masks + hashes it only. That is correct for Wave 1.

## B. Add real idempotency persistence

Right now command schema has `idempotencyKey`, but service sample does not yet persist a command ledger.
For AFENDA northstar, you should add:

* `command_execution_log`
* unique `(org_id, idempotency_key, command_type)`

## C. Add RLS or hard org predicates everywhere

Wave 1 already uses explicit org filters. Keep that law absolute.

## D. Make statement lines immutable forever

Do not update line content after insert.
Only write:

* enrichment overlays
* reconciliation links
* classification events

## E. Add parser boundary

Do not parse CSV/MT940/CAMT directly in route.
Use:

* upload intake
* parser job
* normalized ingest command

That becomes your real enterprise adapter seam.

---

# 14. Best next file pack after this

The next logical pack is:

* `reconciliation-session.entity.ts`
* `reconciliation-session.commands.ts`
* `reconciliation-session.service.ts`
* `handle-reconciliation-suggested.ts`
* reconciliation workbench UI
* tolerance + amount-match engine

That is where Treasury starts becoming truly enterprise-grade and AP-linked.

---

# 15. My architecture advice on your scaffold

Your wave structure is strong. The main thing I would sharpen is this:

**Wave 1 should not just be CRUD + upload.**
It should already establish **truth lineage**.

So every bank statement line should eventually be able to answer:

* where it came from
* which file produced it
* which parser version normalized it
* which worker enriched it
* which AP/AR/GL object it later matched to
* which audit actor approved any exception

That aligns much better with AFENDA’s thesis:
**not features, but truth.**

---

If you want, next I will produce **Wave 2 in the same drop-in style** with:

* `reconciliation-session`
* `treasury-payment-instruction`
* `treasury-payment-batch`
* maker-checker SoD
* AP → Treasury payment bridge

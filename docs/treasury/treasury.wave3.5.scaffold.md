Excellent. Here is the **next scaffold**:

# Wave 3.5 — AP/AR → Treasury Liquidity Bridge

This is the right bridge before Wave 4 because your Wave 3 target is not just forecasting, but forecasting **integrated with AP/AR flows**. 

The goal is:

* AP produces projected outflows
* AR produces projected inflows
* Treasury consumes normalized liquidity feeds
* Cash position and forecast stop reading siloed assumptions
* Everything stays auditable, versioned, and reproducible

---

# 1. Delivery outcome

By the end of this scaffold, AFENDA Treasury should be able to say:

* these AP obligations are expected cash outflows
* these AR receivables are expected cash inflows
* these flows entered Treasury through a normalized feed boundary
* snapshot X and forecast Y used feed version Z
* forecast variance can later compare against actuals

This is the real bridge from **operational truth** to **liquidity truth**.

---

# 2. Target file set

## Contracts

* `packages/contracts/src/erp/finance/treasury/ap-due-payment-projection.entity.ts`
* `packages/contracts/src/erp/finance/treasury/ap-due-payment-projection.commands.ts`
* `packages/contracts/src/erp/finance/treasury/ar-expected-receipt-projection.entity.ts`
* `packages/contracts/src/erp/finance/treasury/ar-expected-receipt-projection.commands.ts`
* `packages/contracts/src/erp/finance/treasury/liquidity-source-feed.entity.ts`
* `packages/contracts/src/erp/finance/treasury/liquidity-source-feed.commands.ts`

## DB

* `packages/db/src/schema/erp/finance/treasury/ap-due-payment-projection.table.ts`
* `packages/db/src/schema/erp/finance/treasury/ar-expected-receipt-projection.table.ts`
* `packages/db/src/schema/erp/finance/treasury/liquidity-source-feed.table.ts`

## Core

* `packages/core/src/erp/finance/treasury/ap-due-payment-projection.service.ts`
* `packages/core/src/erp/finance/treasury/ap-due-payment-projection.queries.ts`
* `packages/core/src/erp/finance/treasury/ar-expected-receipt-projection.service.ts`
* `packages/core/src/erp/finance/treasury/ar-expected-receipt-projection.queries.ts`
* `packages/core/src/erp/finance/treasury/liquidity-source-feed.service.ts`
* `packages/core/src/erp/finance/treasury/liquidity-source-feed.queries.ts`
* `packages/core/src/erp/finance/treasury/calculators/liquidity-bucket-allocation.ts`

## API

* extend `apps/api/src/routes/erp/finance/treasury.ts`

## Worker

* `apps/worker/src/jobs/erp/finance/treasury/handle-ap-due-payment-projection-refreshed.ts`
* `apps/worker/src/jobs/erp/finance/treasury/handle-ar-expected-receipt-projection-refreshed.ts`
* `apps/worker/src/jobs/erp/finance/treasury/handle-liquidity-source-feed-refreshed.ts`

## Web

* `apps/web/src/app/(erp)/finance/treasury/liquidity-bridge/page.tsx`

---

# 3. Contracts

## `ap-due-payment-projection.entity.ts`

```ts
import { z } from "zod";

export const apDuePaymentProjectionStatusSchema = z.enum([
  "open",
  "partially_paid",
  "fully_paid",
  "cancelled",
]);

export const apDuePaymentProjectionEntitySchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  sourcePayableId: z.string().uuid(),
  supplierId: z.string().uuid(),
  supplierName: z.string().trim().min(1).max(255),
  paymentTermCode: z.string().trim().max(64).nullable(),
  dueDate: z.string().date(),
  expectedPaymentDate: z.string().date(),
  currencyCode: z.string().trim().length(3),
  grossAmountMinor: z.string(),
  openAmountMinor: z.string(),
  paymentMethod: z.enum([
    "bank_transfer",
    "wire",
    "ach",
    "sepa",
    "manual",
  ]).nullable(),
  status: apDuePaymentProjectionStatusSchema,
  sourceVersion: z.string().trim().min(1).max(128),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type ApDuePaymentProjectionEntity = z.infer<
  typeof apDuePaymentProjectionEntitySchema
>;
```

---

## `ap-due-payment-projection.commands.ts`

```ts
import { z } from "zod";
import { idempotencyKeySchema, orgScopedMetadataSchema } from "./shared";

export const upsertApDuePaymentProjectionCommandSchema = z.object({
  ...orgScopedMetadataSchema.shape,
  idempotencyKey: idempotencyKeySchema,
  sourcePayableId: z.string().uuid(),
  supplierId: z.string().uuid(),
  supplierName: z.string().trim().min(1).max(255),
  paymentTermCode: z.string().trim().max(64).nullable().optional(),
  dueDate: z.string().date(),
  expectedPaymentDate: z.string().date(),
  currencyCode: z.string().trim().length(3),
  grossAmountMinor: z.string(),
  openAmountMinor: z.string(),
  paymentMethod: z.enum([
    "bank_transfer",
    "wire",
    "ach",
    "sepa",
    "manual",
  ]).nullable().optional(),
  sourceVersion: z.string().trim().min(1).max(128),
});

export type UpsertApDuePaymentProjectionCommand = z.infer<
  typeof upsertApDuePaymentProjectionCommandSchema
>;
```

---

## `ar-expected-receipt-projection.entity.ts`

```ts
import { z } from "zod";

export const arExpectedReceiptProjectionStatusSchema = z.enum([
  "open",
  "partially_received",
  "fully_received",
  "cancelled",
]);

export const arExpectedReceiptProjectionEntitySchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  sourceReceivableId: z.string().uuid(),
  customerId: z.string().uuid(),
  customerName: z.string().trim().min(1).max(255),
  dueDate: z.string().date(),
  expectedReceiptDate: z.string().date(),
  currencyCode: z.string().trim().length(3),
  grossAmountMinor: z.string(),
  openAmountMinor: z.string(),
  receiptMethod: z.enum([
    "bank_transfer",
    "wire",
    "ach",
    "sepa",
    "cash",
    "manual",
  ]).nullable(),
  status: arExpectedReceiptProjectionStatusSchema,
  sourceVersion: z.string().trim().min(1).max(128),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type ArExpectedReceiptProjectionEntity = z.infer<
  typeof arExpectedReceiptProjectionEntitySchema
>;
```

---

## `ar-expected-receipt-projection.commands.ts`

```ts
import { z } from "zod";
import { idempotencyKeySchema, orgScopedMetadataSchema } from "./shared";

export const upsertArExpectedReceiptProjectionCommandSchema = z.object({
  ...orgScopedMetadataSchema.shape,
  idempotencyKey: idempotencyKeySchema,
  sourceReceivableId: z.string().uuid(),
  customerId: z.string().uuid(),
  customerName: z.string().trim().min(1).max(255),
  dueDate: z.string().date(),
  expectedReceiptDate: z.string().date(),
  currencyCode: z.string().trim().length(3),
  grossAmountMinor: z.string(),
  openAmountMinor: z.string(),
  receiptMethod: z.enum([
    "bank_transfer",
    "wire",
    "ach",
    "sepa",
    "cash",
    "manual",
  ]).nullable().optional(),
  sourceVersion: z.string().trim().min(1).max(128),
});

export type UpsertArExpectedReceiptProjectionCommand = z.infer<
  typeof upsertArExpectedReceiptProjectionCommandSchema
>;
```

---

## `liquidity-source-feed.entity.ts`

```ts
import { z } from "zod";

export const liquiditySourceFeedTypeSchema = z.enum([
  "ap_due_payment",
  "ar_expected_receipt",
  "manual_adjustment",
]);

export const liquiditySourceFeedDirectionSchema = z.enum([
  "inflow",
  "outflow",
]);

export const liquiditySourceFeedStatusSchema = z.enum([
  "open",
  "consumed",
  "cancelled",
]);

export const liquiditySourceFeedEntitySchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  sourceType: liquiditySourceFeedTypeSchema,
  sourceProjectionId: z.string().uuid(),
  sourceBusinessId: z.string().uuid(),
  sourceDocumentNumber: z.string().trim().max(128).nullable(),
  effectiveDate: z.string().date(),
  currencyCode: z.string().trim().length(3),
  amountMinor: z.string(),
  direction: liquiditySourceFeedDirectionSchema,
  status: liquiditySourceFeedStatusSchema,
  sourceVersion: z.string().trim().min(1).max(128),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type LiquiditySourceFeedEntity = z.infer<
  typeof liquiditySourceFeedEntitySchema
>;
```

---

## `liquidity-source-feed.commands.ts`

```ts
import { z } from "zod";
import { idempotencyKeySchema, orgScopedMetadataSchema } from "./shared";
import {
  liquiditySourceFeedDirectionSchema,
  liquiditySourceFeedTypeSchema,
} from "./liquidity-source-feed.entity";

export const upsertLiquiditySourceFeedCommandSchema = z.object({
  ...orgScopedMetadataSchema.shape,
  idempotencyKey: idempotencyKeySchema,
  sourceType: liquiditySourceFeedTypeSchema,
  sourceProjectionId: z.string().uuid(),
  sourceBusinessId: z.string().uuid(),
  sourceDocumentNumber: z.string().trim().max(128).nullable().optional(),
  effectiveDate: z.string().date(),
  currencyCode: z.string().trim().length(3),
  amountMinor: z.string(),
  direction: liquiditySourceFeedDirectionSchema,
  sourceVersion: z.string().trim().min(1).max(128),
});

export type UpsertLiquiditySourceFeedCommand = z.infer<
  typeof upsertLiquiditySourceFeedCommandSchema
>;
```

---

# 4. DB schema

## `ap-due-payment-projection.table.ts`

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

export const treasuryApDuePaymentProjectionTable = pgTable(
  "treasury_ap_due_payment_projection",
  {
    id: uuid("id").primaryKey(),
    orgId: uuid("org_id").notNull(),
    sourcePayableId: uuid("source_payable_id").notNull(),
    supplierId: uuid("supplier_id").notNull(),
    supplierName: text("supplier_name").notNull(),
    paymentTermCode: text("payment_term_code"),
    dueDate: date("due_date").notNull(),
    expectedPaymentDate: date("expected_payment_date").notNull(),
    currencyCode: text("currency_code").notNull(),
    grossAmountMinor: text("gross_amount_minor").notNull(),
    openAmountMinor: text("open_amount_minor").notNull(),
    paymentMethod: text("payment_method"),
    status: text("status").notNull(),
    sourceVersion: text("source_version").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => ({
    orgIdx: index("treasury_ap_due_payment_projection__org_idx").on(table.orgId),
    orgDateIdx: index("treasury_ap_due_payment_projection__org_date_idx").on(
      table.orgId,
      table.expectedPaymentDate,
    ),
    orgSourceUq: uniqueIndex("treasury_ap_due_payment_projection__org_source_uq").on(
      table.orgId,
      table.sourcePayableId,
    ),
  }),
);
```

---

## `ar-expected-receipt-projection.table.ts`

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

export const treasuryArExpectedReceiptProjectionTable = pgTable(
  "treasury_ar_expected_receipt_projection",
  {
    id: uuid("id").primaryKey(),
    orgId: uuid("org_id").notNull(),
    sourceReceivableId: uuid("source_receivable_id").notNull(),
    customerId: uuid("customer_id").notNull(),
    customerName: text("customer_name").notNull(),
    dueDate: date("due_date").notNull(),
    expectedReceiptDate: date("expected_receipt_date").notNull(),
    currencyCode: text("currency_code").notNull(),
    grossAmountMinor: text("gross_amount_minor").notNull(),
    openAmountMinor: text("open_amount_minor").notNull(),
    receiptMethod: text("receipt_method"),
    status: text("status").notNull(),
    sourceVersion: text("source_version").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => ({
    orgIdx: index("treasury_ar_expected_receipt_projection__org_idx").on(table.orgId),
    orgDateIdx: index("treasury_ar_expected_receipt_projection__org_date_idx").on(
      table.orgId,
      table.expectedReceiptDate,
    ),
    orgSourceUq: uniqueIndex("treasury_ar_expected_receipt_projection__org_source_uq").on(
      table.orgId,
      table.sourceReceivableId,
    ),
  }),
);
```

---

## `liquidity-source-feed.table.ts`

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

export const treasuryLiquiditySourceFeedTable = pgTable(
  "treasury_liquidity_source_feed",
  {
    id: uuid("id").primaryKey(),
    orgId: uuid("org_id").notNull(),
    sourceType: text("source_type").notNull(),
    sourceProjectionId: uuid("source_projection_id").notNull(),
    sourceBusinessId: uuid("source_business_id").notNull(),
    sourceDocumentNumber: text("source_document_number"),
    effectiveDate: date("effective_date").notNull(),
    currencyCode: text("currency_code").notNull(),
    amountMinor: text("amount_minor").notNull(),
    direction: text("direction").notNull(),
    status: text("status").notNull(),
    sourceVersion: text("source_version").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => ({
    orgIdx: index("treasury_liquidity_source_feed__org_idx").on(table.orgId),
    orgDateIdx: index("treasury_liquidity_source_feed__org_date_idx").on(
      table.orgId,
      table.effectiveDate,
    ),
    orgSourceUq: uniqueIndex("treasury_liquidity_source_feed__org_source_uq").on(
      table.orgId,
      table.sourceType,
      table.sourceProjectionId,
    ),
  }),
);
```

---

# 5. Core calculator

## `calculators/liquidity-bucket-allocation.ts`

```ts
export function allocateFeedToDailyBuckets(params: {
  startDate: string;
  endDate: string;
  feeds: Array<{
    effectiveDate: string;
    direction: "inflow" | "outflow";
    amountMinor: string;
  }>;
}) {
  const map = new Map<
    string,
    { inflowMinor: bigint; outflowMinor: bigint }
  >();

  const start = new Date(`${params.startDate}T00:00:00.000Z`);
  const end = new Date(`${params.endDate}T00:00:00.000Z`);

  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    const key = d.toISOString().slice(0, 10);
    map.set(key, { inflowMinor: 0n, outflowMinor: 0n });
  }

  for (const feed of params.feeds) {
    const bucket = map.get(feed.effectiveDate);
    if (!bucket) continue;

    if (feed.direction === "inflow") {
      bucket.inflowMinor += BigInt(feed.amountMinor);
    } else {
      bucket.outflowMinor += BigInt(feed.amountMinor);
    }
  }

  return [...map.entries()].map(([date, value], index) => ({
    bucketIndex: index,
    bucketDate: date,
    expectedInflowsMinor: value.inflowMinor.toString(),
    expectedOutflowsMinor: value.outflowMinor.toString(),
  }));
}
```

---

# 6. Core services

## `ap-due-payment-projection.service.ts`

```ts
import { and, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { upsertApDuePaymentProjectionCommandSchema } from "@afenda/contracts/erp/finance/treasury/ap-due-payment-projection.commands";
import { treasuryApDuePaymentProjectionTable } from "@afenda/db/schema/erp/finance/treasury/ap-due-payment-projection.table";

type DbTx = any;
type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } };

async function emitOutboxEvent(_: DbTx, __: unknown) {}
async function withAudit<T>(_: DbTx, __: unknown, fn: () => Promise<T>) {
  return fn();
}

export class ApDuePaymentProjectionService {
  constructor(private readonly db: DbTx) {}

  async upsert(raw: unknown): Promise<ServiceResult<{ id: string }>> {
    const input = upsertApDuePaymentProjectionCommandSchema.parse(raw);

    const existing = await this.db.query.treasuryApDuePaymentProjectionTable.findFirst({
      where: and(
        eq(treasuryApDuePaymentProjectionTable.orgId, input.orgId),
        eq(treasuryApDuePaymentProjectionTable.sourcePayableId, input.sourcePayableId),
      ),
    });

    const now = new Date();

    if (existing) {
      await withAudit(this.db, {}, async () => {
        await this.db
          .update(treasuryApDuePaymentProjectionTable)
          .set({
            supplierId: input.supplierId,
            supplierName: input.supplierName,
            paymentTermCode: input.paymentTermCode ?? null,
            dueDate: input.dueDate,
            expectedPaymentDate: input.expectedPaymentDate,
            currencyCode: input.currencyCode,
            grossAmountMinor: input.grossAmountMinor,
            openAmountMinor: input.openAmountMinor,
            paymentMethod: input.paymentMethod ?? null,
            status: BigInt(input.openAmountMinor) === 0n ? "fully_paid" : "open",
            sourceVersion: input.sourceVersion,
            updatedAt: now,
          })
          .where(eq(treasuryApDuePaymentProjectionTable.id, existing.id));
      });

      return { ok: true, data: { id: existing.id } };
    }

    const id = randomUUID();

    await withAudit(this.db, {}, async () => {
      await this.db.insert(treasuryApDuePaymentProjectionTable).values({
        id,
        orgId: input.orgId,
        sourcePayableId: input.sourcePayableId,
        supplierId: input.supplierId,
        supplierName: input.supplierName,
        paymentTermCode: input.paymentTermCode ?? null,
        dueDate: input.dueDate,
        expectedPaymentDate: input.expectedPaymentDate,
        currencyCode: input.currencyCode,
        grossAmountMinor: input.grossAmountMinor,
        openAmountMinor: input.openAmountMinor,
        paymentMethod: input.paymentMethod ?? null,
        status: BigInt(input.openAmountMinor) === 0n ? "fully_paid" : "open",
        sourceVersion: input.sourceVersion,
        createdAt: now,
        updatedAt: now,
      });

      await emitOutboxEvent(this.db, {
        eventType: "treasury.ap-due-payment-projection.upserted",
        aggregateId: id,
      });
    });

    return { ok: true, data: { id } };
  }
}
```

---

## `ar-expected-receipt-projection.service.ts`

```ts
import { and, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { upsertArExpectedReceiptProjectionCommandSchema } from "@afenda/contracts/erp/finance/treasury/ar-expected-receipt-projection.commands";
import { treasuryArExpectedReceiptProjectionTable } from "@afenda/db/schema/erp/finance/treasury/ar-expected-receipt-projection.table";

type DbTx = any;
type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } };

async function emitOutboxEvent(_: DbTx, __: unknown) {}
async function withAudit<T>(_: DbTx, __: unknown, fn: () => Promise<T>) {
  return fn();
}

export class ArExpectedReceiptProjectionService {
  constructor(private readonly db: DbTx) {}

  async upsert(raw: unknown): Promise<ServiceResult<{ id: string }>> {
    const input = upsertArExpectedReceiptProjectionCommandSchema.parse(raw);

    const existing = await this.db.query.treasuryArExpectedReceiptProjectionTable.findFirst({
      where: and(
        eq(treasuryArExpectedReceiptProjectionTable.orgId, input.orgId),
        eq(treasuryArExpectedReceiptProjectionTable.sourceReceivableId, input.sourceReceivableId),
      ),
    });

    const now = new Date();

    if (existing) {
      await withAudit(this.db, {}, async () => {
        await this.db
          .update(treasuryArExpectedReceiptProjectionTable)
          .set({
            customerId: input.customerId,
            customerName: input.customerName,
            dueDate: input.dueDate,
            expectedReceiptDate: input.expectedReceiptDate,
            currencyCode: input.currencyCode,
            grossAmountMinor: input.grossAmountMinor,
            openAmountMinor: input.openAmountMinor,
            receiptMethod: input.receiptMethod ?? null,
            status: BigInt(input.openAmountMinor) === 0n ? "fully_received" : "open",
            sourceVersion: input.sourceVersion,
            updatedAt: now,
          })
          .where(eq(treasuryArExpectedReceiptProjectionTable.id, existing.id));
      });

      return { ok: true, data: { id: existing.id } };
    }

    const id = randomUUID();

    await withAudit(this.db, {}, async () => {
      await this.db.insert(treasuryArExpectedReceiptProjectionTable).values({
        id,
        orgId: input.orgId,
        sourceReceivableId: input.sourceReceivableId,
        customerId: input.customerId,
        customerName: input.customerName,
        dueDate: input.dueDate,
        expectedReceiptDate: input.expectedReceiptDate,
        currencyCode: input.currencyCode,
        grossAmountMinor: input.grossAmountMinor,
        openAmountMinor: input.openAmountMinor,
        receiptMethod: input.receiptMethod ?? null,
        status: BigInt(input.openAmountMinor) === 0n ? "fully_received" : "open",
        sourceVersion: input.sourceVersion,
        createdAt: now,
        updatedAt: now,
      });

      await emitOutboxEvent(this.db, {
        eventType: "treasury.ar-expected-receipt-projection.upserted",
        aggregateId: id,
      });
    });

    return { ok: true, data: { id } };
  }
}
```

---

## `liquidity-source-feed.service.ts`

```ts
import { and, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { upsertLiquiditySourceFeedCommandSchema } from "@afenda/contracts/erp/finance/treasury/liquidity-source-feed.commands";
import { treasuryLiquiditySourceFeedTable } from "@afenda/db/schema/erp/finance/treasury/liquidity-source-feed.table";

type DbTx = any;
type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } };

async function emitOutboxEvent(_: DbTx, __: unknown) {}
async function withAudit<T>(_: DbTx, __: unknown, fn: () => Promise<T>) {
  return fn();
}

export class LiquiditySourceFeedService {
  constructor(private readonly db: DbTx) {}

  async upsert(raw: unknown): Promise<ServiceResult<{ id: string }>> {
    const input = upsertLiquiditySourceFeedCommandSchema.parse(raw);

    const existing = await this.db.query.treasuryLiquiditySourceFeedTable.findFirst({
      where: and(
        eq(treasuryLiquiditySourceFeedTable.orgId, input.orgId),
        eq(treasuryLiquiditySourceFeedTable.sourceType, input.sourceType),
        eq(treasuryLiquiditySourceFeedTable.sourceProjectionId, input.sourceProjectionId),
      ),
    });

    const now = new Date();

    if (existing) {
      await withAudit(this.db, {}, async () => {
        await this.db
          .update(treasuryLiquiditySourceFeedTable)
          .set({
            sourceBusinessId: input.sourceBusinessId,
            sourceDocumentNumber: input.sourceDocumentNumber ?? null,
            effectiveDate: input.effectiveDate,
            currencyCode: input.currencyCode,
            amountMinor: input.amountMinor,
            direction: input.direction,
            status: "open",
            sourceVersion: input.sourceVersion,
            updatedAt: now,
          })
          .where(eq(treasuryLiquiditySourceFeedTable.id, existing.id));
      });

      return { ok: true, data: { id: existing.id } };
    }

    const id = randomUUID();

    await withAudit(this.db, {}, async () => {
      await this.db.insert(treasuryLiquiditySourceFeedTable).values({
        id,
        orgId: input.orgId,
        sourceType: input.sourceType,
        sourceProjectionId: input.sourceProjectionId,
        sourceBusinessId: input.sourceBusinessId,
        sourceDocumentNumber: input.sourceDocumentNumber ?? null,
        effectiveDate: input.effectiveDate,
        currencyCode: input.currencyCode,
        amountMinor: input.amountMinor,
        direction: input.direction,
        status: "open",
        sourceVersion: input.sourceVersion,
        createdAt: now,
        updatedAt: now,
      });

      await emitOutboxEvent(this.db, {
        eventType: "treasury.liquidity-source-feed.upserted",
        aggregateId: id,
      });
    });

    return { ok: true, data: { id } };
  }
}
```

---

# 7. Queries

## `ap-due-payment-projection.queries.ts`

```ts
import { desc, eq } from "drizzle-orm";
import { treasuryApDuePaymentProjectionTable } from "@afenda/db/schema/erp/finance/treasury/ap-due-payment-projection.table";

type DbTx = any;

export class ApDuePaymentProjectionQueries {
  constructor(private readonly db: DbTx) {}

  async listByOrg(orgId: string) {
    return this.db
      .select()
      .from(treasuryApDuePaymentProjectionTable)
      .where(eq(treasuryApDuePaymentProjectionTable.orgId, orgId))
      .orderBy(desc(treasuryApDuePaymentProjectionTable.expectedPaymentDate));
  }
}
```

## `ar-expected-receipt-projection.queries.ts`

```ts
import { desc, eq } from "drizzle-orm";
import { treasuryArExpectedReceiptProjectionTable } from "@afenda/db/schema/erp/finance/treasury/ar-expected-receipt-projection.table";

type DbTx = any;

export class ArExpectedReceiptProjectionQueries {
  constructor(private readonly db: DbTx) {}

  async listByOrg(orgId: string) {
    return this.db
      .select()
      .from(treasuryArExpectedReceiptProjectionTable)
      .where(eq(treasuryArExpectedReceiptProjectionTable.orgId, orgId))
      .orderBy(desc(treasuryArExpectedReceiptProjectionTable.expectedReceiptDate));
  }
}
```

## `liquidity-source-feed.queries.ts`

```ts
import { and, desc, eq, gte, lte } from "drizzle-orm";
import { treasuryLiquiditySourceFeedTable } from "@afenda/db/schema/erp/finance/treasury/liquidity-source-feed.table";

type DbTx = any;

export class LiquiditySourceFeedQueries {
  constructor(private readonly db: DbTx) {}

  async listByOrg(orgId: string) {
    return this.db
      .select()
      .from(treasuryLiquiditySourceFeedTable)
      .where(eq(treasuryLiquiditySourceFeedTable.orgId, orgId))
      .orderBy(desc(treasuryLiquiditySourceFeedTable.effectiveDate));
  }

  async listInRange(orgId: string, startDate: string, endDate: string) {
    return this.db
      .select()
      .from(treasuryLiquiditySourceFeedTable)
      .where(
        and(
          eq(treasuryLiquiditySourceFeedTable.orgId, orgId),
          gte(treasuryLiquiditySourceFeedTable.effectiveDate, startDate),
          lte(treasuryLiquiditySourceFeedTable.effectiveDate, endDate),
          eq(treasuryLiquiditySourceFeedTable.status, "open"),
        ),
      )
      .orderBy(desc(treasuryLiquiditySourceFeedTable.effectiveDate));
  }
}
```

---

# 8. API route extensions

Add into `apps/api/src/routes/erp/finance/treasury.ts`:

```ts
import { upsertApDuePaymentProjectionCommandSchema } from "@afenda/contracts/erp/finance/treasury/ap-due-payment-projection.commands";
import { upsertArExpectedReceiptProjectionCommandSchema } from "@afenda/contracts/erp/finance/treasury/ar-expected-receipt-projection.commands";
import { upsertLiquiditySourceFeedCommandSchema } from "@afenda/contracts/erp/finance/treasury/liquidity-source-feed.commands";
import {
  ApDuePaymentProjectionQueries,
  ApDuePaymentProjectionService,
  ArExpectedReceiptProjectionQueries,
  ArExpectedReceiptProjectionService,
  LiquiditySourceFeedQueries,
  LiquiditySourceFeedService,
} from "@afenda/core/erp/finance/treasury";
```

```ts
  app.post("/v1/commands/erp/finance/treasury/ap-due-payment-projections/upsert", async (req, reply) => {
    const input = upsertApDuePaymentProjectionCommandSchema.parse(req.body);
    const service = new ApDuePaymentProjectionService(app.db);
    const result = await service.upsert(input);
    if (!result.ok) return reply.code(400).send(result.error);
    return reply.code(201).send(result.data);
  });

  app.get("/v1/erp/finance/treasury/ap-due-payment-projections", async (req: any) => {
    const queries = new ApDuePaymentProjectionQueries(app.db);
    return queries.listByOrg(req.user.orgId);
  });

  app.post("/v1/commands/erp/finance/treasury/ar-expected-receipt-projections/upsert", async (req, reply) => {
    const input = upsertArExpectedReceiptProjectionCommandSchema.parse(req.body);
    const service = new ArExpectedReceiptProjectionService(app.db);
    const result = await service.upsert(input);
    if (!result.ok) return reply.code(400).send(result.error);
    return reply.code(201).send(result.data);
  });

  app.get("/v1/erp/finance/treasury/ar-expected-receipt-projections", async (req: any) => {
    const queries = new ArExpectedReceiptProjectionQueries(app.db);
    return queries.listByOrg(req.user.orgId);
  });

  app.post("/v1/commands/erp/finance/treasury/liquidity-source-feeds/upsert", async (req, reply) => {
    const input = upsertLiquiditySourceFeedCommandSchema.parse(req.body);
    const service = new LiquiditySourceFeedService(app.db);
    const result = await service.upsert(input);
    if (!result.ok) return reply.code(400).send(result.error);
    return reply.code(201).send(result.data);
  });

  app.get("/v1/erp/finance/treasury/liquidity-source-feeds", async (req: any) => {
    const queries = new LiquiditySourceFeedQueries(app.db);
    return queries.listByOrg(req.user.orgId);
  });
```

---

# 9. Worker jobs

## `handle-ap-due-payment-projection-refreshed.ts`

```ts
type JobContext = {
  logger: {
    info: (payload: Record<string, unknown>, msg?: string) => void;
  };
};

export async function handleApDuePaymentProjectionRefreshed(
  ctx: JobContext,
  event: {
    orgId: string;
    projectionId: string;
    correlationId: string;
  },
) {
  ctx.logger.info(
    {
      orgId: event.orgId,
      projectionId: event.projectionId,
      correlationId: event.correlationId,
    },
    "Handling treasury AP due payment projection refresh",
  );

  return { ok: true };
}
```

## `handle-ar-expected-receipt-projection-refreshed.ts`

```ts
type JobContext = {
  logger: {
    info: (payload: Record<string, unknown>, msg?: string) => void;
  };
};

export async function handleArExpectedReceiptProjectionRefreshed(
  ctx: JobContext,
  event: {
    orgId: string;
    projectionId: string;
    correlationId: string;
  },
) {
  ctx.logger.info(
    {
      orgId: event.orgId,
      projectionId: event.projectionId,
      correlationId: event.correlationId,
    },
    "Handling treasury AR expected receipt projection refresh",
  );

  return { ok: true };
}
```

## `handle-liquidity-source-feed-refreshed.ts`

```ts
type JobContext = {
  logger: {
    info: (payload: Record<string, unknown>, msg?: string) => void;
  };
};

export async function handleLiquiditySourceFeedRefreshed(
  ctx: JobContext,
  event: {
    orgId: string;
    liquiditySourceFeedId: string;
    correlationId: string;
  },
) {
  ctx.logger.info(
    {
      orgId: event.orgId,
      liquiditySourceFeedId: event.liquiditySourceFeedId,
      correlationId: event.correlationId,
    },
    "Handling treasury liquidity source feed refresh",
  );

  return { ok: true };
}
```

---

# 10. Web page

## `apps/web/src/app/(erp)/finance/treasury/liquidity-bridge/page.tsx`

```tsx
import { Card, CardContent, CardHeader, CardTitle } from "@afenda/ui";

const API_BASE_URL = process.env.API_BASE_URL!;

async function getApProjections() {
  const res = await fetch(`${API_BASE_URL}/v1/erp/finance/treasury/ap-due-payment-projections`, {
    cache: "no-store",
  });
  if (!res.ok) return [];
  return res.json();
}

async function getArProjections() {
  const res = await fetch(`${API_BASE_URL}/v1/erp/finance/treasury/ar-expected-receipt-projections`, {
    cache: "no-store",
  });
  if (!res.ok) return [];
  return res.json();
}

async function getFeeds() {
  const res = await fetch(`${API_BASE_URL}/v1/erp/finance/treasury/liquidity-source-feeds`, {
    cache: "no-store",
  });
  if (!res.ok) return [];
  return res.json();
}

export default async function TreasuryLiquidityBridgePage() {
  const [apRows, arRows, feeds] = await Promise.all([
    getApProjections(),
    getArProjections(),
    getFeeds(),
  ]);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Treasury Liquidity Bridge</h1>
        <p className="text-sm text-muted-foreground">
          AP due payments and AR expected receipts normalized into treasury liquidity feeds.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>AP Due Payment Projections</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {apRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No AP projections.</p>
          ) : (
            apRows.map((row: any) => (
              <div key={row.id} className="rounded-xl border p-3 text-sm">
                {row.supplierName} · {row.openAmountMinor} {row.currencyCode} · {row.expectedPaymentDate}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>AR Expected Receipt Projections</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {arRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No AR projections.</p>
          ) : (
            arRows.map((row: any) => (
              <div key={row.id} className="rounded-xl border p-3 text-sm">
                {row.customerName} · {row.openAmountMinor} {row.currencyCode} · {row.expectedReceiptDate}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Treasury Liquidity Source Feed</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {feeds.length === 0 ? (
            <p className="text-sm text-muted-foreground">No liquidity feeds.</p>
          ) : (
            feeds.map((row: any) => (
              <div key={row.id} className="rounded-xl border p-3 text-sm">
                {row.sourceType} · {row.direction} · {row.amountMinor} {row.currencyCode} · {row.effectiveDate}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

---

# 11. How this plugs into Wave 3

After this scaffold, you should update:

## `CashPositionSnapshotService`

Read from:

* bank statements
* treasury payment instructions
* `treasury_liquidity_source_feed`

Mapping:

* AP due payment → `pending_outflow`
* AR expected receipt → `pending_inflow`

## `LiquidityForecastService`

Replace flat dummy assumptions as the base engine.

New base logic:

* bucket by `effectiveDate`
* aggregate inflows/outflows from `treasury_liquidity_source_feed`
* then optionally apply scenario overlays

That is the correct enterprise shape.

---

# 12. Cross-cutting registry additions

## Permissions

```ts
"erp.finance.treasury.ap-due-payment-projection.read"
"erp.finance.treasury.ap-due-payment-projection.manage"
"erp.finance.treasury.ar-expected-receipt-projection.read"
"erp.finance.treasury.ar-expected-receipt-projection.manage"
"erp.finance.treasury.liquidity-source-feed.read"
"erp.finance.treasury.liquidity-source-feed.manage"
```

## Audit actions

```ts
"treasury.ap-due-payment-projection.upsert"
"treasury.ar-expected-receipt-projection.upsert"
"treasury.liquidity-source-feed.upsert"
```

## Error codes

```ts
TREASURY_AP_DUE_PAYMENT_PROJECTION_NOT_FOUND
TREASURY_AR_EXPECTED_RECEIPT_PROJECTION_NOT_FOUND
TREASURY_LIQUIDITY_SOURCE_FEED_NOT_FOUND
```

## Outbox events

```ts
treasury.ap-due-payment-projection.upserted
treasury.ar-expected-receipt-projection.upserted
treasury.liquidity-source-feed.upserted
```

---

# 13. What comes after this scaffold

After this, the sequence should be:

* **Wave 3.5 bridge hardening complete**
* **Wave 3 FX normalization seam**
* **Wave 3 forecast variance/backtesting**
* **Wave 4.1 in-house banking**
* **Wave 4.2 netting and internal interest**

That is the cleanest path.

The most valuable immediate next deliverable after this one is the **FX normalization seam**, because once AP/AR feeds start flowing into Treasury, cross-currency rollups become unavoidable.

If you want, I’ll scaffold the **FX normalization seam drop-in pack** next.

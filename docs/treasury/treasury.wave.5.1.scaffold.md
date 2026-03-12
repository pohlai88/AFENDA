Excellent. The next scaffold is **Wave 5.1 — FX Exposure and Hedge Baseline**.

## Status (Updated 2026-03-13)

- Wave: 5.1
- Delivery status: Completed
- Closure status: Closed
- Implementation status: Implemented across contracts, db schema, core, api, worker, and web
- Notes: FX exposure, hedge designation, and revaluation event pipeline are available end-to-end

Your treasury scaffold defines Wave 5 as **Risk, FX, and treasury accounting integration**, and Sprint 5.1 specifically as:

- exposure capture entities
- hedge designation commands
- revaluation event pipeline

with exit criteria:

- exposure calculations reproducible from source transactions
- hedge lifecycle controls enforce legal states

This is the right next step after Wave 4.2 because you now already have:

- external cash truth
- payment control
- liquidity truth
- in-house banking
- intercompany transfer
- netting and internal interest

So Wave 5.1 becomes the first real **risk and valuation control plane**.

---

# 1. Design boundary

Wave 5.1 should stay narrow and disciplined.

## It should include

- FX exposure capture
- hedge designation lifecycle
- revaluation event generation
- audit-grade linkage from source transaction → exposure → hedge → revaluation event

## It should not yet include

- full derivative valuation engine
- full hedge accounting postings
- full market risk engine
- GL posting logic

That is correct because your scaffold places the accounting bridge in **Wave 5.2**, not here.

---

# 2. Target file set

## Create

- `packages/contracts/src/erp/finance/treasury/fx-exposure.entity.ts`

- `packages/contracts/src/erp/finance/treasury/fx-exposure.commands.ts`

- `packages/contracts/src/erp/finance/treasury/hedge-designation.entity.ts`

- `packages/contracts/src/erp/finance/treasury/hedge-designation.commands.ts`

- `packages/contracts/src/erp/finance/treasury/revaluation-event.entity.ts`

- `packages/db/src/schema/erp/finance/treasury/fx-exposure.table.ts`

- `packages/db/src/schema/erp/finance/treasury/hedge-designation.table.ts`

- `packages/db/src/schema/erp/finance/treasury/revaluation-event.table.ts`

- `packages/core/src/erp/finance/treasury/fx-exposure.service.ts`

- `packages/core/src/erp/finance/treasury/fx-exposure.queries.ts`

- `packages/core/src/erp/finance/treasury/hedge-designation.service.ts`

- `packages/core/src/erp/finance/treasury/hedge-designation.queries.ts`

- `packages/core/src/erp/finance/treasury/revaluation-event.service.ts`

- `packages/core/src/erp/finance/treasury/calculators/fx-exposure.ts`

- `packages/core/src/erp/finance/treasury/calculators/revaluation.ts`

- `packages/core/src/erp/finance/treasury/__vitest_test__/fx-exposure.service.test.ts`

- `packages/core/src/erp/finance/treasury/__vitest_test__/hedge-designation.service.test.ts`

- `apps/worker/src/jobs/erp/finance/treasury/handle-revaluation-requested.ts`

- `apps/web/src/app/(erp)/finance/treasury/fx-risk/page.tsx`

- `apps/web/src/app/(erp)/finance/treasury/components/fx-exposure-board.tsx`

## Update

- `packages/contracts/src/erp/finance/treasury/index.ts`
- `packages/db/src/schema/erp/finance/treasury/index.ts`
- `packages/core/src/erp/finance/treasury/calculators/index.ts`
- `packages/core/src/erp/finance/treasury/index.ts`
- `apps/api/src/routes/erp/finance/treasury.ts`
- `apps/worker/src/jobs/erp/finance/treasury/index.ts`
- `tools/gates/contract-db-sync.mjs`
- `packages/db/drizzle/<timestamp>_treasury_fx_exposure_hedge.sql`

---

# 3. Contracts

## `fx-exposure.entity.ts`

```ts
import { z } from "zod";

export const fxExposureStatusSchema = z.enum([
  "open",
  "partially_hedged",
  "fully_hedged",
  "closed",
  "cancelled",
]);

export const fxExposureSourceTypeSchema = z.enum([
  "ap_due_payment_projection",
  "ar_expected_receipt_projection",
  "intercompany_transfer",
  "manual_exposure",
]);

export const fxExposureDirectionSchema = z.enum([
  "buy",
  "sell",
]);

export const fxExposureEntitySchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  sourceType: fxExposureSourceTypeSchema,
  sourceId: z.string().uuid(),
  exposureNumber: z.string().trim().min(1).max(64),
  exposureDate: z.string().date(),
  valueDate: z.string().date(),
  baseCurrencyCode: z.string().trim().length(3),
  quoteCurrencyCode: z.string().trim().length(3),
  direction: fxExposureDirectionSchema,
  grossAmountMinor: z.string(),
  openAmountMinor: z.string(),
  hedgedAmountMinor: z.string(),
  status: fxExposureStatusSchema,
  sourceVersion: z.string().trim().min(1).max(128),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type FxExposureEntity = z.infer<typeof fxExposureEntitySchema>;
```

---

## `fx-exposure.commands.ts`

```ts
import { z } from "zod";
import { idempotencyKeySchema, orgScopedMetadataSchema } from "./shared";
import {
  fxExposureDirectionSchema,
  fxExposureSourceTypeSchema,
} from "./fx-exposure.entity";

export const createFxExposureCommandSchema = z.object({
  ...orgScopedMetadataSchema.shape,
  idempotencyKey: idempotencyKeySchema,
  sourceType: fxExposureSourceTypeSchema,
  sourceId: z.string().uuid(),
  exposureNumber: z.string().trim().min(1).max(64),
  exposureDate: z.string().date(),
  valueDate: z.string().date(),
  baseCurrencyCode: z.string().trim().length(3),
  quoteCurrencyCode: z.string().trim().length(3),
  direction: fxExposureDirectionSchema,
  grossAmountMinor: z.string(),
  sourceVersion: z.string().trim().min(1).max(128),
});

export const closeFxExposureCommandSchema = z.object({
  ...orgScopedMetadataSchema.shape,
  idempotencyKey: idempotencyKeySchema,
  fxExposureId: z.string().uuid(),
});

export type CreateFxExposureCommand = z.infer<
  typeof createFxExposureCommandSchema
>;
export type CloseFxExposureCommand = z.infer<
  typeof closeFxExposureCommandSchema
>;
```

---

## `hedge-designation.entity.ts`

```ts
import { z } from "zod";

export const hedgeDesignationStatusSchema = z.enum([
  "draft",
  "designated",
  "de-designated",
  "expired",
]);

export const hedgeInstrumentTypeSchema = z.enum([
  "fx_forward",
  "fx_swap",
  "natural_hedge",
  "manual_proxy",
]);

export const hedgeRelationshipTypeSchema = z.enum([
  "cash_flow_hedge",
  "fair_value_hedge",
  "economic_hedge",
]);

export const hedgeDesignationEntitySchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  hedgeNumber: z.string().trim().min(1).max(64),
  fxExposureId: z.string().uuid(),
  hedgeInstrumentType: hedgeInstrumentTypeSchema,
  hedgeRelationshipType: hedgeRelationshipTypeSchema,
  designatedAmountMinor: z.string(),
  startDate: z.string().date(),
  endDate: z.string().date().nullable(),
  status: hedgeDesignationStatusSchema,
  designationMemo: z.string().trim().max(1000).nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type HedgeDesignationEntity = z.infer<
  typeof hedgeDesignationEntitySchema
>;
```

---

## `hedge-designation.commands.ts`

```ts
import { z } from "zod";
import { idempotencyKeySchema, orgScopedMetadataSchema } from "./shared";
import {
  hedgeInstrumentTypeSchema,
  hedgeRelationshipTypeSchema,
} from "./hedge-designation.entity";

export const designateHedgeCommandSchema = z.object({
  ...orgScopedMetadataSchema.shape,
  idempotencyKey: idempotencyKeySchema,
  hedgeNumber: z.string().trim().min(1).max(64),
  fxExposureId: z.string().uuid(),
  hedgeInstrumentType: hedgeInstrumentTypeSchema,
  hedgeRelationshipType: hedgeRelationshipTypeSchema,
  designatedAmountMinor: z.string(),
  startDate: z.string().date(),
  endDate: z.string().date().nullable().optional(),
  designationMemo: z.string().trim().max(1000).nullable().optional(),
});

export const deDesignateHedgeCommandSchema = z.object({
  ...orgScopedMetadataSchema.shape,
  idempotencyKey: idempotencyKeySchema,
  hedgeDesignationId: z.string().uuid(),
});

export type DesignateHedgeCommand = z.infer<typeof designateHedgeCommandSchema>;
export type DeDesignateHedgeCommand = z.infer<typeof deDesignateHedgeCommandSchema>;
```

---

## `revaluation-event.entity.ts`

```ts
import { z } from "zod";

export const revaluationEventStatusSchema = z.enum([
  "pending",
  "calculated",
  "posted",
  "failed",
]);

export const revaluationEventEntitySchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  fxExposureId: z.string().uuid(),
  hedgeDesignationId: z.string().uuid().nullable(),
  valuationDate: z.string().date(),
  priorRateSnapshotId: z.string().uuid().nullable(),
  currentRateSnapshotId: z.string().uuid(),
  carryingAmountMinor: z.string(),
  revaluedAmountMinor: z.string(),
  revaluationDeltaMinor: z.string(),
  status: revaluationEventStatusSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type RevaluationEventEntity = z.infer<typeof revaluationEventEntitySchema>;
```

---

# 4. DB schema

## `fx-exposure.table.ts`

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

export const treasuryFxExposureTable = pgTable(
  "treasury_fx_exposure",
  {
    id: uuid("id").primaryKey(),
    orgId: uuid("org_id").notNull(),
    sourceType: text("source_type").notNull(),
    sourceId: uuid("source_id").notNull(),
    exposureNumber: text("exposure_number").notNull(),
    exposureDate: date("exposure_date").notNull(),
    valueDate: date("value_date").notNull(),
    baseCurrencyCode: text("base_currency_code").notNull(),
    quoteCurrencyCode: text("quote_currency_code").notNull(),
    direction: text("direction").notNull(),
    grossAmountMinor: text("gross_amount_minor").notNull(),
    openAmountMinor: text("open_amount_minor").notNull(),
    hedgedAmountMinor: text("hedged_amount_minor").notNull(),
    status: text("status").notNull(),
    sourceVersion: text("source_version").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => ({
    orgIdx: index("treasury_fx_exposure__org_idx").on(table.orgId),
    orgStatusIdx: index("treasury_fx_exposure__org_status_idx").on(
      table.orgId,
      table.status,
    ),
    orgExposureNumberUq: uniqueIndex(
      "treasury_fx_exposure__org_exposure_number_uq",
    ).on(table.orgId, table.exposureNumber),
  }),
);
```

---

## `hedge-designation.table.ts`

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

export const treasuryHedgeDesignationTable = pgTable(
  "treasury_hedge_designation",
  {
    id: uuid("id").primaryKey(),
    orgId: uuid("org_id").notNull(),
    hedgeNumber: text("hedge_number").notNull(),
    fxExposureId: uuid("fx_exposure_id").notNull(),
    hedgeInstrumentType: text("hedge_instrument_type").notNull(),
    hedgeRelationshipType: text("hedge_relationship_type").notNull(),
    designatedAmountMinor: text("designated_amount_minor").notNull(),
    startDate: date("start_date").notNull(),
    endDate: date("end_date"),
    status: text("status").notNull(),
    designationMemo: text("designation_memo"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => ({
    orgIdx: index("treasury_hedge_designation__org_idx").on(table.orgId),
    orgExposureIdx: index("treasury_hedge_designation__org_exposure_idx").on(
      table.orgId,
      table.fxExposureId,
    ),
    orgHedgeNumberUq: uniqueIndex(
      "treasury_hedge_designation__org_hedge_number_uq",
    ).on(table.orgId, table.hedgeNumber),
  }),
);
```

---

## `revaluation-event.table.ts`

```ts
import {
  index,
  pgTable,
  text,
  timestamp,
  uuid,
  date,
} from "drizzle-orm/pg-core";

export const treasuryRevaluationEventTable = pgTable(
  "treasury_revaluation_event",
  {
    id: uuid("id").primaryKey(),
    orgId: uuid("org_id").notNull(),
    fxExposureId: uuid("fx_exposure_id").notNull(),
    hedgeDesignationId: uuid("hedge_designation_id"),
    valuationDate: date("valuation_date").notNull(),
    priorRateSnapshotId: uuid("prior_rate_snapshot_id"),
    currentRateSnapshotId: uuid("current_rate_snapshot_id").notNull(),
    carryingAmountMinor: text("carrying_amount_minor").notNull(),
    revaluedAmountMinor: text("revalued_amount_minor").notNull(),
    revaluationDeltaMinor: text("revaluation_delta_minor").notNull(),
    status: text("status").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => ({
    orgIdx: index("treasury_revaluation_event__org_idx").on(table.orgId),
    orgExposureIdx: index("treasury_revaluation_event__org_exposure_idx").on(
      table.orgId,
      table.fxExposureId,
    ),
  }),
);
```

---

# 5. Core calculators

## `calculators/fx-exposure.ts`

```ts
export function applyHedgeToExposure(params: {
  grossAmountMinor: string;
  existingHedgedAmountMinor: string;
  newDesignatedAmountMinor: string;
}) {
  const gross = BigInt(params.grossAmountMinor);
  const existing = BigInt(params.existingHedgedAmountMinor);
  const incoming = BigInt(params.newDesignatedAmountMinor);
  const hedged = existing + incoming;

  if (hedged > gross) {
    throw new Error("TREASURY_HEDGE_DESIGNATION_EXCEEDS_EXPOSURE");
  }

  const open = gross - hedged;

  return {
    hedgedAmountMinor: hedged.toString(),
    openAmountMinor: open.toString(),
    status:
      open === 0n ? "fully_hedged" : hedged > 0n ? "partially_hedged" : "open",
  };
}
```

## `calculators/revaluation.ts`

```ts
export function calculateRevaluationDelta(params: {
  carryingAmountMinor: string;
  revaluedAmountMinor: string;
}) {
  return (BigInt(params.revaluedAmountMinor) - BigInt(params.carryingAmountMinor)).toString();
}
```

---

# 6. Core services

## `fx-exposure.service.ts`

```ts
import { and, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import {
  closeFxExposureCommandSchema,
  createFxExposureCommandSchema,
} from "@afenda/contracts/erp/finance/treasury/fx-exposure.commands";
import { treasuryFxExposureTable } from "@afenda/db/schema/erp/finance/treasury/fx-exposure.table";

type DbTx = any;
type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } };

async function emitOutboxEvent(_: DbTx, __: unknown) {}
async function withAudit<T>(_: DbTx, __: unknown, fn: () => Promise<T>) {
  return fn();
}

export class FxExposureService {
  constructor(private readonly db: DbTx) {}

  async create(raw: unknown): Promise<ServiceResult<{ id: string }>> {
    const input = createFxExposureCommandSchema.parse(raw);

    const existing = await this.db.query.treasuryFxExposureTable.findFirst({
      where: and(
        eq(treasuryFxExposureTable.orgId, input.orgId),
        eq(treasuryFxExposureTable.exposureNumber, input.exposureNumber),
      ),
    });

    if (existing) {
      return {
        ok: false,
        error: {
          code: "TREASURY_FX_EXPOSURE_NUMBER_EXISTS",
          message: "FX exposure number already exists",
        },
      };
    }

    const id = randomUUID();
    const now = new Date();

    await withAudit(this.db, {}, async () => {
      await this.db.insert(treasuryFxExposureTable).values({
        id,
        orgId: input.orgId,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        exposureNumber: input.exposureNumber,
        exposureDate: input.exposureDate,
        valueDate: input.valueDate,
        baseCurrencyCode: input.baseCurrencyCode,
        quoteCurrencyCode: input.quoteCurrencyCode,
        direction: input.direction,
        grossAmountMinor: input.grossAmountMinor,
        openAmountMinor: input.grossAmountMinor,
        hedgedAmountMinor: "0",
        status: "open",
        sourceVersion: input.sourceVersion,
        createdAt: now,
        updatedAt: now,
      });

      await emitOutboxEvent(this.db, {
        eventType: "treasury.fx-exposure.created",
        aggregateId: id,
      });
    });

    return { ok: true, data: { id } };
  }

  async close(raw: unknown): Promise<ServiceResult<{ id: string }>> {
    const input = closeFxExposureCommandSchema.parse(raw);

    const row = await this.db.query.treasuryFxExposureTable.findFirst({
      where: and(
        eq(treasuryFxExposureTable.orgId, input.orgId),
        eq(treasuryFxExposureTable.id, input.fxExposureId),
      ),
    });

    if (!row) {
      return {
        ok: false,
        error: {
          code: "TREASURY_FX_EXPOSURE_NOT_FOUND",
          message: "FX exposure not found",
        },
      };
    }

    const now = new Date();

    await withAudit(this.db, {}, async () => {
      await this.db
        .update(treasuryFxExposureTable)
        .set({
          status: "closed",
          openAmountMinor: "0",
          updatedAt: now,
        })
        .where(eq(treasuryFxExposureTable.id, row.id));

      await emitOutboxEvent(this.db, {
        eventType: "treasury.fx-exposure.closed",
        aggregateId: row.id,
      });
    });

    return { ok: true, data: { id: row.id } };
  }
}
```

---

## `hedge-designation.service.ts`

```ts
import { and, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import {
  deDesignateHedgeCommandSchema,
  designateHedgeCommandSchema,
} from "@afenda/contracts/erp/finance/treasury/hedge-designation.commands";
import { treasuryFxExposureTable } from "@afenda/db/schema/erp/finance/treasury/fx-exposure.table";
import { treasuryHedgeDesignationTable } from "@afenda/db/schema/erp/finance/treasury/hedge-designation.table";
import { applyHedgeToExposure } from "./calculators/fx-exposure";

type DbTx = any;
type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } };

async function emitOutboxEvent(_: DbTx, __: unknown) {}
async function withAudit<T>(_: DbTx, __: unknown, fn: () => Promise<T>) {
  return fn();
}

export class HedgeDesignationService {
  constructor(private readonly db: DbTx) {}

  async designate(raw: unknown): Promise<ServiceResult<{ id: string }>> {
    const input = designateHedgeCommandSchema.parse(raw);

    const exposure = await this.db.query.treasuryFxExposureTable.findFirst({
      where: and(
        eq(treasuryFxExposureTable.orgId, input.orgId),
        eq(treasuryFxExposureTable.id, input.fxExposureId),
      ),
    });

    if (!exposure) {
      return {
        ok: false,
        error: {
          code: "TREASURY_FX_EXPOSURE_NOT_FOUND",
          message: "FX exposure not found",
        },
      };
    }

    if (exposure.status === "closed") {
      return {
        ok: false,
        error: {
          code: "TREASURY_HEDGE_DESIGNATION_ILLEGAL_STATE",
          message: "Cannot designate hedge on closed exposure",
        },
      };
    }

    const existing = await this.db.query.treasuryHedgeDesignationTable.findFirst({
      where: and(
        eq(treasuryHedgeDesignationTable.orgId, input.orgId),
        eq(treasuryHedgeDesignationTable.hedgeNumber, input.hedgeNumber),
      ),
    });

    if (existing) {
      return {
        ok: false,
        error: {
          code: "TREASURY_HEDGE_NUMBER_EXISTS",
          message: "Hedge number already exists",
        },
      };
    }

    let updatedExposure;
    try {
      updatedExposure = applyHedgeToExposure({
        grossAmountMinor: exposure.grossAmountMinor,
        existingHedgedAmountMinor: exposure.hedgedAmountMinor,
        newDesignatedAmountMinor: input.designatedAmountMinor,
      });
    } catch (error: any) {
      return {
        ok: false,
        error: { code: error.message, message: "Invalid hedge designation amount" },
      };
    }

    const id = randomUUID();
    const now = new Date();

    await withAudit(this.db, {}, async () => {
      await this.db.insert(treasuryHedgeDesignationTable).values({
        id,
        orgId: input.orgId,
        hedgeNumber: input.hedgeNumber,
        fxExposureId: input.fxExposureId,
        hedgeInstrumentType: input.hedgeInstrumentType,
        hedgeRelationshipType: input.hedgeRelationshipType,
        designatedAmountMinor: input.designatedAmountMinor,
        startDate: input.startDate,
        endDate: input.endDate ?? null,
        status: "designated",
        designationMemo: input.designationMemo ?? null,
        createdAt: now,
        updatedAt: now,
      });

      await this.db
        .update(treasuryFxExposureTable)
        .set({
          hedgedAmountMinor: updatedExposure.hedgedAmountMinor,
          openAmountMinor: updatedExposure.openAmountMinor,
          status: updatedExposure.status,
          updatedAt: now,
        })
        .where(eq(treasuryFxExposureTable.id, exposure.id));

      await emitOutboxEvent(this.db, {
        eventType: "treasury.hedge-designation.designated",
        aggregateId: id,
      });
    });

    return { ok: true, data: { id } };
  }

  async deDesignate(raw: unknown): Promise<ServiceResult<{ id: string }>> {
    const input = deDesignateHedgeCommandSchema.parse(raw);

    const row = await this.db.query.treasuryHedgeDesignationTable.findFirst({
      where: and(
        eq(treasuryHedgeDesignationTable.orgId, input.orgId),
        eq(treasuryHedgeDesignationTable.id, input.hedgeDesignationId),
      ),
    });

    if (!row) {
      return {
        ok: false,
        error: {
          code: "TREASURY_HEDGE_DESIGNATION_NOT_FOUND",
          message: "Hedge designation not found",
        },
      };
    }

    if (row.status !== "designated") {
      return {
        ok: false,
        error: {
          code: "TREASURY_HEDGE_DESIGNATION_ILLEGAL_STATE",
          message: "Only designated hedge can be de-designated",
        },
      };
    }

    const now = new Date();

    await withAudit(this.db, {}, async () => {
      await this.db
        .update(treasuryHedgeDesignationTable)
        .set({
          status: "de-designated",
          updatedAt: now,
        })
        .where(eq(treasuryHedgeDesignationTable.id, row.id));

      await emitOutboxEvent(this.db, {
        eventType: "treasury.hedge-designation.de-designated",
        aggregateId: row.id,
      });
    });

    return { ok: true, data: { id: row.id } };
  }
}
```

---

## `revaluation-event.service.ts`

```ts
import { and, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { treasuryFxExposureTable } from "@afenda/db/schema/erp/finance/treasury/fx-exposure.table";
import { treasuryHedgeDesignationTable } from "@afenda/db/schema/erp/finance/treasury/hedge-designation.table";
import { treasuryRevaluationEventTable } from "@afenda/db/schema/erp/finance/treasury/revaluation-event.table";
import { treasuryFxRateSnapshotTable } from "@afenda/db/schema/erp/finance/treasury/fx-rate-snapshot.table";
import { normalizeMinorByScaledRate } from "./calculators/fx-normalization";
import { calculateRevaluationDelta } from "./calculators/revaluation";

type DbTx = any;
type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } };

async function emitOutboxEvent(_: DbTx, __: unknown) {}
async function withAudit<T>(_: DbTx, __: unknown, fn: () => Promise<T>) {
  return fn();
}

export class RevaluationEventService {
  constructor(private readonly db: DbTx) {}

  async request(params: {
    orgId: string;
    actorUserId: string;
    correlationId: string;
    fxExposureId: string;
    hedgeDesignationId?: string | null;
    valuationDate: string;
    currentRateSnapshotId: string;
    priorRateSnapshotId?: string | null;
  }): Promise<ServiceResult<{ id: string }>> {
    const exposure = await this.db.query.treasuryFxExposureTable.findFirst({
      where: and(
        eq(treasuryFxExposureTable.orgId, params.orgId),
        eq(treasuryFxExposureTable.id, params.fxExposureId),
      ),
    });

    if (!exposure) {
      return {
        ok: false,
        error: {
          code: "TREASURY_FX_EXPOSURE_NOT_FOUND",
          message: "FX exposure not found",
        },
      };
    }

    const currentRate = await this.db.query.treasuryFxRateSnapshotTable.findFirst({
      where: and(
        eq(treasuryFxRateSnapshotTable.orgId, params.orgId),
        eq(treasuryFxRateSnapshotTable.id, params.currentRateSnapshotId),
      ),
    });

    if (!currentRate) {
      return {
        ok: false,
        error: {
          code: "TREASURY_FX_RATE_SNAPSHOT_NOT_FOUND",
          message: "Current FX rate snapshot not found",
        },
      };
    }

    if (params.hedgeDesignationId) {
      const hedge = await this.db.query.treasuryHedgeDesignationTable.findFirst({
        where: and(
          eq(treasuryHedgeDesignationTable.orgId, params.orgId),
          eq(treasuryHedgeDesignationTable.id, params.hedgeDesignationId),
        ),
      });

      if (!hedge) {
        return {
          ok: false,
          error: {
            code: "TREASURY_HEDGE_DESIGNATION_NOT_FOUND",
            message: "Hedge designation not found",
          },
        };
      }
    }

    const revaluedAmountMinor = normalizeMinorByScaledRate({
      amountMinor: exposure.grossAmountMinor,
      rateScaled: currentRate.rateScaled,
      scale: currentRate.scale,
    });

    const carryingAmountMinor = exposure.grossAmountMinor;
    const deltaMinor = calculateRevaluationDelta({
      carryingAmountMinor,
      revaluedAmountMinor,
    });

    const id = randomUUID();
    const now = new Date();

    await withAudit(this.db, {}, async () => {
      await this.db.insert(treasuryRevaluationEventTable).values({
        id,
        orgId: params.orgId,
        fxExposureId: exposure.id,
        hedgeDesignationId: params.hedgeDesignationId ?? null,
        valuationDate: params.valuationDate,
        priorRateSnapshotId: params.priorRateSnapshotId ?? null,
        currentRateSnapshotId: currentRate.id,
        carryingAmountMinor,
        revaluedAmountMinor,
        revaluationDeltaMinor: deltaMinor,
        status: "calculated",
        createdAt: now,
        updatedAt: now,
      });

      await emitOutboxEvent(this.db, {
        eventType: "treasury.revaluation-event.calculated",
        aggregateId: id,
      });
    });

    return { ok: true, data: { id } };
  }
}
```

---

# 7. Queries

## `fx-exposure.queries.ts`

```ts
import { desc, eq } from "drizzle-orm";
import { treasuryFxExposureTable } from "@afenda/db/schema/erp/finance/treasury/fx-exposure.table";

type DbTx = any;

export class FxExposureQueries {
  constructor(private readonly db: DbTx) {}

  async listByOrg(orgId: string) {
    return this.db
      .select()
      .from(treasuryFxExposureTable)
      .where(eq(treasuryFxExposureTable.orgId, orgId))
      .orderBy(desc(treasuryFxExposureTable.createdAt));
  }
}
```

## `hedge-designation.queries.ts`

```ts
import { desc, eq } from "drizzle-orm";
import { treasuryHedgeDesignationTable } from "@afenda/db/schema/erp/finance/treasury/hedge-designation.table";

type DbTx = any;

export class HedgeDesignationQueries {
  constructor(private readonly db: DbTx) {}

  async listByOrg(orgId: string) {
    return this.db
      .select()
      .from(treasuryHedgeDesignationTable)
      .where(eq(treasuryHedgeDesignationTable.orgId, orgId))
      .orderBy(desc(treasuryHedgeDesignationTable.createdAt));
  }
}
```

---

# 8. API route extensions

Add into `apps/api/src/routes/erp/finance/treasury.ts`:

```ts
import {
  closeFxExposureCommandSchema,
  createFxExposureCommandSchema,
} from "@afenda/contracts/erp/finance/treasury/fx-exposure.commands";
import {
  deDesignateHedgeCommandSchema,
  designateHedgeCommandSchema,
} from "@afenda/contracts/erp/finance/treasury/hedge-designation.commands";
import {
  FxExposureQueries,
  FxExposureService,
  HedgeDesignationQueries,
  HedgeDesignationService,
  RevaluationEventService,
} from "@afenda/core/erp/finance/treasury";
```

```ts
  app.post("/v1/commands/erp/finance/treasury/fx-exposures/create", async (req, reply) => {
    const input = createFxExposureCommandSchema.parse(req.body);
    const service = new FxExposureService(app.db);
    const result = await service.create(input);
    if (!result.ok) return reply.code(400).send(result.error);
    return reply.code(201).send(result.data);
  });

  app.post("/v1/commands/erp/finance/treasury/fx-exposures/close", async (req, reply) => {
    const input = closeFxExposureCommandSchema.parse(req.body);
    const service = new FxExposureService(app.db);
    const result = await service.close(input);
    if (!result.ok) return reply.code(400).send(result.error);
    return reply.send(result.data);
  });

  app.get("/v1/erp/finance/treasury/fx-exposures", async (req: any) => {
    const queries = new FxExposureQueries(app.db);
    return queries.listByOrg(req.user.orgId);
  });

  app.post("/v1/commands/erp/finance/treasury/hedge-designations/designate", async (req, reply) => {
    const input = designateHedgeCommandSchema.parse(req.body);
    const service = new HedgeDesignationService(app.db);
    const result = await service.designate(input);
    if (!result.ok) return reply.code(400).send(result.error);
    return reply.code(201).send(result.data);
  });

  app.post("/v1/commands/erp/finance/treasury/hedge-designations/de-designate", async (req, reply) => {
    const input = deDesignateHedgeCommandSchema.parse(req.body);
    const service = new HedgeDesignationService(app.db);
    const result = await service.deDesignate(input);
    if (!result.ok) return reply.code(400).send(result.error);
    return reply.send(result.data);
  });

  app.get("/v1/erp/finance/treasury/hedge-designations", async (req: any) => {
    const queries = new HedgeDesignationQueries(app.db);
    return queries.listByOrg(req.user.orgId);
  });
```

---

# 9. Worker

## `apps/worker/src/jobs/erp/finance/treasury/handle-revaluation-requested.ts`

```ts
type JobContext = {
  logger: {
    info: (payload: Record<string, unknown>, msg?: string) => void;
  };
};

export async function handleRevaluationRequested(
  ctx: JobContext,
  event: {
    orgId: string;
    fxExposureId: string;
    revaluationEventId?: string;
    correlationId: string;
  },
) {
  ctx.logger.info(
    {
      orgId: event.orgId,
      fxExposureId: event.fxExposureId,
      revaluationEventId: event.revaluationEventId,
      correlationId: event.correlationId,
    },
    "Handling treasury revaluation requested",
  );

  return { ok: true };
}
```

---

# 10. Web

## `apps/web/src/app/(erp)/finance/treasury/components/fx-exposure-board.tsx`

```tsx
import { Card, CardContent, CardHeader, CardTitle } from "@afenda/ui";

export function FxExposureBoard({
  exposures,
  hedges,
}: {
  exposures: any[];
  hedges: any[];
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>FX Exposures</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {exposures.length === 0 ? (
            <p className="text-sm text-muted-foreground">No FX exposures yet.</p>
          ) : (
            exposures.map((row) => (
              <div key={row.id} className="rounded-xl border p-4">
                <div className="font-medium">
                  {row.exposureNumber} · {row.status}
                </div>
                <div className="text-sm text-muted-foreground">
                  {row.baseCurrencyCode}/{row.quoteCurrencyCode} · {row.grossAmountMinor} · hedged {row.hedgedAmountMinor}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Hedge Designations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {hedges.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hedge designations yet.</p>
          ) : (
            hedges.map((row) => (
              <div key={row.id} className="rounded-xl border p-4">
                <div className="font-medium">
                  {row.hedgeNumber} · {row.status}
                </div>
                <div className="text-sm text-muted-foreground">
                  {row.hedgeInstrumentType} · {row.hedgeRelationshipType} · {row.designatedAmountMinor}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

## `apps/web/src/app/(erp)/finance/treasury/fx-risk/page.tsx`

```tsx
import { FxExposureBoard } from "../components/fx-exposure-board";

const API_BASE_URL = process.env.API_BASE_URL!;

async function getExposures() {
  const res = await fetch(`${API_BASE_URL}/v1/erp/finance/treasury/fx-exposures`, {
    cache: "no-store",
  });
  if (!res.ok) return [];
  return res.json();
}

async function getHedges() {
  const res = await fetch(`${API_BASE_URL}/v1/erp/finance/treasury/hedge-designations`, {
    cache: "no-store",
  });
  if (!res.ok) return [];
  return res.json();
}

export default async function FxRiskPage() {
  const [exposures, hedges] = await Promise.all([getExposures(), getHedges()]);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">FX Risk & Hedge Baseline</h1>
        <p className="text-sm text-muted-foreground">
          Capture FX exposures, designate hedges, and prepare revaluation events.
        </p>
      </div>

      <FxExposureBoard exposures={exposures} hedges={hedges} />
    </div>
  );
}
```

---

# 11. Tests

## `__vitest_test__/fx-exposure.service.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { FxExposureService } from "../fx-exposure.service";

describe("FxExposureService", () => {
  it("creates FX exposure with full open amount", async () => {
    const db = {
      query: {
        treasuryFxExposureTable: {
          findFirst: async () => null,
        },
      },
      insert: () => ({
        values: async () => undefined,
      }),
    };

    const service = new FxExposureService(db as any);

    const result = await service.create({
      orgId: "00000000-0000-0000-0000-000000000001",
      actorUserId: "00000000-0000-0000-0000-000000000002",
      correlationId: "corr-1",
      idempotencyKey: "idem-1",
      sourceType: "ap_due_payment_projection",
      sourceId: "00000000-0000-0000-0000-000000000010",
      exposureNumber: "FXE-0001",
      exposureDate: "2026-03-12",
      valueDate: "2026-03-31",
      baseCurrencyCode: "USD",
      quoteCurrencyCode: "MYR",
      direction: "buy",
      grossAmountMinor: "100000",
      sourceVersion: "wave5-v1",
    });

    expect(result.ok).toBe(true);
  });
});
```

## `__vitest_test__/hedge-designation.service.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { HedgeDesignationService } from "../hedge-designation.service";

describe("HedgeDesignationService", () => {
  it("blocks over-designation beyond exposure", async () => {
    const db = {
      query: {
        treasuryFxExposureTable: {
          findFirst: async () => ({
            id: "exp-1",
            status: "open",
            grossAmountMinor: "100",
            hedgedAmountMinor: "90",
          }),
        },
        treasuryHedgeDesignationTable: {
          findFirst: async () => null,
        },
      },
    };

    const service = new HedgeDesignationService(db as any);

    const result = await service.designate({
      orgId: "org-1",
      actorUserId: "user-1",
      correlationId: "corr-1",
      idempotencyKey: "idem-1",
      hedgeNumber: "HD-001",
      fxExposureId: "exp-1",
      hedgeInstrumentType: "fx_forward",
      hedgeRelationshipType: "economic_hedge",
      designatedAmountMinor: "20",
      startDate: "2026-03-12",
    });

    expect(result.ok).toBe(false);
  });
});
```

---

# 12. Migration starter

## `packages/db/drizzle/<timestamp>_treasury_fx_exposure_hedge.sql`

```sql
CREATE TABLE treasury_fx_exposure (
  id uuid PRIMARY KEY,
  org_id uuid NOT NULL,
  source_type text NOT NULL,
  source_id uuid NOT NULL,
  exposure_number text NOT NULL,
  exposure_date date NOT NULL,
  value_date date NOT NULL,
  base_currency_code text NOT NULL,
  quote_currency_code text NOT NULL,
  direction text NOT NULL,
  gross_amount_minor text NOT NULL,
  open_amount_minor text NOT NULL,
  hedged_amount_minor text NOT NULL,
  status text NOT NULL,
  source_version text NOT NULL,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);

CREATE UNIQUE INDEX treasury_fx_exposure__org_exposure_number_uq
  ON treasury_fx_exposure(org_id, exposure_number);

CREATE INDEX treasury_fx_exposure__org_idx
  ON treasury_fx_exposure(org_id);

CREATE INDEX treasury_fx_exposure__org_status_idx
  ON treasury_fx_exposure(org_id, status);

CREATE TABLE treasury_hedge_designation (
  id uuid PRIMARY KEY,
  org_id uuid NOT NULL,
  hedge_number text NOT NULL,
  fx_exposure_id uuid NOT NULL,
  hedge_instrument_type text NOT NULL,
  hedge_relationship_type text NOT NULL,
  designated_amount_minor text NOT NULL,
  start_date date NOT NULL,
  end_date date,
  status text NOT NULL,
  designation_memo text,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);

CREATE UNIQUE INDEX treasury_hedge_designation__org_hedge_number_uq
  ON treasury_hedge_designation(org_id, hedge_number);

CREATE INDEX treasury_hedge_designation__org_idx
  ON treasury_hedge_designation(org_id);

CREATE INDEX treasury_hedge_designation__org_exposure_idx
  ON treasury_hedge_designation(org_id, fx_exposure_id);

CREATE TABLE treasury_revaluation_event (
  id uuid PRIMARY KEY,
  org_id uuid NOT NULL,
  fx_exposure_id uuid NOT NULL,
  hedge_designation_id uuid,
  valuation_date date NOT NULL,
  prior_rate_snapshot_id uuid,
  current_rate_snapshot_id uuid NOT NULL,
  carrying_amount_minor text NOT NULL,
  revalued_amount_minor text NOT NULL,
  revaluation_delta_minor text NOT NULL,
  status text NOT NULL,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);

CREATE INDEX treasury_revaluation_event__org_idx
  ON treasury_revaluation_event(org_id);

CREATE INDEX treasury_revaluation_event__org_exposure_idx
  ON treasury_revaluation_event(org_id, fx_exposure_id);
```

---

# 13. Barrel updates

## `packages/contracts/src/erp/finance/treasury/index.ts`

```ts
export * from "./fx-exposure.entity";
export * from "./fx-exposure.commands";
export * from "./hedge-designation.entity";
export * from "./hedge-designation.commands";
export * from "./revaluation-event.entity";
```

## `packages/db/src/schema/erp/finance/treasury/index.ts`

```ts
export * from "./fx-exposure.table";
export * from "./hedge-designation.table";
export * from "./revaluation-event.table";
```

## `packages/core/src/erp/finance/treasury/calculators/index.ts`

```ts
export * from "./fx-exposure";
export * from "./revaluation";
```

## `packages/core/src/erp/finance/treasury/index.ts`

```ts
export * from "./fx-exposure.service";
export * from "./fx-exposure.queries";
export * from "./hedge-designation.service";
export * from "./hedge-designation.queries";
export * from "./revaluation-event.service";
```

---

# 14. Cross-cutting additions

## Permissions

```ts
"erp.finance.treasury.fx-exposure.read"
"erp.finance.treasury.fx-exposure.manage"
"erp.finance.treasury.hedge-designation.read"
"erp.finance.treasury.hedge-designation.manage"
"erp.finance.treasury.revaluation-event.read"
"erp.finance.treasury.revaluation-event.manage"
```

## Audit actions

```ts
"treasury.fx-exposure.create"
"treasury.fx-exposure.close"
"treasury.hedge-designation.designate"
"treasury.hedge-designation.de-designate"
"treasury.revaluation-event.calculate"
```

## Error codes

```ts
TREASURY_FX_EXPOSURE_NOT_FOUND
TREASURY_FX_EXPOSURE_NUMBER_EXISTS
TREASURY_HEDGE_NUMBER_EXISTS
TREASURY_HEDGE_DESIGNATION_NOT_FOUND
TREASURY_HEDGE_DESIGNATION_ILLEGAL_STATE
TREASURY_HEDGE_DESIGNATION_EXCEEDS_EXPOSURE
TREASURY_FX_RATE_SNAPSHOT_NOT_FOUND
```

## Outbox events

```ts
treasury.fx-exposure.created
treasury.fx-exposure.closed
treasury.hedge-designation.designated
treasury.hedge-designation.de-designated
treasury.revaluation-event.calculated
```

---

# 15. What this gives you

This Wave 5.1 scaffold matches your plan exactly:

- exposure capture entities
- hedge designation commands
- revaluation event pipeline

And it targets the stated exit criteria:

- exposure calculations reproducible from source transactions
- hedge lifecycle controls enforce legal states

---

# 16. What should come immediately after

After this, the next scaffold is **Wave 5.2 — Treasury Accounting Bridge**:

- posting bridge events from treasury operations to GL
- accounting policy mapping
- treasury ↔ GL reconciliation views

That is where your Wave 4 and Wave 5 operational truth starts becoming accounting truth.

If you want, I’ll continue with the **Wave 5.2 full drop-in scaffold** next.

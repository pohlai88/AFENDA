> Wave 3.1 Status (Updated: 2026-03-12)
>
> - Wave 1 implementation: COMPLETE
> - Wave 2 implementation: COMPLETE
> - Wave 3 implementation: COMPLETE
> - Liquidity source feed: COMPLETE in repo
> - Forecast variance/backtesting: COMPLETE in repo
> - FX rate snapshot seam: COMPLETE in repo and migrated locally
> - Snapshot FX integration: COMPLETE in repo
> - Forecast FX integration: COMPLETE in repo
> - FX snapshot read/write workflows: COMPLETE (core + API + web)
> - Dual native/base amount persistence: COMPLETE in repo and migrated locally
> - Validation: COMPLETE (treasury targeted tests + `@afenda/core`, `@afenda/api`, `@afenda/web` typecheck)
> - Wave 3.1 closure state: DONE (implementation complete; staging/production migration rollout pending)
> - Next action: START Wave 3.5 scaffold

## Verified Wave 3.1 Status

| Area | Status | Notes |
|------|--------|-------|
| Contracts | COMPLETE | `fx-rate-snapshot.entity.ts`, liquidity source feed, and forecast variance contracts are present and exported |
| DB schema | COMPLETE | `fx_rate_snapshot`, liquidity source feed, and forecast variance tables exist in schema |
| Local migration | COMPLETE | `0044_treasury_fx_rate_snapshot.sql` applied successfully to local Docker Postgres |
| Core FX service | COMPLETE | `normalizeToBase` resolves same-currency passthrough, FX lookup, and not-found errors |
| Cash snapshot flow | COMPLETE | Mixed-currency liquidity feeds now normalize into base currency totals instead of fail-fast rejection |
| Forecast flow | COMPLETE | Mixed-currency liquidity feeds now normalize into base currency bucket totals instead of fail-fast rejection |
| FX snapshot workflows | COMPLETE | Upsert/list service + API routes + web admin page (`/finance/treasury/fx-rates`) are implemented |
| Variance flow | COMPLETE | Forecast variance service, worker hooks, queries, and UI already existed before this pass |
| Test coverage | COMPLETE | Treasury targeted suite covers FX seam, snapshot integration, forecast integration, lineage, and hardening regressions |

## Remaining Wave 3.1 Backlog

1. Apply `0044_treasury_fx_rate_snapshot.sql` to staging and production when those environments are ready.
2. Apply `0045_treasury_dual_amount_persistence.sql` to staging and production when those environments are ready.

Good. Then the right next move is **Wave 3 hardening pack**, not Wave 4 yet.

Your scaffold says Wave 3 must deliver **cash position snapshots integrated with AP/AR flows** and **forecast outputs traceable to assumptions and input version**. 

So the hardening layer should add four things:

1. **AP due-payments feed adapter**
2. **AR expected-receipts feed adapter**
3. **FX normalization seam**
4. **Forecast variance / backtesting**

That is the layer that turns Wave 3 from “projection math” into **enterprise liquidity truth**.

---

# 1. Hardening file pack

## Contracts

* `packages/contracts/src/erp/finance/treasury/liquidity-source-feed.entity.ts`
* `packages/contracts/src/erp/finance/treasury/liquidity-source-feed.commands.ts`
* `packages/contracts/src/erp/finance/treasury/fx-rate-snapshot.entity.ts`
* `packages/contracts/src/erp/finance/treasury/forecast-variance.entity.ts`

## DB

* `packages/db/src/schema/erp/finance/treasury/liquidity-source-feed.table.ts`
* `packages/db/src/schema/erp/finance/treasury/fx-rate-snapshot.table.ts`
* `packages/db/src/schema/erp/finance/treasury/forecast-variance.table.ts`

## Core

* `packages/core/src/erp/finance/treasury/liquidity-source-feed.service.ts`
* `packages/core/src/erp/finance/treasury/liquidity-source-feed.queries.ts`
* `packages/core/src/erp/finance/treasury/fx-normalization.service.ts`
* `packages/core/src/erp/finance/treasury/forecast-variance.service.ts`
* `packages/core/src/erp/finance/treasury/calculators/fx-normalization.ts`
* `packages/core/src/erp/finance/treasury/calculators/forecast-variance.ts`

## Worker

* `apps/worker/src/jobs/erp/finance/treasury/handle-liquidity-source-feed-refresh.ts`
* `apps/worker/src/jobs/erp/finance/treasury/handle-forecast-variance-refresh.ts`

## Web

* `apps/web/src/app/(erp)/finance/treasury/liquidity-forecast/variance/page.tsx`

---

# 2. Architecture boundary

## Liquidity source feed

This is the bridge from operational domains into Treasury.

Sources:

* `ap_due_payment`
* `ar_expected_receipt`
* `treasury_manual_adjustment`

The feed is not the source of truth itself. It is a **normalized treasury projection feed** derived from source truth.

## FX normalization seam

Do not mix currencies directly in forecast totals.
Every snapshot and forecast should support:

* native currency amount
* base currency normalized amount
* fx rate snapshot reference

## Forecast variance

Forecast quality must be measurable:

* forecasted inflow vs actual inflow
* forecasted outflow vs actual outflow
* forecasted closing liquidity vs actual closing liquidity

That is how Treasury earns trust.

---

# 3. Contracts

## `liquidity-source-feed.entity.ts`

```ts
import { z } from "zod";

export const liquiditySourceFeedTypeSchema = z.enum([
  "ap_due_payment",
  "ar_expected_receipt",
  "manual_adjustment",
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
  sourceId: z.string().uuid(),
  sourceDocumentNumber: z.string().trim().max(128).nullable(),
  bankAccountId: z.string().uuid().nullable(),
  currencyCode: z.string().trim().length(3),
  amountMinor: z.string(),
  dueDate: z.string().date(),
  direction: z.enum(["inflow", "outflow"]),
  confidenceScore: z.number().min(0).max(1).nullable(),
  status: liquiditySourceFeedStatusSchema,
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
import { liquiditySourceFeedTypeSchema } from "./liquidity-source-feed.entity";

export const upsertLiquiditySourceFeedCommandSchema = z.object({
  ...orgScopedMetadataSchema.shape,
  idempotencyKey: idempotencyKeySchema,
  sourceType: liquiditySourceFeedTypeSchema,
  sourceId: z.string().uuid(),
  sourceDocumentNumber: z.string().trim().max(128).nullable().optional(),
  bankAccountId: z.string().uuid().nullable().optional(),
  currencyCode: z.string().trim().length(3),
  amountMinor: z.string(),
  dueDate: z.string().date(),
  direction: z.enum(["inflow", "outflow"]),
  confidenceScore: z.number().min(0).max(1).nullable().optional(),
});

export type UpsertLiquiditySourceFeedCommand = z.infer<
  typeof upsertLiquiditySourceFeedCommandSchema
>;
```

---

## `fx-rate-snapshot.entity.ts`

```ts
import { z } from "zod";

export const fxRateSnapshotEntitySchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  rateDate: z.string().date(),
  fromCurrencyCode: z.string().trim().length(3),
  toCurrencyCode: z.string().trim().length(3),
  rateScaled: z.string(),
  scale: z.number().int().positive(),
  providerCode: z.string().trim().min(1).max(64),
  sourceVersion: z.string().trim().min(1).max(128),
  createdAt: z.string().datetime(),
});

export type FxRateSnapshotEntity = z.infer<typeof fxRateSnapshotEntitySchema>;
```

---

## `forecast-variance.entity.ts`

```ts
import { z } from "zod";

export const forecastVarianceEntitySchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  liquidityForecastId: z.string().uuid(),
  bucketId: z.string().uuid(),
  actualInflowsMinor: z.string(),
  actualOutflowsMinor: z.string(),
  actualClosingBalanceMinor: z.string(),
  inflowVarianceMinor: z.string(),
  outflowVarianceMinor: z.string(),
  closingBalanceVarianceMinor: z.string(),
  measuredAt: z.string().datetime(),
  createdAt: z.string().datetime(),
});

export type ForecastVarianceEntity = z.infer<
  typeof forecastVarianceEntitySchema
>;
```

---

# 4. DB schema

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
  real,
} from "drizzle-orm/pg-core";

export const treasuryLiquiditySourceFeedTable = pgTable(
  "treasury_liquidity_source_feed",
  {
    id: uuid("id").primaryKey(),
    orgId: uuid("org_id").notNull(),
    sourceType: text("source_type").notNull(),
    sourceId: uuid("source_id").notNull(),
    sourceDocumentNumber: text("source_document_number"),
    bankAccountId: uuid("bank_account_id"),
    currencyCode: text("currency_code").notNull(),
    amountMinor: text("amount_minor").notNull(),
    dueDate: date("due_date").notNull(),
    direction: text("direction").notNull(),
    confidenceScore: real("confidence_score"),
    status: text("status").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => ({
    orgIdx: index("treasury_liquidity_source_feed__org_idx").on(table.orgId),
    orgDueDateIdx: index("treasury_liquidity_source_feed__org_due_date_idx").on(
      table.orgId,
      table.dueDate,
    ),
    orgSourceUq: uniqueIndex("treasury_liquidity_source_feed__org_source_uq").on(
      table.orgId,
      table.sourceType,
      table.sourceId,
    ),
  }),
);
```

---

## `fx-rate-snapshot.table.ts`

```ts
import {
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  date,
  integer,
} from "drizzle-orm/pg-core";

export const treasuryFxRateSnapshotTable = pgTable(
  "treasury_fx_rate_snapshot",
  {
    id: uuid("id").primaryKey(),
    orgId: uuid("org_id").notNull(),
    rateDate: date("rate_date").notNull(),
    fromCurrencyCode: text("from_currency_code").notNull(),
    toCurrencyCode: text("to_currency_code").notNull(),
    rateScaled: text("rate_scaled").notNull(),
    scale: integer("scale").notNull(),
    providerCode: text("provider_code").notNull(),
    sourceVersion: text("source_version").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (table) => ({
    orgIdx: index("treasury_fx_rate_snapshot__org_idx").on(table.orgId),
    orgPairDateUq: uniqueIndex("treasury_fx_rate_snapshot__org_pair_date_uq").on(
      table.orgId,
      table.rateDate,
      table.fromCurrencyCode,
      table.toCurrencyCode,
      table.sourceVersion,
    ),
  }),
);
```

---

## `forecast-variance.table.ts`

```ts
import {
  index,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const treasuryForecastVarianceTable = pgTable(
  "treasury_forecast_variance",
  {
    id: uuid("id").primaryKey(),
    orgId: uuid("org_id").notNull(),
    liquidityForecastId: uuid("liquidity_forecast_id").notNull(),
    bucketId: uuid("bucket_id").notNull(),
    actualInflowsMinor: text("actual_inflows_minor").notNull(),
    actualOutflowsMinor: text("actual_outflows_minor").notNull(),
    actualClosingBalanceMinor: text("actual_closing_balance_minor").notNull(),
    inflowVarianceMinor: text("inflow_variance_minor").notNull(),
    outflowVarianceMinor: text("outflow_variance_minor").notNull(),
    closingBalanceVarianceMinor: text("closing_balance_variance_minor").notNull(),
    measuredAt: timestamp("measured_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (table) => ({
    orgForecastIdx: index("treasury_forecast_variance__org_forecast_idx").on(
      table.orgId,
      table.liquidityForecastId,
    ),
  }),
);
```

---

# 5. Core calculators

## `calculators/fx-normalization.ts`

```ts
export function normalizeMinorByScaledRate(params: {
  amountMinor: string;
  rateScaled: string;
  scale: number;
}): string {
  const amount = BigInt(params.amountMinor);
  const rateScaled = BigInt(params.rateScaled);
  const divisor = BigInt(10 ** params.scale);

  return ((amount * rateScaled) / divisor).toString();
}
```

## `calculators/forecast-variance.ts`

```ts
export function varianceMinor(forecastMinor: string, actualMinor: string): string {
  return (BigInt(actualMinor) - BigInt(forecastMinor)).toString();
}
```

---

# 6. Core services

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
        eq(treasuryLiquiditySourceFeedTable.sourceId, input.sourceId),
      ),
    });

    const now = new Date();

    if (existing) {
      await withAudit(this.db, {}, async () => {
        await this.db
          .update(treasuryLiquiditySourceFeedTable)
          .set({
            sourceDocumentNumber: input.sourceDocumentNumber ?? null,
            bankAccountId: input.bankAccountId ?? null,
            currencyCode: input.currencyCode,
            amountMinor: input.amountMinor,
            dueDate: input.dueDate,
            direction: input.direction,
            confidenceScore: input.confidenceScore ?? null,
            status: "open",
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
        sourceId: input.sourceId,
        sourceDocumentNumber: input.sourceDocumentNumber ?? null,
        bankAccountId: input.bankAccountId ?? null,
        currencyCode: input.currencyCode,
        amountMinor: input.amountMinor,
        dueDate: input.dueDate,
        direction: input.direction,
        confidenceScore: input.confidenceScore ?? null,
        status: "open",
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

## `fx-normalization.service.ts`

```ts
import { and, eq } from "drizzle-orm";
import { treasuryFxRateSnapshotTable } from "@afenda/db/schema/erp/finance/treasury/fx-rate-snapshot.table";
import { normalizeMinorByScaledRate } from "./calculators/fx-normalization";

type DbTx = any;

export class FxNormalizationService {
  constructor(private readonly db: DbTx) {}

  async normalizeToBase(params: {
    orgId: string;
    rateDate: string;
    fromCurrencyCode: string;
    toCurrencyCode: string;
    amountMinor: string;
    sourceVersion: string;
  }) {
    if (params.fromCurrencyCode === params.toCurrencyCode) {
      return {
        normalizedMinor: params.amountMinor,
        fxRateSnapshotId: null,
      };
    }

    const rate = await this.db.query.treasuryFxRateSnapshotTable.findFirst({
      where: and(
        eq(treasuryFxRateSnapshotTable.orgId, params.orgId),
        eq(treasuryFxRateSnapshotTable.rateDate, params.rateDate),
        eq(treasuryFxRateSnapshotTable.fromCurrencyCode, params.fromCurrencyCode),
        eq(treasuryFxRateSnapshotTable.toCurrencyCode, params.toCurrencyCode),
        eq(treasuryFxRateSnapshotTable.sourceVersion, params.sourceVersion),
      ),
    });

    if (!rate) {
      throw new Error("FX rate snapshot not found");
    }

    return {
      normalizedMinor: normalizeMinorByScaledRate({
        amountMinor: params.amountMinor,
        rateScaled: rate.rateScaled,
        scale: rate.scale,
      }),
      fxRateSnapshotId: rate.id,
    };
  }
}
```

---

## `forecast-variance.service.ts`

```ts
import { and, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import {
  treasuryForecastVarianceTable,
} from "@afenda/db/schema/erp/finance/treasury/forecast-variance.table";
import {
  treasuryLiquidityForecastBucketTable,
} from "@afenda/db/schema/erp/finance/treasury/liquidity-forecast.table";
import { varianceMinor } from "./calculators/forecast-variance";

type DbTx = any;
type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } };

export class ForecastVarianceService {
  constructor(private readonly db: DbTx) {}

  async recordBucketVariance(params: {
    orgId: string;
    liquidityForecastId: string;
    bucketId: string;
    actualInflowsMinor: string;
    actualOutflowsMinor: string;
    actualClosingBalanceMinor: string;
  }): Promise<ServiceResult<{ id: string }>> {
    const bucket = await this.db.query.treasuryLiquidityForecastBucketTable.findFirst({
      where: and(
        eq(treasuryLiquidityForecastBucketTable.orgId, params.orgId),
        eq(treasuryLiquidityForecastBucketTable.id, params.bucketId),
      ),
    });

    if (!bucket) {
      return {
        ok: false,
        error: {
          code: "TREASURY_FORECAST_BUCKET_NOT_FOUND",
          message: "Forecast bucket not found",
        },
      };
    }

    const id = randomUUID();
    const now = new Date();

    await this.db.insert(treasuryForecastVarianceTable).values({
      id,
      orgId: params.orgId,
      liquidityForecastId: params.liquidityForecastId,
      bucketId: params.bucketId,
      actualInflowsMinor: params.actualInflowsMinor,
      actualOutflowsMinor: params.actualOutflowsMinor,
      actualClosingBalanceMinor: params.actualClosingBalanceMinor,
      inflowVarianceMinor: varianceMinor(
        bucket.expectedInflowsMinor,
        params.actualInflowsMinor,
      ),
      outflowVarianceMinor: varianceMinor(
        bucket.expectedOutflowsMinor,
        params.actualOutflowsMinor,
      ),
      closingBalanceVarianceMinor: varianceMinor(
        bucket.closingBalanceMinor,
        params.actualClosingBalanceMinor,
      ),
      measuredAt: now,
      createdAt: now,
    });

    return { ok: true, data: { id } };
  }
}
```

---

# 7. The key change to Wave 3 services

Your `CashPositionSnapshotService` and `LiquidityForecastService` should now read from `treasury_liquidity_source_feed`, because Wave 3 is explicitly supposed to integrate with AP/AR flows. 

## In snapshot

Add:

* AP due items as `pending_outflow`
* AR expected receipts as `pending_inflow`

## In forecast

Use:

* due-date bucket allocation from liquidity source feed
* not only flat scenario assumptions

That gives you two layers:

* **structural forecast** from actual AP/AR pipeline
* **scenario uplift/drag** from assumptions

That is much stronger than “assumedDailyInflowsMinor”.

---

# 8. Worker jobs

## `handle-liquidity-source-feed-refresh.ts`

```ts
type JobContext = {
  logger: {
    info: (payload: Record<string, unknown>, msg?: string) => void;
  };
};

export async function handleLiquiditySourceFeedRefresh(
  ctx: JobContext,
  event: {
    orgId: string;
    sourceType: "ap_due_payment" | "ar_expected_receipt";
    correlationId: string;
  },
) {
  ctx.logger.info(
    {
      orgId: event.orgId,
      sourceType: event.sourceType,
      correlationId: event.correlationId,
    },
    "Refreshing treasury liquidity source feed",
  );

  return { ok: true };
}
```

## `handle-forecast-variance-refresh.ts`

```ts
type JobContext = {
  logger: {
    info: (payload: Record<string, unknown>, msg?: string) => void;
  };
};

export async function handleForecastVarianceRefresh(
  ctx: JobContext,
  event: {
    orgId: string;
    liquidityForecastId: string;
    correlationId: string;
  },
) {
  ctx.logger.info(
    {
      orgId: event.orgId,
      liquidityForecastId: event.liquidityForecastId,
      correlationId: event.correlationId,
    },
    "Refreshing treasury forecast variance",
  );

  return { ok: true };
}
```

---

# 9. UI page

## `apps/web/src/app/(erp)/finance/treasury/liquidity-forecast/variance/page.tsx`

```tsx
import { Card, CardContent, CardHeader, CardTitle } from "@afenda/ui";

const API_BASE_URL = process.env.API_BASE_URL!;

async function getForecasts() {
  const res = await fetch(`${API_BASE_URL}/v1/erp/finance/treasury/liquidity-forecasts`, {
    cache: "no-store",
  });
  if (!res.ok) return [];
  return res.json();
}

export default async function LiquidityForecastVariancePage() {
  const forecasts = await getForecasts();

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Forecast Variance</h1>
        <p className="text-sm text-muted-foreground">
          Compare forecasted liquidity movement against actuals.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Forecast runs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {forecasts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No forecast runs yet.</p>
            ) : (
              forecasts.map((row: any) => (
                <div key={row.id} className="rounded-xl border p-4">
                  <div className="font-medium">
                    {row.forecastDate} · {row.baseCurrencyCode}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Opening {row.openingLiquidityMinor} · Closing {row.closingLiquidityMinor}
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

# 10. What to change in your existing Wave 3 logic now

## A. Replace flat assumptions as primary driver

Current scaffold uses:

* `assumedDailyInflowsMinor`
* `assumedDailyOutflowsMinor`

Keep that only as **overlay**, not the base engine.

Base engine should be:

* AP due feed by due date
* AR expected feed by expected receipt date
* treasury released/approved payment instructions
* manual treasury adjustments

## B. Add normalized amount columns

For snapshot lines and forecast buckets, add later:

* `nativeAmountMinor`
* `normalizedAmountMinor`
* `nativeCurrencyCode`
* `baseCurrencyCode`
* `fxRateSnapshotId`

## C. Keep source truth append-only

Do not update feed rows destructively.
Instead:

* `open`
* `consumed`
* `cancelled`

## D. Backtest every closed forecast bucket

Once actuals are available, write variance records.
Never overwrite forecast buckets.

---

# 11. Cross-cutting additions

## Permissions

```ts
"erp.finance.treasury.liquidity-source-feed.read"
"erp.finance.treasury.liquidity-source-feed.manage"
"erp.finance.treasury.fx-rate.read"
"erp.finance.treasury.forecast-variance.read"
```

## Audit actions

```ts
"treasury.liquidity-source-feed.upsert"
"treasury.fx-normalization.apply"
"treasury.forecast-variance.record"
```

## Error codes

```ts
TREASURY_LIQUIDITY_SOURCE_FEED_NOT_FOUND
TREASURY_FX_RATE_SNAPSHOT_NOT_FOUND
TREASURY_FORECAST_BUCKET_NOT_FOUND
```

## Outbox events

```ts
treasury.liquidity-source-feed.upserted
treasury.forecast-variance.recorded
```

---

# 12. My recommendation on sequencing

Do this in this order:

## Sprint 3.1A

* add `liquidity_source_feed`
* wire AP due payments into Treasury feed
* wire AR expected receipts into Treasury feed

## Sprint 3.1B

* update cash snapshot to consume bank + treasury + liquidity feed
* prove reproducibility

## Sprint 3.2A

* add FX normalization seam
* normalize all forecast totals to base currency

## Sprint 3.2B

* add forecast variance persistence
* build variance UI

That sequencing is very consistent with your scaffold’s Wave 3 intent and the standard sprint checklist you defined.  

---

# 13. The most important AFENDA point

For AFENDA, the win is not “we can forecast cash.”

The win is:

**we can prove exactly why the forecast said what it said, what changed, and how wrong or right it was later.**

That is the difference between:

* dashboard software

and

* **The Machine**

Next, the strongest follow-up is the **AP→Treasury liquidity feed bridge scaffold** with drop-in files for:

* `ap_due_payment_projection`
* `ar_expected_receipt_projection`
* treasury feed ingestion adapter
* forecast bucket allocator

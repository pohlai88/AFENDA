Perfect. That is the right order.

Before Wave 4, the next two scaffolds should be:

1. **Wave 3 FX normalization seam**
2. **Wave 3 forecast variance / backtesting**

That sequence is the cleanest because once AP/AR liquidity feeds enter Treasury, **base-currency truth** and **forecast quality measurement** become mandatory. Your Wave 3 outcome already implies this direction: reproducible cash position, forecast traceability, and integrated AP/AR flows. 

Below is the full drop-in scaffold for both.

---

# Wave 3A — FX Normalization Seam

## Purpose

Add a deterministic FX conversion layer so Treasury can:

* roll up multi-currency balances into base currency
* normalize AP/AR liquidity feeds into forecast currency
* preserve rate provenance
* reproduce outputs using the same rate snapshot version

This is not “trading FX” yet.
This is the **valuation seam** required for treasury truth.

---

# 1. Target file set

## Contracts

* `packages/contracts/src/erp/finance/treasury/fx-rate-snapshot.entity.ts`
* `packages/contracts/src/erp/finance/treasury/fx-rate-snapshot.commands.ts`
* `packages/contracts/src/erp/finance/treasury/normalized-money.value.ts`

## DB

* `packages/db/src/schema/erp/finance/treasury/fx-rate-snapshot.table.ts`

## Core

* `packages/core/src/erp/finance/treasury/fx-rate-snapshot.service.ts`
* `packages/core/src/erp/finance/treasury/fx-rate-snapshot.queries.ts`
* `packages/core/src/erp/finance/treasury/fx-normalization.service.ts`
* `packages/core/src/erp/finance/treasury/calculators/fx-normalization.ts`
* `packages/core/src/erp/finance/treasury/__vitest_test__/fx-normalization.service.test.ts`

## API

* extend `apps/api/src/routes/erp/finance/treasury.ts`

## Worker

* `apps/worker/src/jobs/erp/finance/treasury/handle-fx-rate-snapshot-refreshed.ts`

## Web

* `apps/web/src/app/(erp)/finance/treasury/fx-rates/page.tsx`

---

# 2. Contracts

## `fx-rate-snapshot.entity.ts`

```ts
import { z } from "zod";

export const fxRateMethodSchema = z.enum([
  "direct",
  "inverse",
  "triangulated",
]);

export const fxRateSnapshotEntitySchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  rateDate: z.string().date(),
  fromCurrencyCode: z.string().trim().length(3),
  toCurrencyCode: z.string().trim().length(3),
  rateScaled: z.string(),
  scale: z.number().int().positive(),
  method: fxRateMethodSchema,
  providerCode: z.string().trim().min(1).max(64),
  sourceVersion: z.string().trim().min(1).max(128),
  createdAt: z.string().datetime(),
});

export type FxRateSnapshotEntity = z.infer<typeof fxRateSnapshotEntitySchema>;
```

---

## `fx-rate-snapshot.commands.ts`

```ts
import { z } from "zod";
import { idempotencyKeySchema, orgScopedMetadataSchema } from "./shared";
import { fxRateMethodSchema } from "./fx-rate-snapshot.entity";

export const upsertFxRateSnapshotCommandSchema = z.object({
  ...orgScopedMetadataSchema.shape,
  idempotencyKey: idempotencyKeySchema,
  rateDate: z.string().date(),
  fromCurrencyCode: z.string().trim().length(3),
  toCurrencyCode: z.string().trim().length(3),
  rateScaled: z.string(),
  scale: z.number().int().positive(),
  method: fxRateMethodSchema,
  providerCode: z.string().trim().min(1).max(64),
  sourceVersion: z.string().trim().min(1).max(128),
});

export type UpsertFxRateSnapshotCommand = z.infer<
  typeof upsertFxRateSnapshotCommandSchema
>;
```

---

## `normalized-money.value.ts`

```ts
import { z } from "zod";

export const normalizedMoneyValueSchema = z.object({
  nativeAmountMinor: z.string(),
  nativeCurrencyCode: z.string().trim().length(3),
  normalizedAmountMinor: z.string(),
  baseCurrencyCode: z.string().trim().length(3),
  fxRateSnapshotId: z.string().uuid().nullable(),
});

export type NormalizedMoneyValue = z.infer<typeof normalizedMoneyValueSchema>;
```

---

# 3. DB schema

## `fx-rate-snapshot.table.ts`

```ts
import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  date,
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
    method: text("method").notNull(),
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

# 4. Core calculators

## `calculators/fx-normalization.ts`

```ts
export function normalizeMinorByScaledRate(params: {
  amountMinor: string;
  rateScaled: string;
  scale: number;
}): string {
  const amount = BigInt(params.amountMinor);
  const rateScaled = BigInt(params.rateScaled);
  const divisor = BigInt(10) ** BigInt(params.scale);

  return ((amount * rateScaled) / divisor).toString();
}

export function invertScaledRate(params: {
  rateScaled: string;
  scale: number;
}): string {
  const numerator = BigInt(10) ** BigInt(params.scale * 2);
  return (numerator / BigInt(params.rateScaled)).toString();
}
```

---

# 5. Core services

## `fx-rate-snapshot.service.ts`

```ts
import { and, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { upsertFxRateSnapshotCommandSchema } from "@afenda/contracts/erp/finance/treasury/fx-rate-snapshot.commands";
import { treasuryFxRateSnapshotTable } from "@afenda/db/schema/erp/finance/treasury/fx-rate-snapshot.table";

type DbTx = any;
type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } };

async function emitOutboxEvent(_: DbTx, __: unknown) {}
async function withAudit<T>(_: DbTx, __: unknown, fn: () => Promise<T>) {
  return fn();
}

export class FxRateSnapshotService {
  constructor(private readonly db: DbTx) {}

  async upsert(raw: unknown): Promise<ServiceResult<{ id: string }>> {
    const input = upsertFxRateSnapshotCommandSchema.parse(raw);

    const existing = await this.db.query.treasuryFxRateSnapshotTable.findFirst({
      where: and(
        eq(treasuryFxRateSnapshotTable.orgId, input.orgId),
        eq(treasuryFxRateSnapshotTable.rateDate, input.rateDate),
        eq(treasuryFxRateSnapshotTable.fromCurrencyCode, input.fromCurrencyCode),
        eq(treasuryFxRateSnapshotTable.toCurrencyCode, input.toCurrencyCode),
        eq(treasuryFxRateSnapshotTable.sourceVersion, input.sourceVersion),
      ),
    });

    if (existing) {
      return { ok: true, data: { id: existing.id } };
    }

    const id = randomUUID();
    const now = new Date();

    await withAudit(this.db, {}, async () => {
      await this.db.insert(treasuryFxRateSnapshotTable).values({
        id,
        orgId: input.orgId,
        rateDate: input.rateDate,
        fromCurrencyCode: input.fromCurrencyCode,
        toCurrencyCode: input.toCurrencyCode,
        rateScaled: input.rateScaled,
        scale: input.scale,
        method: input.method,
        providerCode: input.providerCode,
        sourceVersion: input.sourceVersion,
        createdAt: now,
      });

      await emitOutboxEvent(this.db, {
        eventType: "treasury.fx-rate-snapshot.upserted",
        aggregateId: id,
      });
    });

    return { ok: true, data: { id } };
  }
}
```

---

## `fx-rate-snapshot.queries.ts`

```ts
import { and, desc, eq } from "drizzle-orm";
import { treasuryFxRateSnapshotTable } from "@afenda/db/schema/erp/finance/treasury/fx-rate-snapshot.table";

type DbTx = any;

export class FxRateSnapshotQueries {
  constructor(private readonly db: DbTx) {}

  async listByOrg(orgId: string) {
    return this.db
      .select()
      .from(treasuryFxRateSnapshotTable)
      .where(eq(treasuryFxRateSnapshotTable.orgId, orgId))
      .orderBy(desc(treasuryFxRateSnapshotTable.rateDate));
  }

  async getRate(params: {
    orgId: string;
    rateDate: string;
    fromCurrencyCode: string;
    toCurrencyCode: string;
    sourceVersion: string;
  }) {
    const rows = await this.db
      .select()
      .from(treasuryFxRateSnapshotTable)
      .where(
        and(
          eq(treasuryFxRateSnapshotTable.orgId, params.orgId),
          eq(treasuryFxRateSnapshotTable.rateDate, params.rateDate),
          eq(treasuryFxRateSnapshotTable.fromCurrencyCode, params.fromCurrencyCode),
          eq(treasuryFxRateSnapshotTable.toCurrencyCode, params.toCurrencyCode),
          eq(treasuryFxRateSnapshotTable.sourceVersion, params.sourceVersion),
        ),
      )
      .limit(1);

    return rows[0] ?? null;
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
        nativeAmountMinor: params.amountMinor,
        nativeCurrencyCode: params.fromCurrencyCode,
        normalizedAmountMinor: params.amountMinor,
        baseCurrencyCode: params.toCurrencyCode,
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
      throw new Error("TREASURY_FX_RATE_SNAPSHOT_NOT_FOUND");
    }

    return {
      nativeAmountMinor: params.amountMinor,
      nativeCurrencyCode: params.fromCurrencyCode,
      normalizedAmountMinor: normalizeMinorByScaledRate({
        amountMinor: params.amountMinor,
        rateScaled: rate.rateScaled,
        scale: rate.scale,
      }),
      baseCurrencyCode: params.toCurrencyCode,
      fxRateSnapshotId: rate.id,
    };
  }
}
```

---

# 6. API route extensions

Add to `apps/api/src/routes/erp/finance/treasury.ts`:

```ts
import { upsertFxRateSnapshotCommandSchema } from "@afenda/contracts/erp/finance/treasury/fx-rate-snapshot.commands";
import {
  FxRateSnapshotQueries,
  FxRateSnapshotService,
} from "@afenda/core/erp/finance/treasury";
```

```ts
  app.post("/v1/commands/erp/finance/treasury/fx-rate-snapshots/upsert", async (req, reply) => {
    const input = upsertFxRateSnapshotCommandSchema.parse(req.body);
    const service = new FxRateSnapshotService(app.db);
    const result = await service.upsert(input);

    if (!result.ok) return reply.code(400).send(result.error);
    return reply.code(201).send(result.data);
  });

  app.get("/v1/erp/finance/treasury/fx-rate-snapshots", async (req: any) => {
    const queries = new FxRateSnapshotQueries(app.db);
    return queries.listByOrg(req.user.orgId);
  });
```

---

# 7. Worker job

## `handle-fx-rate-snapshot-refreshed.ts`

```ts
type JobContext = {
  logger: {
    info: (payload: Record<string, unknown>, msg?: string) => void;
  };
};

export async function handleFxRateSnapshotRefreshed(
  ctx: JobContext,
  event: {
    orgId: string;
    fxRateSnapshotId: string;
    correlationId: string;
  },
) {
  ctx.logger.info(
    {
      orgId: event.orgId,
      fxRateSnapshotId: event.fxRateSnapshotId,
      correlationId: event.correlationId,
    },
    "Handling treasury FX rate snapshot refresh",
  );

  return { ok: true };
}
```

---

# 8. Web page

## `apps/web/src/app/(erp)/finance/treasury/fx-rates/page.tsx`

```tsx
import { Card, CardContent, CardHeader, CardTitle } from "@afenda/ui";

const API_BASE_URL = process.env.API_BASE_URL!;

async function getFxRates() {
  const res = await fetch(`${API_BASE_URL}/v1/erp/finance/treasury/fx-rate-snapshots`, {
    cache: "no-store",
  });
  if (!res.ok) return [];
  return res.json();
}

export default async function TreasuryFxRatesPage() {
  const rows = await getFxRates();

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">FX Rate Snapshots</h1>
        <p className="text-sm text-muted-foreground">
          Deterministic FX rate snapshots for treasury normalization.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Rate snapshots</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No FX snapshots.</p>
          ) : (
            rows.map((row: any) => (
              <div key={row.id} className="rounded-xl border p-3 text-sm">
                {row.rateDate} · {row.fromCurrencyCode}/{row.toCurrencyCode} · {row.rateScaled} scale {row.scale}
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

# 9. Test

## `__vitest_test__/fx-normalization.service.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { FxNormalizationService } from "../fx-normalization.service";

describe("FxNormalizationService", () => {
  it("normalizes native amount into base currency using stored rate", async () => {
    const db = {
      query: {
        treasuryFxRateSnapshotTable: {
          findFirst: async () => ({
            id: "fx-1",
            rateScaled: "135000",
            scale: 4,
          }),
        },
      },
    };

    const service = new FxNormalizationService(db as any);

    const result = await service.normalizeToBase({
      orgId: "org-1",
      rateDate: "2026-03-12",
      fromCurrencyCode: "USD",
      toCurrencyCode: "MYR",
      amountMinor: "10000",
      sourceVersion: "fx-v1",
    });

    expect(result.normalizedAmountMinor).toBe("135000");
  });
});
```

---

# 10. Required integration changes to existing Wave 3 logic

Now update:

## `CashPositionSnapshotService`

For every line:

* keep native amount/currency
* normalize into base currency
* persist normalized values or derived normalized snapshot lines

## `LiquidityForecastService`

For every feed bucket:

* normalize into forecast base currency before totaling

So the math order becomes:

**source truth → native money → FX normalization → base currency totals**

That is the correct enterprise sequence.

---

# Wave 3B — Forecast Variance / Backtesting

## Purpose

Once forecast exists, AFENDA must prove whether it was right.

This scaffold adds:

* actuals capture against forecast buckets
* bucket-level variance persistence
* forecast quality reporting
* backtesting baseline for treasury trust

This is how the system stops being “forecasting UI” and becomes **measurable financial truth**.

---

# 11. Target file set

## Contracts

* `packages/contracts/src/erp/finance/treasury/forecast-variance.entity.ts`
* `packages/contracts/src/erp/finance/treasury/forecast-variance.commands.ts`

## DB

* `packages/db/src/schema/erp/finance/treasury/forecast-variance.table.ts`

## Core

* `packages/core/src/erp/finance/treasury/forecast-variance.service.ts`
* `packages/core/src/erp/finance/treasury/forecast-variance.queries.ts`
* `packages/core/src/erp/finance/treasury/calculators/forecast-variance.ts`
* `packages/core/src/erp/finance/treasury/__vitest_test__/forecast-variance.service.test.ts`

## API

* extend `apps/api/src/routes/erp/finance/treasury.ts`

## Worker

* `apps/worker/src/jobs/erp/finance/treasury/handle-forecast-variance-recorded.ts`

## Web

* `apps/web/src/app/(erp)/finance/treasury/liquidity-forecast/variance/page.tsx`

---

# 12. Contracts

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

## `forecast-variance.commands.ts`

```ts
import { z } from "zod";
import { idempotencyKeySchema, orgScopedMetadataSchema } from "./shared";

export const recordForecastVarianceCommandSchema = z.object({
  ...orgScopedMetadataSchema.shape,
  idempotencyKey: idempotencyKeySchema,
  liquidityForecastId: z.string().uuid(),
  bucketId: z.string().uuid(),
  actualInflowsMinor: z.string(),
  actualOutflowsMinor: z.string(),
  actualClosingBalanceMinor: z.string(),
});

export type RecordForecastVarianceCommand = z.infer<
  typeof recordForecastVarianceCommandSchema
>;
```

---

# 13. DB schema

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
    orgBucketIdx: index("treasury_forecast_variance__org_bucket_idx").on(
      table.orgId,
      table.bucketId,
    ),
  }),
);
```

---

# 14. Core calculator

## `calculators/forecast-variance.ts`

```ts
export function varianceMinor(forecastMinor: string, actualMinor: string): string {
  return (BigInt(actualMinor) - BigInt(forecastMinor)).toString();
}
```

---

# 15. Core service

## `forecast-variance.service.ts`

```ts
import { and, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { recordForecastVarianceCommandSchema } from "@afenda/contracts/erp/finance/treasury/forecast-variance.commands";
import { treasuryForecastVarianceTable } from "@afenda/db/schema/erp/finance/treasury/forecast-variance.table";
import { treasuryLiquidityForecastBucketTable } from "@afenda/db/schema/erp/finance/treasury/liquidity-forecast.table";
import { varianceMinor } from "./calculators/forecast-variance";

type DbTx = any;
type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } };

async function emitOutboxEvent(_: DbTx, __: unknown) {}
async function withAudit<T>(_: DbTx, __: unknown, fn: () => Promise<T>) {
  return fn();
}

export class ForecastVarianceService {
  constructor(private readonly db: DbTx) {}

  async record(raw: unknown): Promise<ServiceResult<{ id: string }>> {
    const input = recordForecastVarianceCommandSchema.parse(raw);

    const bucket = await this.db.query.treasuryLiquidityForecastBucketTable.findFirst({
      where: and(
        eq(treasuryLiquidityForecastBucketTable.orgId, input.orgId),
        eq(treasuryLiquidityForecastBucketTable.id, input.bucketId),
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

    await withAudit(this.db, {}, async () => {
      await this.db.insert(treasuryForecastVarianceTable).values({
        id,
        orgId: input.orgId,
        liquidityForecastId: input.liquidityForecastId,
        bucketId: input.bucketId,
        actualInflowsMinor: input.actualInflowsMinor,
        actualOutflowsMinor: input.actualOutflowsMinor,
        actualClosingBalanceMinor: input.actualClosingBalanceMinor,
        inflowVarianceMinor: varianceMinor(
          bucket.expectedInflowsMinor,
          input.actualInflowsMinor,
        ),
        outflowVarianceMinor: varianceMinor(
          bucket.expectedOutflowsMinor,
          input.actualOutflowsMinor,
        ),
        closingBalanceVarianceMinor: varianceMinor(
          bucket.closingBalanceMinor,
          input.actualClosingBalanceMinor,
        ),
        measuredAt: now,
        createdAt: now,
      });

      await emitOutboxEvent(this.db, {
        eventType: "treasury.forecast-variance.recorded",
        aggregateId: id,
      });
    });

    return { ok: true, data: { id } };
  }
}
```

---

## `forecast-variance.queries.ts`

```ts
import { and, desc, eq } from "drizzle-orm";
import { treasuryForecastVarianceTable } from "@afenda/db/schema/erp/finance/treasury/forecast-variance.table";

type DbTx = any;

export class ForecastVarianceQueries {
  constructor(private readonly db: DbTx) {}

  async listByForecast(orgId: string, liquidityForecastId: string) {
    return this.db
      .select()
      .from(treasuryForecastVarianceTable)
      .where(
        and(
          eq(treasuryForecastVarianceTable.orgId, orgId),
          eq(treasuryForecastVarianceTable.liquidityForecastId, liquidityForecastId),
        ),
      )
      .orderBy(desc(treasuryForecastVarianceTable.measuredAt));
  }
}
```

---

# 16. API route extensions

Add to `apps/api/src/routes/erp/finance/treasury.ts`:

```ts
import { recordForecastVarianceCommandSchema } from "@afenda/contracts/erp/finance/treasury/forecast-variance.commands";
import {
  ForecastVarianceQueries,
  ForecastVarianceService,
} from "@afenda/core/erp/finance/treasury";
```

```ts
  app.post("/v1/commands/erp/finance/treasury/forecast-variance/record", async (req, reply) => {
    const input = recordForecastVarianceCommandSchema.parse(req.body);
    const service = new ForecastVarianceService(app.db);
    const result = await service.record(input);

    if (!result.ok) return reply.code(400).send(result.error);
    return reply.code(201).send(result.data);
  });

  app.get("/v1/erp/finance/treasury/liquidity-forecasts/:id/variance", async (req: any) => {
    const queries = new ForecastVarianceQueries(app.db);
    return queries.listByForecast(req.user.orgId, req.params.id);
  });
```

---

# 17. Worker job

## `handle-forecast-variance-recorded.ts`

```ts
type JobContext = {
  logger: {
    info: (payload: Record<string, unknown>, msg?: string) => void;
  };
};

export async function handleForecastVarianceRecorded(
  ctx: JobContext,
  event: {
    orgId: string;
    forecastVarianceId: string;
    correlationId: string;
  },
) {
  ctx.logger.info(
    {
      orgId: event.orgId,
      forecastVarianceId: event.forecastVarianceId,
      correlationId: event.correlationId,
    },
    "Handling treasury forecast variance recorded",
  );

  return { ok: true };
}
```

---

# 18. Web page

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
        <h1 className="text-2xl font-semibold">Forecast Variance / Backtesting</h1>
        <p className="text-sm text-muted-foreground">
          Measure forecast quality against actual treasury outcomes.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Forecast runs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
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
        </CardContent>
      </Card>
    </div>
  );
}
```

---

# 19. Test

## `__vitest_test__/forecast-variance.service.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { ForecastVarianceService } from "../forecast-variance.service";

describe("ForecastVarianceService", () => {
  it("records variance against forecast bucket", async () => {
    const db = {
      query: {
        treasuryLiquidityForecastBucketTable: {
          findFirst: async () => ({
            id: "bucket-1",
            expectedInflowsMinor: "1000",
            expectedOutflowsMinor: "500",
            closingBalanceMinor: "2500",
          }),
        },
      },
      insert: () => ({
        values: async () => undefined,
      }),
    };

    const service = new ForecastVarianceService(db as any);

    const result = await service.record({
      orgId: "org-1",
      actorUserId: "user-1",
      correlationId: "corr-1",
      idempotencyKey: "idem-1",
      liquidityForecastId: "forecast-1",
      bucketId: "bucket-1",
      actualInflowsMinor: "900",
      actualOutflowsMinor: "650",
      actualClosingBalanceMinor: "2400",
    });

    expect(result.ok).toBe(true);
  });
});
```

---

# 20. Cross-cutting additions

## Permissions

```ts
"erp.finance.treasury.fx-rate.read"
"erp.finance.treasury.fx-rate.manage"
"erp.finance.treasury.forecast-variance.read"
"erp.finance.treasury.forecast-variance.manage"
```

## Audit actions

```ts
"treasury.fx-rate-snapshot.upsert"
"treasury.fx-normalization.apply"
"treasury.forecast-variance.record"
```

## Error codes

```ts
TREASURY_FX_RATE_SNAPSHOT_NOT_FOUND
TREASURY_FORECAST_BUCKET_NOT_FOUND
```

## Outbox events

```ts
treasury.fx-rate-snapshot.upserted
treasury.forecast-variance.recorded
```

---

# 21. What to change before Wave 4

Before moving into Wave 4, update these existing services:

## `CashPositionSnapshotService`

Add:

* native amount
* native currency
* normalized amount
* base currency
* fx rate snapshot reference

## `LiquidityForecastService`

Replace flat raw summing with:

* liquidity feed bucket allocation
* FX normalization to base currency
* scenario overlay after normalized structural base

## Forecast closeout logic

Add later:

* once a bucket period is over, actuals can be posted
* variance rows are appended, never overwriting forecast rows

That preserves your “truth, not overwritten history” model.

---

# 22. Recommended sequence after this

Now the order should be:

1. **Wave 3.5 liquidity bridge**
2. **Wave 3 FX normalization seam**
3. **Wave 3 forecast variance / backtesting**
4. **Wave 4.1 in-house banking**
5. **Wave 4.2 netting and internal interest**

That is the strongest architecture path.

The next scaffold after this one is clearly **Wave 4.1 — In-house Banking and Intercompany Settlement**.

> Treasury Program Status (Updated: 2026-03-12)
>
> - Wave 1: Fully implemented
> - Wave 2: Fully implemented
> - Wave 3: In progress (Sprints 3.1, 3.2, 3.3 implemented + lineage persistence hardening)

## Wave 3 Current Status

- Sprint 3.1 (Cash Position Snapshot): Implemented
- Sprint 3.2 (Liquidity Scenario + Forecast Baseline): Implemented
- Sprint 3.3 (Forecast Variance / Backtesting): Implemented
- Post 3.3 lineage hardening (persistent lineage tables + API query routes + web visibility): Implemented
- Validation Status: Typechecks and full `pnpm check:all` gates passing at latest checkpoint

## Wave 3 Remaining

- Add and apply DB migration for newly introduced lineage tables across environments
- Add explicit integration tests for lineage read endpoints and lineage table writes

## Wave 3 Recently Completed (Post 3.3)

- AP due-payments projection feed into treasury liquidity inputs
- AR expected-receipts projection feed into treasury liquidity inputs
- Liquidity source feed upsert/query path wired across contracts/db/core/api/worker/web actions
- FX normalization seam added for snapshot/forecast (mixed-currency inputs now fail fast with explicit error)
- Snapshot/forecast lineage hardening with source-row IDs in audit/outbox metadata
- Persistent lineage entities/tables/queries added (`cash_position_snapshot_lineage`, `liquidity_forecast_bucket_lineage`)
- Snapshot/forecast service write paths now persist lineage rows
- Treasury API lineage endpoints added (`/treasury/cash-position-snapshots/:id/lineage`, `/treasury/liquidity-forecasts/:id/lineage`)
- Treasury web UI now surfaces snapshot/forecast lineage views
- Expanded Wave 3 test coverage for projection hardening, reproducibility, and FX seam behavior

Absolutely. Below is the **Wave 3 full drop-in scaffold** for AFENDA Treasury, aligned to your Wave 3 manifest and delivery intent: **Sprint 3.1 cash position snapshot** and **Sprint 3.2 liquidity forecast baseline**. This follows your Treasury multi-wave plan, including the exact file classes you listed for Wave 3. 

This Wave 3 is where Treasury starts becoming a **truth engine for liquidity**, not just a payments admin surface. It should answer:

* what cash do we have now
* what cash is committed but not yet settled
* what inflows/outflows are expected
* what assumptions produced the forecast
* whether the same inputs reproduce the same output

That matches your stated Wave 3 outcome and exit criteria: snapshot reproducibility, org/currency rollups, forecast traceability, and deterministic outputs. 

---

# 1. Wave 3 target file set

## Sprint 3.1

* `packages/contracts/src/erp/finance/treasury/cash-position-snapshot.entity.ts`
* `packages/contracts/src/erp/finance/treasury/cash-position-snapshot.commands.ts`
* `packages/db/src/schema/erp/finance/treasury/cash-position-snapshot.table.ts`
* `packages/core/src/erp/finance/treasury/cash-position-snapshot.service.ts`
* `packages/core/src/erp/finance/treasury/cash-position-snapshot.queries.ts`
* `packages/core/src/erp/finance/treasury/calculators/cash-position.ts`
* `packages/core/src/erp/finance/treasury/__vitest_test__/cash-position-snapshot.service.test.ts`
* `apps/worker/src/jobs/erp/finance/treasury/handle-cash-position-snapshot-requested.ts`
* `apps/web/src/app/(erp)/finance/treasury/cash-position/page.tsx`
* `apps/web/src/app/(erp)/finance/treasury/components/cash-position-dashboard.tsx`

## Sprint 3.2

* `packages/contracts/src/erp/finance/treasury/liquidity-forecast.entity.ts`
* `packages/contracts/src/erp/finance/treasury/liquidity-forecast.commands.ts`
* `packages/contracts/src/erp/finance/treasury/liquidity-scenario.entity.ts`
* `packages/contracts/src/erp/finance/treasury/liquidity-scenario.commands.ts`
* `packages/db/src/schema/erp/finance/treasury/liquidity-forecast.table.ts`
* `packages/db/src/schema/erp/finance/treasury/liquidity-scenario.table.ts`
* `packages/core/src/erp/finance/treasury/liquidity-forecast.service.ts`
* `packages/core/src/erp/finance/treasury/liquidity-forecast.queries.ts`
* `packages/core/src/erp/finance/treasury/calculators/liquidity-forecast.ts`
* `packages/core/src/erp/finance/treasury/__vitest_test__/liquidity-forecast.service.test.ts`
* `apps/worker/src/jobs/erp/finance/treasury/handle-liquidity-forecast-requested.ts`
* `apps/web/src/app/(erp)/finance/treasury/liquidity-forecast/page.tsx`
* `apps/web/src/app/(erp)/finance/treasury/components/liquidity-forecast-report.tsx`

This mirrors the Wave 3 manifest in your scaffold. 

---

# 2. Design boundary for Wave 3

Before code, here is the clean AFENDA boundary:

## Cash position snapshot

This is an **as-of truth projection** built from:

* active bank balances / latest statement balances
* approved or released treasury payment instructions
* unreconciled but known statement effects
* optional AP/AR projected feeds

## Liquidity forecast

This is a **scenario-based projection** built from:

* snapshot baseline
* expected inflows
* expected outflows
* scenario assumptions
* horizon buckets
* versioned input references

So:

* **snapshot = current truth view**
* **forecast = future truth model**

That is exactly the right split for your “Business Truth Engine / The Machine” direction.

---

# 3. Contracts

## `packages/contracts/src/erp/finance/treasury/cash-position-snapshot.entity.ts`

```ts
import { z } from "zod";

export const cashPositionSnapshotStatusSchema = z.enum([
  "draft",
  "calculated",
  "superseded",
]);

export const cashPositionBucketTypeSchema = z.enum([
  "book_balance",
  "available_balance",
  "pending_inflow",
  "pending_outflow",
  "projected_available_balance",
]);

export const cashPositionSnapshotEntitySchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  snapshotDate: z.string().date(),
  asOfAt: z.string().datetime(),
  baseCurrencyCode: z.string().trim().length(3),
  status: cashPositionSnapshotStatusSchema,
  sourceVersion: z.string().trim().min(1).max(128),
  totalBookBalanceMinor: z.string(),
  totalAvailableBalanceMinor: z.string(),
  totalPendingInflowMinor: z.string(),
  totalPendingOutflowMinor: z.string(),
  totalProjectedAvailableMinor: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const cashPositionSnapshotLineEntitySchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  snapshotId: z.string().uuid(),
  bankAccountId: z.string().uuid().nullable(),
  currencyCode: z.string().trim().length(3),
  bucketType: cashPositionBucketTypeSchema,
  amountMinor: z.string(),
  sourceType: z.enum([
    "bank_statement",
    "payment_instruction",
    "manual_adjustment",
    "ap_projection",
    "ar_projection",
  ]),
  sourceId: z.string().uuid().nullable(),
  lineDescription: z.string().trim().max(255).nullable(),
  createdAt: z.string().datetime(),
});

export type CashPositionSnapshotEntity = z.infer<
  typeof cashPositionSnapshotEntitySchema
>;

export type CashPositionSnapshotLineEntity = z.infer<
  typeof cashPositionSnapshotLineEntitySchema
>;
```

---

## `packages/contracts/src/erp/finance/treasury/cash-position-snapshot.commands.ts`

```ts
import { z } from "zod";
import { idempotencyKeySchema, orgScopedMetadataSchema } from "./shared";

export const requestCashPositionSnapshotCommandSchema = z.object({
  ...orgScopedMetadataSchema.shape,
  idempotencyKey: idempotencyKeySchema,
  snapshotDate: z.string().date(),
  asOfAt: z.string().datetime(),
  baseCurrencyCode: z.string().trim().length(3),
  sourceVersion: z.string().trim().min(1).max(128),
});

export type RequestCashPositionSnapshotCommand = z.infer<
  typeof requestCashPositionSnapshotCommandSchema
>;
```

---

## `packages/contracts/src/erp/finance/treasury/liquidity-scenario.entity.ts`

```ts
import { z } from "zod";

export const liquidityScenarioStatusSchema = z.enum([
  "draft",
  "active",
  "inactive",
]);

export const liquidityScenarioTypeSchema = z.enum([
  "base_case",
  "optimistic",
  "stress",
  "custom",
]);

export const liquidityScenarioEntitySchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  code: z.string().trim().min(1).max(64),
  name: z.string().trim().min(1).max(255),
  scenarioType: liquidityScenarioTypeSchema,
  status: liquidityScenarioStatusSchema,
  horizonDays: z.number().int().positive(),
  assumptionSetVersion: z.string().trim().min(1).max(128),
  assumptionsJson: z.record(z.string(), z.unknown()),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type LiquidityScenarioEntity = z.infer<
  typeof liquidityScenarioEntitySchema
>;
```

---

## `packages/contracts/src/erp/finance/treasury/liquidity-scenario.commands.ts`

```ts
import { z } from "zod";
import { idempotencyKeySchema, orgScopedMetadataSchema } from "./shared";
import { liquidityScenarioTypeSchema } from "./liquidity-scenario.entity";

export const createLiquidityScenarioCommandSchema = z.object({
  ...orgScopedMetadataSchema.shape,
  idempotencyKey: idempotencyKeySchema,
  code: z.string().trim().min(1).max(64),
  name: z.string().trim().min(1).max(255),
  scenarioType: liquidityScenarioTypeSchema,
  horizonDays: z.number().int().positive(),
  assumptionSetVersion: z.string().trim().min(1).max(128),
  assumptionsJson: z.record(z.string(), z.unknown()),
});

export const activateLiquidityScenarioCommandSchema = z.object({
  ...orgScopedMetadataSchema.shape,
  idempotencyKey: idempotencyKeySchema,
  liquidityScenarioId: z.string().uuid(),
});

export type CreateLiquidityScenarioCommand = z.infer<
  typeof createLiquidityScenarioCommandSchema
>;

export type ActivateLiquidityScenarioCommand = z.infer<
  typeof activateLiquidityScenarioCommandSchema
>;
```

---

## `packages/contracts/src/erp/finance/treasury/liquidity-forecast.entity.ts`

```ts
import { z } from "zod";

export const liquidityForecastStatusSchema = z.enum([
  "draft",
  "calculated",
  "superseded",
]);

export const liquidityForecastBucketGranularitySchema = z.enum([
  "daily",
  "weekly",
]);

export const liquidityForecastEntitySchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  liquidityScenarioId: z.string().uuid(),
  cashPositionSnapshotId: z.string().uuid(),
  forecastDate: z.string().date(),
  startDate: z.string().date(),
  endDate: z.string().date(),
  bucketGranularity: liquidityForecastBucketGranularitySchema,
  baseCurrencyCode: z.string().trim().length(3),
  status: liquidityForecastStatusSchema,
  sourceVersion: z.string().trim().min(1).max(128),
  assumptionSetVersion: z.string().trim().min(1).max(128),
  openingLiquidityMinor: z.string(),
  closingLiquidityMinor: z.string(),
  totalExpectedInflowsMinor: z.string(),
  totalExpectedOutflowsMinor: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const liquidityForecastBucketEntitySchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  liquidityForecastId: z.string().uuid(),
  bucketIndex: z.number().int().nonnegative(),
  bucketStartDate: z.string().date(),
  bucketEndDate: z.string().date(),
  expectedInflowsMinor: z.string(),
  expectedOutflowsMinor: z.string(),
  openingBalanceMinor: z.string(),
  closingBalanceMinor: z.string(),
  varianceMinor: z.string().nullable(),
  createdAt: z.string().datetime(),
});

export type LiquidityForecastEntity = z.infer<
  typeof liquidityForecastEntitySchema
>;
export type LiquidityForecastBucketEntity = z.infer<
  typeof liquidityForecastBucketEntitySchema
>;
```

---

## `packages/contracts/src/erp/finance/treasury/liquidity-forecast.commands.ts`

```ts
import { z } from "zod";
import { idempotencyKeySchema, orgScopedMetadataSchema } from "./shared";
import { liquidityForecastBucketGranularitySchema } from "./liquidity-forecast.entity";

export const requestLiquidityForecastCommandSchema = z.object({
  ...orgScopedMetadataSchema.shape,
  idempotencyKey: idempotencyKeySchema,
  liquidityScenarioId: z.string().uuid(),
  cashPositionSnapshotId: z.string().uuid(),
  forecastDate: z.string().date(),
  startDate: z.string().date(),
  endDate: z.string().date(),
  bucketGranularity: liquidityForecastBucketGranularitySchema,
  baseCurrencyCode: z.string().trim().length(3),
  sourceVersion: z.string().trim().min(1).max(128),
});

export type RequestLiquidityForecastCommand = z.infer<
  typeof requestLiquidityForecastCommandSchema
>;
```

---

# 4. DB schema

## `packages/db/src/schema/erp/finance/treasury/cash-position-snapshot.table.ts`

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

export const treasuryCashPositionSnapshotTable = pgTable(
  "treasury_cash_position_snapshot",
  {
    id: uuid("id").primaryKey(),
    orgId: uuid("org_id").notNull(),
    snapshotDate: date("snapshot_date").notNull(),
    asOfAt: timestamp("as_of_at", { withTimezone: true }).notNull(),
    baseCurrencyCode: text("base_currency_code").notNull(),
    status: text("status").notNull(),
    sourceVersion: text("source_version").notNull(),
    totalBookBalanceMinor: text("total_book_balance_minor").notNull(),
    totalAvailableBalanceMinor: text("total_available_balance_minor").notNull(),
    totalPendingInflowMinor: text("total_pending_inflow_minor").notNull(),
    totalPendingOutflowMinor: text("total_pending_outflow_minor").notNull(),
    totalProjectedAvailableMinor: text("total_projected_available_minor").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => ({
    orgIdx: index("treasury_cash_position_snapshot__org_idx").on(table.orgId),
    orgDateIdx: index("treasury_cash_position_snapshot__org_date_idx").on(
      table.orgId,
      table.snapshotDate,
    ),
    orgAsOfSourceUq: uniqueIndex(
      "treasury_cash_position_snapshot__org_asof_source_uq",
    ).on(table.orgId, table.asOfAt, table.sourceVersion),
  }),
);

export const treasuryCashPositionSnapshotLineTable = pgTable(
  "treasury_cash_position_snapshot_line",
  {
    id: uuid("id").primaryKey(),
    orgId: uuid("org_id").notNull(),
    snapshotId: uuid("snapshot_id").notNull(),
    bankAccountId: uuid("bank_account_id"),
    currencyCode: text("currency_code").notNull(),
    bucketType: text("bucket_type").notNull(),
    amountMinor: text("amount_minor").notNull(),
    sourceType: text("source_type").notNull(),
    sourceId: uuid("source_id"),
    lineDescription: text("line_description"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (table) => ({
    orgSnapshotIdx: index("treasury_cash_position_snapshot_line__org_snapshot_idx").on(
      table.orgId,
      table.snapshotId,
    ),
    orgBucketIdx: index("treasury_cash_position_snapshot_line__org_bucket_idx").on(
      table.orgId,
      table.bucketType,
    ),
  }),
);
```

---

## `packages/db/src/schema/erp/finance/treasury/liquidity-scenario.table.ts`

```ts
import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  integer,
} from "drizzle-orm/pg-core";

export const treasuryLiquidityScenarioTable = pgTable(
  "treasury_liquidity_scenario",
  {
    id: uuid("id").primaryKey(),
    orgId: uuid("org_id").notNull(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    scenarioType: text("scenario_type").notNull(),
    status: text("status").notNull(),
    horizonDays: integer("horizon_days").notNull(),
    assumptionSetVersion: text("assumption_set_version").notNull(),
    assumptionsJson: jsonb("assumptions_json").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => ({
    orgIdx: index("treasury_liquidity_scenario__org_idx").on(table.orgId),
    orgCodeUq: uniqueIndex("treasury_liquidity_scenario__org_code_uq").on(
      table.orgId,
      table.code,
    ),
  }),
);
```

---

## `packages/db/src/schema/erp/finance/treasury/liquidity-forecast.table.ts`

```ts
import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
  date,
} from "drizzle-orm/pg-core";

export const treasuryLiquidityForecastTable = pgTable(
  "treasury_liquidity_forecast",
  {
    id: uuid("id").primaryKey(),
    orgId: uuid("org_id").notNull(),
    liquidityScenarioId: uuid("liquidity_scenario_id").notNull(),
    cashPositionSnapshotId: uuid("cash_position_snapshot_id").notNull(),
    forecastDate: date("forecast_date").notNull(),
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    bucketGranularity: text("bucket_granularity").notNull(),
    baseCurrencyCode: text("base_currency_code").notNull(),
    status: text("status").notNull(),
    sourceVersion: text("source_version").notNull(),
    assumptionSetVersion: text("assumption_set_version").notNull(),
    openingLiquidityMinor: text("opening_liquidity_minor").notNull(),
    closingLiquidityMinor: text("closing_liquidity_minor").notNull(),
    totalExpectedInflowsMinor: text("total_expected_inflows_minor").notNull(),
    totalExpectedOutflowsMinor: text("total_expected_outflows_minor").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => ({
    orgIdx: index("treasury_liquidity_forecast__org_idx").on(table.orgId),
    orgDateIdx: index("treasury_liquidity_forecast__org_date_idx").on(
      table.orgId,
      table.forecastDate,
    ),
  }),
);

export const treasuryLiquidityForecastBucketTable = pgTable(
  "treasury_liquidity_forecast_bucket",
  {
    id: uuid("id").primaryKey(),
    orgId: uuid("org_id").notNull(),
    liquidityForecastId: uuid("liquidity_forecast_id").notNull(),
    bucketIndex: integer("bucket_index").notNull(),
    bucketStartDate: date("bucket_start_date").notNull(),
    bucketEndDate: date("bucket_end_date").notNull(),
    expectedInflowsMinor: text("expected_inflows_minor").notNull(),
    expectedOutflowsMinor: text("expected_outflows_minor").notNull(),
    openingBalanceMinor: text("opening_balance_minor").notNull(),
    closingBalanceMinor: text("closing_balance_minor").notNull(),
    varianceMinor: text("variance_minor"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (table) => ({
    orgForecastIdx: index("treasury_liquidity_forecast_bucket__org_forecast_idx").on(
      table.orgId,
      table.liquidityForecastId,
    ),
  }),
);
```

---

# 5. Calculators

## `packages/core/src/erp/finance/treasury/calculators/cash-position.ts`

```ts
export function addMinor(a: string, b: string): string {
  return (BigInt(a) + BigInt(b)).toString();
}

export function subMinor(a: string, b: string): string {
  return (BigInt(a) - BigInt(b)).toString();
}

export function sumMinor(values: string[]): string {
  return values.reduce((acc, value) => (BigInt(acc) + BigInt(value)).toString(), "0");
}

export type CashPositionInputLine = {
  bucketType:
    | "book_balance"
    | "available_balance"
    | "pending_inflow"
    | "pending_outflow"
    | "projected_available_balance";
  amountMinor: string;
};

export function calculateCashPositionTotals(lines: CashPositionInputLine[]) {
  const totalBookBalanceMinor = sumMinor(
    lines.filter((x) => x.bucketType === "book_balance").map((x) => x.amountMinor),
  );

  const totalAvailableBalanceMinor = sumMinor(
    lines.filter((x) => x.bucketType === "available_balance").map((x) => x.amountMinor),
  );

  const totalPendingInflowMinor = sumMinor(
    lines.filter((x) => x.bucketType === "pending_inflow").map((x) => x.amountMinor),
  );

  const totalPendingOutflowMinor = sumMinor(
    lines.filter((x) => x.bucketType === "pending_outflow").map((x) => x.amountMinor),
  );

  const totalProjectedAvailableMinor = addMinor(
    addMinor(totalAvailableBalanceMinor, totalPendingInflowMinor),
    (BigInt(totalPendingOutflowMinor) * -1n).toString(),
  );

  return {
    totalBookBalanceMinor,
    totalAvailableBalanceMinor,
    totalPendingInflowMinor,
    totalPendingOutflowMinor,
    totalProjectedAvailableMinor,
  };
}
```

---

## `packages/core/src/erp/finance/treasury/calculators/liquidity-forecast.ts`

```ts
export type LiquidityForecastInput = {
  openingLiquidityMinor: string;
  buckets: Array<{
    expectedInflowsMinor: string;
    expectedOutflowsMinor: string;
  }>;
};

export function buildLiquidityForecastBuckets(input: LiquidityForecastInput) {
  const results: Array<{
    bucketIndex: number;
    expectedInflowsMinor: string;
    expectedOutflowsMinor: string;
    openingBalanceMinor: string;
    closingBalanceMinor: string;
  }> = [];

  let running = BigInt(input.openingLiquidityMinor);

  input.buckets.forEach((bucket, index) => {
    const opening = running;
    const closing =
      running + BigInt(bucket.expectedInflowsMinor) - BigInt(bucket.expectedOutflowsMinor);

    results.push({
      bucketIndex: index,
      expectedInflowsMinor: bucket.expectedInflowsMinor,
      expectedOutflowsMinor: bucket.expectedOutflowsMinor,
      openingBalanceMinor: opening.toString(),
      closingBalanceMinor: closing.toString(),
    });

    running = closing;
  });

  return {
    openingLiquidityMinor: input.openingLiquidityMinor,
    closingLiquidityMinor: running.toString(),
    totalExpectedInflowsMinor: input.buckets
      .reduce((acc, x) => acc + BigInt(x.expectedInflowsMinor), 0n)
      .toString(),
    totalExpectedOutflowsMinor: input.buckets
      .reduce((acc, x) => acc + BigInt(x.expectedOutflowsMinor), 0n)
      .toString(),
    buckets: results,
  };
}
```

---

# 6. Core services

## `packages/core/src/erp/finance/treasury/cash-position-snapshot.service.ts`

```ts
import { and, desc, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { requestCashPositionSnapshotCommandSchema } from "@afenda/contracts/erp/finance/treasury/cash-position-snapshot.commands";
import {
  treasuryCashPositionSnapshotLineTable,
  treasuryCashPositionSnapshotTable,
} from "@afenda/db/schema/erp/finance/treasury/cash-position-snapshot.table";
import { treasuryBankStatementTable } from "@afenda/db/schema/erp/finance/treasury";
import { treasuryPaymentInstructionTable } from "@afenda/db/schema/erp/finance/treasury/treasury-payment-instruction.table";
import { calculateCashPositionTotals } from "./calculators/cash-position";

type DbTx = any;
type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } };

async function emitOutboxEvent(_: DbTx, __: unknown) {}
async function withAudit<T>(_: DbTx, __: unknown, fn: () => Promise<T>) {
  return fn();
}

export class CashPositionSnapshotService {
  constructor(private readonly db: DbTx) {}

  async request(raw: unknown): Promise<ServiceResult<{ id: string }>> {
    const input = requestCashPositionSnapshotCommandSchema.parse(raw);

    const existing = await this.db.query.treasuryCashPositionSnapshotTable.findFirst({
      where: and(
        eq(treasuryCashPositionSnapshotTable.orgId, input.orgId),
        eq(treasuryCashPositionSnapshotTable.asOfAt, new Date(input.asOfAt)),
        eq(treasuryCashPositionSnapshotTable.sourceVersion, input.sourceVersion),
      ),
    });

    if (existing) {
      return { ok: true, data: { id: existing.id } };
    }

    const latestStatements = await this.db
      .select()
      .from(treasuryBankStatementTable)
      .where(eq(treasuryBankStatementTable.orgId, input.orgId))
      .orderBy(desc(treasuryBankStatementTable.createdAt));

    const releasedOrApprovedInstructions = await this.db
      .select()
      .from(treasuryPaymentInstructionTable)
      .where(eq(treasuryPaymentInstructionTable.orgId, input.orgId));

    const lines: Array<{
      bankAccountId: string | null;
      currencyCode: string;
      bucketType:
        | "book_balance"
        | "available_balance"
        | "pending_inflow"
        | "pending_outflow"
        | "projected_available_balance";
      amountMinor: string;
      sourceType: "bank_statement" | "payment_instruction";
      sourceId: string | null;
      lineDescription: string | null;
    }> = [];

    for (const stmt of latestStatements) {
      lines.push({
        bankAccountId: stmt.bankAccountId,
        currencyCode: stmt.currencyCode,
        bucketType: "book_balance",
        amountMinor: stmt.closingBalanceMinor,
        sourceType: "bank_statement",
        sourceId: stmt.id,
        lineDescription: `Closing balance from ${stmt.sourceFileName}`,
      });

      lines.push({
        bankAccountId: stmt.bankAccountId,
        currencyCode: stmt.currencyCode,
        bucketType: "available_balance",
        amountMinor: stmt.closingBalanceMinor,
        sourceType: "bank_statement",
        sourceId: stmt.id,
        lineDescription: `Available balance from ${stmt.sourceFileName}`,
      });
    }

    for (const pi of releasedOrApprovedInstructions) {
      if (pi.status === "approved") {
        lines.push({
          bankAccountId: pi.bankAccountId,
          currencyCode: pi.currencyCode,
          bucketType: "pending_outflow",
          amountMinor: pi.amountMinor,
          sourceType: "payment_instruction",
          sourceId: pi.id,
          lineDescription: `Approved payment instruction`,
        });
      }

      if (pi.status === "released") {
        lines.push({
          bankAccountId: pi.bankAccountId,
          currencyCode: pi.currencyCode,
          bucketType: "pending_outflow",
          amountMinor: pi.amountMinor,
          sourceType: "payment_instruction",
          sourceId: pi.id,
          lineDescription: `Released payment instruction`,
        });
      }
    }

    const totals = calculateCashPositionTotals(
      lines.map((x) => ({
        bucketType: x.bucketType,
        amountMinor: x.amountMinor,
      })),
    );

    const id = randomUUID();
    const now = new Date();

    await withAudit(this.db, {}, async () => {
      await this.db.insert(treasuryCashPositionSnapshotTable).values({
        id,
        orgId: input.orgId,
        snapshotDate: input.snapshotDate,
        asOfAt: new Date(input.asOfAt),
        baseCurrencyCode: input.baseCurrencyCode,
        status: "calculated",
        sourceVersion: input.sourceVersion,
        totalBookBalanceMinor: totals.totalBookBalanceMinor,
        totalAvailableBalanceMinor: totals.totalAvailableBalanceMinor,
        totalPendingInflowMinor: totals.totalPendingInflowMinor,
        totalPendingOutflowMinor: totals.totalPendingOutflowMinor,
        totalProjectedAvailableMinor: totals.totalProjectedAvailableMinor,
        createdAt: now,
        updatedAt: now,
      });

      for (const line of lines) {
        await this.db.insert(treasuryCashPositionSnapshotLineTable).values({
          id: randomUUID(),
          orgId: input.orgId,
          snapshotId: id,
          bankAccountId: line.bankAccountId,
          currencyCode: line.currencyCode,
          bucketType: line.bucketType,
          amountMinor: line.amountMinor,
          sourceType: line.sourceType,
          sourceId: line.sourceId,
          lineDescription: line.lineDescription,
          createdAt: now,
        });
      }

      await emitOutboxEvent(this.db, {
        eventType: "treasury.cash-position-snapshot.calculated",
        aggregateId: id,
      });
    });

    return { ok: true, data: { id } };
  }
}
```

---

## `packages/core/src/erp/finance/treasury/cash-position-snapshot.queries.ts`

```ts
import { and, desc, eq } from "drizzle-orm";
import {
  treasuryCashPositionSnapshotLineTable,
  treasuryCashPositionSnapshotTable,
} from "@afenda/db/schema/erp/finance/treasury/cash-position-snapshot.table";

type DbTx = any;

export class CashPositionSnapshotQueries {
  constructor(private readonly db: DbTx) {}

  async listByOrg(orgId: string) {
    return this.db
      .select()
      .from(treasuryCashPositionSnapshotTable)
      .where(eq(treasuryCashPositionSnapshotTable.orgId, orgId))
      .orderBy(desc(treasuryCashPositionSnapshotTable.asOfAt));
  }

  async getById(orgId: string, snapshotId: string) {
    const rows = await this.db
      .select()
      .from(treasuryCashPositionSnapshotTable)
      .where(
        and(
          eq(treasuryCashPositionSnapshotTable.orgId, orgId),
          eq(treasuryCashPositionSnapshotTable.id, snapshotId),
        ),
      )
      .limit(1);

    return rows[0] ?? null;
  }

  async listLines(orgId: string, snapshotId: string) {
    return this.db
      .select()
      .from(treasuryCashPositionSnapshotLineTable)
      .where(
        and(
          eq(treasuryCashPositionSnapshotLineTable.orgId, orgId),
          eq(treasuryCashPositionSnapshotLineTable.snapshotId, snapshotId),
        ),
      )
      .orderBy(desc(treasuryCashPositionSnapshotLineTable.createdAt));
  }
}
```

---

## `packages/core/src/erp/finance/treasury/liquidity-forecast.service.ts`

```ts
import { and, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { requestLiquidityForecastCommandSchema } from "@afenda/contracts/erp/finance/treasury/liquidity-forecast.commands";
import { activateLiquidityScenarioCommandSchema, createLiquidityScenarioCommandSchema } from "@afenda/contracts/erp/finance/treasury/liquidity-scenario.commands";
import { treasuryCashPositionSnapshotTable } from "@afenda/db/schema/erp/finance/treasury/cash-position-snapshot.table";
import {
  treasuryLiquidityForecastBucketTable,
  treasuryLiquidityForecastTable,
} from "@afenda/db/schema/erp/finance/treasury/liquidity-forecast.table";
import { treasuryLiquidityScenarioTable } from "@afenda/db/schema/erp/finance/treasury/liquidity-scenario.table";
import { buildLiquidityForecastBuckets } from "./calculators/liquidity-forecast";

type DbTx = any;
type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } };

async function emitOutboxEvent(_: DbTx, __: unknown) {}
async function withAudit<T>(_: DbTx, __: unknown, fn: () => Promise<T>) {
  return fn();
}

function enumerateDailyBuckets(startDate: string, endDate: string) {
  const start = new Date(`${startDate}T00:00:00.000Z`);
  const end = new Date(`${endDate}T00:00:00.000Z`);
  const buckets: Array<{ startDate: string; endDate: string }> = [];

  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    const iso = d.toISOString().slice(0, 10);
    buckets.push({ startDate: iso, endDate: iso });
  }

  return buckets;
}

export class LiquidityForecastService {
  constructor(private readonly db: DbTx) {}

  async createScenario(raw: unknown): Promise<ServiceResult<{ id: string }>> {
    const input = createLiquidityScenarioCommandSchema.parse(raw);

    const existing = await this.db.query.treasuryLiquidityScenarioTable.findFirst({
      where: and(
        eq(treasuryLiquidityScenarioTable.orgId, input.orgId),
        eq(treasuryLiquidityScenarioTable.code, input.code),
      ),
    });

    if (existing) {
      return {
        ok: false,
        error: {
          code: "TREASURY_LIQUIDITY_SCENARIO_CODE_EXISTS",
          message: "Liquidity scenario code already exists",
        },
      };
    }

    const id = randomUUID();
    const now = new Date();

    await withAudit(this.db, {}, async () => {
      await this.db.insert(treasuryLiquidityScenarioTable).values({
        id,
        orgId: input.orgId,
        code: input.code,
        name: input.name,
        scenarioType: input.scenarioType,
        status: "draft",
        horizonDays: input.horizonDays,
        assumptionSetVersion: input.assumptionSetVersion,
        assumptionsJson: input.assumptionsJson,
        createdAt: now,
        updatedAt: now,
      });

      await emitOutboxEvent(this.db, {
        eventType: "treasury.liquidity-scenario.created",
        aggregateId: id,
      });
    });

    return { ok: true, data: { id } };
  }

  async activateScenario(raw: unknown): Promise<ServiceResult<{ id: string }>> {
    const input = activateLiquidityScenarioCommandSchema.parse(raw);

    const row = await this.db.query.treasuryLiquidityScenarioTable.findFirst({
      where: and(
        eq(treasuryLiquidityScenarioTable.orgId, input.orgId),
        eq(treasuryLiquidityScenarioTable.id, input.liquidityScenarioId),
      ),
    });

    if (!row) {
      return {
        ok: false,
        error: {
          code: "TREASURY_LIQUIDITY_SCENARIO_NOT_FOUND",
          message: "Liquidity scenario not found",
        },
      };
    }

    const now = new Date();

    await withAudit(this.db, {}, async () => {
      await this.db
        .update(treasuryLiquidityScenarioTable)
        .set({
          status: "inactive",
          updatedAt: now,
        })
        .where(eq(treasuryLiquidityScenarioTable.orgId, input.orgId));

      await this.db
        .update(treasuryLiquidityScenarioTable)
        .set({
          status: "active",
          updatedAt: now,
        })
        .where(eq(treasuryLiquidityScenarioTable.id, row.id));

      await emitOutboxEvent(this.db, {
        eventType: "treasury.liquidity-scenario.activated",
        aggregateId: row.id,
      });
    });

    return { ok: true, data: { id: row.id } };
  }

  async requestForecast(raw: unknown): Promise<ServiceResult<{ id: string }>> {
    const input = requestLiquidityForecastCommandSchema.parse(raw);

    const scenario = await this.db.query.treasuryLiquidityScenarioTable.findFirst({
      where: and(
        eq(treasuryLiquidityScenarioTable.orgId, input.orgId),
        eq(treasuryLiquidityScenarioTable.id, input.liquidityScenarioId),
      ),
    });

    if (!scenario) {
      return {
        ok: false,
        error: {
          code: "TREASURY_LIQUIDITY_SCENARIO_NOT_FOUND",
          message: "Liquidity scenario not found",
        },
      };
    }

    const snapshot = await this.db.query.treasuryCashPositionSnapshotTable.findFirst({
      where: and(
        eq(treasuryCashPositionSnapshotTable.orgId, input.orgId),
        eq(treasuryCashPositionSnapshotTable.id, input.cashPositionSnapshotId),
      ),
    });

    if (!snapshot) {
      return {
        ok: false,
        error: {
          code: "TREASURY_CASH_POSITION_SNAPSHOT_NOT_FOUND",
          message: "Cash position snapshot not found",
        },
      };
    }

    const existing = await this.db.query.treasuryLiquidityForecastTable.findFirst({
      where: and(
        eq(treasuryLiquidityForecastTable.orgId, input.orgId),
        eq(treasuryLiquidityForecastTable.cashPositionSnapshotId, input.cashPositionSnapshotId),
        eq(treasuryLiquidityForecastTable.sourceVersion, input.sourceVersion),
      ),
    });

    if (existing) {
      return { ok: true, data: { id: existing.id } };
    }

    const assumptions = scenario.assumptionsJson as Record<string, unknown>;
    const assumedDailyInflowsMinor = String(assumptions.assumedDailyInflowsMinor ?? "0");
    const assumedDailyOutflowsMinor = String(assumptions.assumedDailyOutflowsMinor ?? "0");

    const bucketDefs = enumerateDailyBuckets(input.startDate, input.endDate);
    const computed = buildLiquidityForecastBuckets({
      openingLiquidityMinor: snapshot.totalProjectedAvailableMinor,
      buckets: bucketDefs.map(() => ({
        expectedInflowsMinor: assumedDailyInflowsMinor,
        expectedOutflowsMinor: assumedDailyOutflowsMinor,
      })),
    });

    const id = randomUUID();
    const now = new Date();

    await withAudit(this.db, {}, async () => {
      await this.db.insert(treasuryLiquidityForecastTable).values({
        id,
        orgId: input.orgId,
        liquidityScenarioId: scenario.id,
        cashPositionSnapshotId: snapshot.id,
        forecastDate: input.forecastDate,
        startDate: input.startDate,
        endDate: input.endDate,
        bucketGranularity: input.bucketGranularity,
        baseCurrencyCode: input.baseCurrencyCode,
        status: "calculated",
        sourceVersion: input.sourceVersion,
        assumptionSetVersion: scenario.assumptionSetVersion,
        openingLiquidityMinor: computed.openingLiquidityMinor,
        closingLiquidityMinor: computed.closingLiquidityMinor,
        totalExpectedInflowsMinor: computed.totalExpectedInflowsMinor,
        totalExpectedOutflowsMinor: computed.totalExpectedOutflowsMinor,
        createdAt: now,
        updatedAt: now,
      });

      for (const bucket of computed.buckets) {
        await this.db.insert(treasuryLiquidityForecastBucketTable).values({
          id: randomUUID(),
          orgId: input.orgId,
          liquidityForecastId: id,
          bucketIndex: bucket.bucketIndex,
          bucketStartDate: bucketDefs[bucket.bucketIndex].startDate,
          bucketEndDate: bucketDefs[bucket.bucketIndex].endDate,
          expectedInflowsMinor: bucket.expectedInflowsMinor,
          expectedOutflowsMinor: bucket.expectedOutflowsMinor,
          openingBalanceMinor: bucket.openingBalanceMinor,
          closingBalanceMinor: bucket.closingBalanceMinor,
          varianceMinor: null,
          createdAt: now,
        });
      }

      await emitOutboxEvent(this.db, {
        eventType: "treasury.liquidity-forecast.calculated",
        aggregateId: id,
      });
    });

    return { ok: true, data: { id } };
  }
}
```

---

## `packages/core/src/erp/finance/treasury/liquidity-forecast.queries.ts`

```ts
import { and, desc, eq } from "drizzle-orm";
import {
  treasuryLiquidityForecastBucketTable,
  treasuryLiquidityForecastTable,
} from "@afenda/db/schema/erp/finance/treasury/liquidity-forecast.table";
import { treasuryLiquidityScenarioTable } from "@afenda/db/schema/erp/finance/treasury/liquidity-scenario.table";

type DbTx = any;

export class LiquidityForecastQueries {
  constructor(private readonly db: DbTx) {}

  async listScenarios(orgId: string) {
    return this.db
      .select()
      .from(treasuryLiquidityScenarioTable)
      .where(eq(treasuryLiquidityScenarioTable.orgId, orgId))
      .orderBy(desc(treasuryLiquidityScenarioTable.createdAt));
  }

  async listForecasts(orgId: string) {
    return this.db
      .select()
      .from(treasuryLiquidityForecastTable)
      .where(eq(treasuryLiquidityForecastTable.orgId, orgId))
      .orderBy(desc(treasuryLiquidityForecastTable.createdAt));
  }

  async getForecastById(orgId: string, forecastId: string) {
    const rows = await this.db
      .select()
      .from(treasuryLiquidityForecastTable)
      .where(
        and(
          eq(treasuryLiquidityForecastTable.orgId, orgId),
          eq(treasuryLiquidityForecastTable.id, forecastId),
        ),
      )
      .limit(1);

    return rows[0] ?? null;
  }

  async listForecastBuckets(orgId: string, forecastId: string) {
    return this.db
      .select()
      .from(treasuryLiquidityForecastBucketTable)
      .where(
        and(
          eq(treasuryLiquidityForecastBucketTable.orgId, orgId),
          eq(treasuryLiquidityForecastBucketTable.liquidityForecastId, forecastId),
        ),
      )
      .orderBy(treasuryLiquidityForecastBucketTable.bucketIndex);
  }
}
```

---

# 7. API route extensions

Add these to `apps/api/src/routes/erp/finance/treasury.ts`.

```ts
import { requestCashPositionSnapshotCommandSchema } from "@afenda/contracts/erp/finance/treasury/cash-position-snapshot.commands";
import {
  activateLiquidityScenarioCommandSchema,
  createLiquidityScenarioCommandSchema,
} from "@afenda/contracts/erp/finance/treasury/liquidity-scenario.commands";
import { requestLiquidityForecastCommandSchema } from "@afenda/contracts/erp/finance/treasury/liquidity-forecast.commands";
import {
  CashPositionSnapshotQueries,
  CashPositionSnapshotService,
  LiquidityForecastQueries,
  LiquidityForecastService,
} from "@afenda/core/erp/finance/treasury";
```

```ts
  app.post("/v1/commands/erp/finance/treasury/cash-position/request-snapshot", async (req, reply) => {
    const input = requestCashPositionSnapshotCommandSchema.parse(req.body);
    const service = new CashPositionSnapshotService(app.db);
    const result = await service.request(input);
    if (!result.ok) return reply.code(400).send(result.error);
    return reply.code(201).send(result.data);
  });

  app.get("/v1/erp/finance/treasury/cash-position/snapshots", async (req: any) => {
    const queries = new CashPositionSnapshotQueries(app.db);
    return queries.listByOrg(req.user.orgId);
  });

  app.get("/v1/erp/finance/treasury/cash-position/snapshots/:id", async (req: any, reply) => {
    const queries = new CashPositionSnapshotQueries(app.db);
    const snapshot = await queries.getById(req.user.orgId, req.params.id);
    if (!snapshot) return reply.code(404).send({ code: "NOT_FOUND" });
    const lines = await queries.listLines(req.user.orgId, req.params.id);
    return { snapshot, lines };
  });

  app.post("/v1/commands/erp/finance/treasury/liquidity-scenarios/create", async (req, reply) => {
    const input = createLiquidityScenarioCommandSchema.parse(req.body);
    const service = new LiquidityForecastService(app.db);
    const result = await service.createScenario(input);
    if (!result.ok) return reply.code(400).send(result.error);
    return reply.code(201).send(result.data);
  });

  app.post("/v1/commands/erp/finance/treasury/liquidity-scenarios/activate", async (req, reply) => {
    const input = activateLiquidityScenarioCommandSchema.parse(req.body);
    const service = new LiquidityForecastService(app.db);
    const result = await service.activateScenario(input);
    if (!result.ok) return reply.code(400).send(result.error);
    return reply.send(result.data);
  });

  app.get("/v1/erp/finance/treasury/liquidity-scenarios", async (req: any) => {
    const queries = new LiquidityForecastQueries(app.db);
    return queries.listScenarios(req.user.orgId);
  });

  app.post("/v1/commands/erp/finance/treasury/liquidity-forecast/request", async (req, reply) => {
    const input = requestLiquidityForecastCommandSchema.parse(req.body);
    const service = new LiquidityForecastService(app.db);
    const result = await service.requestForecast(input);
    if (!result.ok) return reply.code(400).send(result.error);
    return reply.code(201).send(result.data);
  });

  app.get("/v1/erp/finance/treasury/liquidity-forecasts", async (req: any) => {
    const queries = new LiquidityForecastQueries(app.db);
    return queries.listForecasts(req.user.orgId);
  });

  app.get("/v1/erp/finance/treasury/liquidity-forecasts/:id", async (req: any, reply) => {
    const queries = new LiquidityForecastQueries(app.db);
    const forecast = await queries.getForecastById(req.user.orgId, req.params.id);
    if (!forecast) return reply.code(404).send({ code: "NOT_FOUND" });
    const buckets = await queries.listForecastBuckets(req.user.orgId, req.params.id);
    return { forecast, buckets };
  });
```

---

# 8. Worker jobs

## `apps/worker/src/jobs/erp/finance/treasury/handle-cash-position-snapshot-requested.ts`

```ts
type JobContext = {
  db: any;
  logger: {
    info: (payload: Record<string, unknown>, msg?: string) => void;
    error: (payload: Record<string, unknown>, msg?: string) => void;
  };
};

export async function handleCashPositionSnapshotRequested(
  ctx: JobContext,
  event: {
    orgId: string;
    snapshotId: string;
    correlationId: string;
  },
) {
  ctx.logger.info(
    {
      orgId: event.orgId,
      snapshotId: event.snapshotId,
      correlationId: event.correlationId,
    },
    "Handling treasury cash position snapshot requested",
  );

  return { ok: true };
}
```

---

## `apps/worker/src/jobs/erp/finance/treasury/handle-liquidity-forecast-requested.ts`

```ts
type JobContext = {
  db: any;
  logger: {
    info: (payload: Record<string, unknown>, msg?: string) => void;
    error: (payload: Record<string, unknown>, msg?: string) => void;
  };
};

export async function handleLiquidityForecastRequested(
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
    "Handling treasury liquidity forecast requested",
  );

  return { ok: true };
}
```

---

# 9. Web actions

Add these into `apps/web/src/app/(erp)/finance/treasury/actions.ts`.

```ts
export async function requestCashPositionSnapshotAction(formData: FormData) {
  await postJson("/v1/commands/erp/finance/treasury/cash-position/request-snapshot", {
    orgId: formData.get("orgId"),
    actorUserId: formData.get("actorUserId"),
    correlationId: crypto.randomUUID(),
    idempotencyKey: crypto.randomUUID(),
    snapshotDate: formData.get("snapshotDate"),
    asOfAt: formData.get("asOfAt"),
    baseCurrencyCode: formData.get("baseCurrencyCode"),
    sourceVersion: formData.get("sourceVersion"),
  });

  revalidatePath("/finance/treasury/cash-position");
}

export async function createLiquidityScenarioAction(formData: FormData) {
  await postJson("/v1/commands/erp/finance/treasury/liquidity-scenarios/create", {
    orgId: formData.get("orgId"),
    actorUserId: formData.get("actorUserId"),
    correlationId: crypto.randomUUID(),
    idempotencyKey: crypto.randomUUID(),
    code: formData.get("code"),
    name: formData.get("name"),
    scenarioType: formData.get("scenarioType"),
    horizonDays: Number(formData.get("horizonDays")),
    assumptionSetVersion: formData.get("assumptionSetVersion"),
    assumptionsJson: JSON.parse(String(formData.get("assumptionsJson"))),
  });

  revalidatePath("/finance/treasury/liquidity-forecast");
}

export async function requestLiquidityForecastAction(formData: FormData) {
  await postJson("/v1/commands/erp/finance/treasury/liquidity-forecast/request", {
    orgId: formData.get("orgId"),
    actorUserId: formData.get("actorUserId"),
    correlationId: crypto.randomUUID(),
    idempotencyKey: crypto.randomUUID(),
    liquidityScenarioId: formData.get("liquidityScenarioId"),
    cashPositionSnapshotId: formData.get("cashPositionSnapshotId"),
    forecastDate: formData.get("forecastDate"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    bucketGranularity: formData.get("bucketGranularity"),
    baseCurrencyCode: formData.get("baseCurrencyCode"),
    sourceVersion: formData.get("sourceVersion"),
  });

  revalidatePath("/finance/treasury/liquidity-forecast");
}
```

---

# 10. Web components

## `apps/web/src/app/(erp)/finance/treasury/components/cash-position-dashboard.tsx`

```tsx
import { Card, CardContent, CardHeader, CardTitle } from "@afenda/ui";

export function CashPositionDashboard({ snapshots }: { snapshots: any[] }) {
  const latest = snapshots[0];

  return (
    <div className="grid gap-4 md:grid-cols-5">
      <Card>
        <CardHeader><CardTitle>Book Balance</CardTitle></CardHeader>
        <CardContent>{latest?.totalBookBalanceMinor ?? "0"}</CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Available</CardTitle></CardHeader>
        <CardContent>{latest?.totalAvailableBalanceMinor ?? "0"}</CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Pending Inflow</CardTitle></CardHeader>
        <CardContent>{latest?.totalPendingInflowMinor ?? "0"}</CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Pending Outflow</CardTitle></CardHeader>
        <CardContent>{latest?.totalPendingOutflowMinor ?? "0"}</CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Projected Available</CardTitle></CardHeader>
        <CardContent>{latest?.totalProjectedAvailableMinor ?? "0"}</CardContent>
      </Card>
    </div>
  );
}
```

---

## `apps/web/src/app/(erp)/finance/treasury/components/liquidity-forecast-report.tsx`

```tsx
import { Card, CardContent, CardHeader, CardTitle } from "@afenda/ui";

export function LiquidityForecastReport({
  forecasts,
  bucketsByForecastId,
}: {
  forecasts: any[];
  bucketsByForecastId?: Record<string, any[]>;
}) {
  return (
    <div className="space-y-4">
      {forecasts.map((forecast) => {
        const buckets = bucketsByForecastId?.[forecast.id] ?? [];
        return (
          <Card key={forecast.id}>
            <CardHeader>
              <CardTitle>
                Forecast {forecast.forecastDate} · {forecast.baseCurrencyCode}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm text-muted-foreground">
                Opening {forecast.openingLiquidityMinor} · Closing {forecast.closingLiquidityMinor}
              </div>
              <div className="space-y-2">
                {buckets.map((bucket) => (
                  <div
                    key={bucket.id}
                    className="flex items-center justify-between rounded-xl border p-3 text-sm"
                  >
                    <div>
                      {bucket.bucketStartDate} → {bucket.bucketEndDate}
                    </div>
                    <div>
                      In {bucket.expectedInflowsMinor} · Out {bucket.expectedOutflowsMinor} · Close {bucket.closingBalanceMinor}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
```

---

# 11. Web pages

## `apps/web/src/app/(erp)/finance/treasury/cash-position/page.tsx`

```tsx
import { requestCashPositionSnapshotAction } from "../actions";
import { CashPositionDashboard } from "../components/cash-position-dashboard";
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from "@afenda/ui";

const API_BASE_URL = process.env.API_BASE_URL!;

async function getSnapshots() {
  const res = await fetch(`${API_BASE_URL}/v1/erp/finance/treasury/cash-position/snapshots`, {
    cache: "no-store",
  });
  if (!res.ok) return [];
  return res.json();
}

export default async function CashPositionPage() {
  const snapshots = await getSnapshots();

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Cash Position</h1>
        <p className="text-sm text-muted-foreground">
          As-of liquidity truth from bank balances and pending treasury flows.
        </p>
      </div>

      <CashPositionDashboard snapshots={snapshots} />

      <Card>
        <CardHeader>
          <CardTitle>Request snapshot</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={requestCashPositionSnapshotAction} className="grid gap-4 md:grid-cols-2">
            <input type="hidden" name="orgId" value="00000000-0000-0000-0000-000000000001" />
            <input type="hidden" name="actorUserId" value="00000000-0000-0000-0000-000000000002" />

            <div className="space-y-2">
              <Label htmlFor="snapshotDate">Snapshot date</Label>
              <Input id="snapshotDate" name="snapshotDate" type="date" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="asOfAt">As of at</Label>
              <Input id="asOfAt" name="asOfAt" type="datetime-local" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="baseCurrencyCode">Base currency</Label>
              <Input id="baseCurrencyCode" name="baseCurrencyCode" defaultValue="USD" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sourceVersion">Source version</Label>
              <Input id="sourceVersion" name="sourceVersion" defaultValue="wave3-v1" required />
            </div>

            <div className="md:col-span-2">
              <Button type="submit">Calculate snapshot</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## `apps/web/src/app/(erp)/finance/treasury/liquidity-forecast/page.tsx`

```tsx
import {
  createLiquidityScenarioAction,
  requestLiquidityForecastAction,
} from "../actions";
import { LiquidityForecastReport } from "../components/liquidity-forecast-report";
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Textarea } from "@afenda/ui";

const API_BASE_URL = process.env.API_BASE_URL!;

async function getScenarios() {
  const res = await fetch(`${API_BASE_URL}/v1/erp/finance/treasury/liquidity-scenarios`, {
    cache: "no-store",
  });
  if (!res.ok) return [];
  return res.json();
}

async function getForecasts() {
  const res = await fetch(`${API_BASE_URL}/v1/erp/finance/treasury/liquidity-forecasts`, {
    cache: "no-store",
  });
  if (!res.ok) return [];
  return res.json();
}

export default async function LiquidityForecastPage() {
  const [scenarios, forecasts] = await Promise.all([getScenarios(), getForecasts()]);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Liquidity Forecast</h1>
        <p className="text-sm text-muted-foreground">
          Scenario-based short and medium horizon liquidity projection.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create liquidity scenario</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createLiquidityScenarioAction} className="grid gap-4">
            <input type="hidden" name="orgId" value="00000000-0000-0000-0000-000000000001" />
            <input type="hidden" name="actorUserId" value="00000000-0000-0000-0000-000000000002" />

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="code">Code</Label>
                <Input id="code" name="code" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="scenarioType">Scenario type</Label>
                <Input id="scenarioType" name="scenarioType" defaultValue="base_case" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="horizonDays">Horizon days</Label>
                <Input id="horizonDays" name="horizonDays" defaultValue="30" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="assumptionSetVersion">Assumption version</Label>
                <Input id="assumptionSetVersion" name="assumptionSetVersion" defaultValue="forecast-v1" required />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="assumptionsJson">Assumptions JSON</Label>
              <Textarea
                id="assumptionsJson"
                name="assumptionsJson"
                rows={8}
                defaultValue={JSON.stringify(
                  {
                    assumedDailyInflowsMinor: "100000",
                    assumedDailyOutflowsMinor: "85000",
                  },
                  null,
                  2,
                )}
              />
            </div>

            <div>
              <Button type="submit">Create scenario</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Request forecast</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={requestLiquidityForecastAction} className="grid gap-4 md:grid-cols-2">
            <input type="hidden" name="orgId" value="00000000-0000-0000-0000-000000000001" />
            <input type="hidden" name="actorUserId" value="00000000-0000-0000-0000-000000000002" />

            <div className="space-y-2">
              <Label htmlFor="liquidityScenarioId">Scenario ID</Label>
              <Input id="liquidityScenarioId" name="liquidityScenarioId" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cashPositionSnapshotId">Snapshot ID</Label>
              <Input id="cashPositionSnapshotId" name="cashPositionSnapshotId" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="forecastDate">Forecast date</Label>
              <Input id="forecastDate" name="forecastDate" type="date" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="startDate">Start date</Label>
              <Input id="startDate" name="startDate" type="date" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">End date</Label>
              <Input id="endDate" name="endDate" type="date" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bucketGranularity">Bucket granularity</Label>
              <Input id="bucketGranularity" name="bucketGranularity" defaultValue="daily" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="baseCurrencyCode">Base currency</Label>
              <Input id="baseCurrencyCode" name="baseCurrencyCode" defaultValue="USD" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sourceVersion">Source version</Label>
              <Input id="sourceVersion" name="sourceVersion" defaultValue="wave3-v1" required />
            </div>

            <div className="md:col-span-2">
              <Button type="submit">Calculate forecast</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Available scenarios</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {scenarios.map((row: any) => (
              <div key={row.id} className="rounded-xl border p-3 text-sm">
                {row.code} · {row.name} · {row.status}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <LiquidityForecastReport forecasts={forecasts} />
    </div>
  );
}
```

---

# 12. Tests

## `packages/core/src/erp/finance/treasury/__vitest_test__/cash-position-snapshot.service.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { CashPositionSnapshotService } from "../cash-position-snapshot.service";

describe("CashPositionSnapshotService", () => {
  it("calculates projected available balance from available and pending outflow", async () => {
    const inserted: any[] = [];

    const db = {
      query: {
        treasuryCashPositionSnapshotTable: {
          findFirst: async () => null,
        },
      },
      select: () => ({
        from: (table: any) => ({
          where: async () => {
            if (String(table).includes("treasury_bank_statement")) {
              return [
                {
                  id: "stmt-1",
                  bankAccountId: "ba-1",
                  currencyCode: "USD",
                  closingBalanceMinor: "1000",
                  sourceFileName: "demo.csv",
                },
              ];
            }

            return [
              {
                id: "pi-1",
                bankAccountId: "ba-1",
                currencyCode: "USD",
                amountMinor: "250",
                status: "approved",
              },
            ];
          },
          orderBy: async () => [],
        }),
      }),
      insert: () => ({
        values: async (value: any) => {
          inserted.push(value);
        },
      }),
    };

    const service = new CashPositionSnapshotService(db as any);

    const result = await service.request({
      orgId: "00000000-0000-0000-0000-000000000001",
      actorUserId: "00000000-0000-0000-0000-000000000002",
      correlationId: "corr-1",
      idempotencyKey: "idem-1",
      snapshotDate: "2026-03-12",
      asOfAt: "2026-03-12T10:00:00.000Z",
      baseCurrencyCode: "USD",
      sourceVersion: "wave3-v1",
    });

    expect(result.ok).toBe(true);
  });
});
```

---

## `packages/core/src/erp/finance/treasury/__vitest_test__/liquidity-forecast.service.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { LiquidityForecastService } from "../liquidity-forecast.service";

describe("LiquidityForecastService", () => {
  it("builds deterministic forecast buckets from scenario assumptions", async () => {
    const db = {
      query: {
        treasuryLiquidityScenarioTable: {
          findFirst: async () => ({
            id: "scenario-1",
            orgId: "org-1",
            assumptionSetVersion: "v1",
            assumptionsJson: {
              assumedDailyInflowsMinor: "100",
              assumedDailyOutflowsMinor: "50",
            },
          }),
        },
        treasuryCashPositionSnapshotTable: {
          findFirst: async () => ({
            id: "snapshot-1",
            orgId: "org-1",
            totalProjectedAvailableMinor: "1000",
          }),
        },
        treasuryLiquidityForecastTable: {
          findFirst: async () => null,
        },
      },
      insert: () => ({
        values: async () => undefined,
      }),
    };

    const service = new LiquidityForecastService(db as any);

    const result = await service.requestForecast({
      orgId: "org-1",
      actorUserId: "user-1",
      correlationId: "corr-1",
      idempotencyKey: "idem-1",
      liquidityScenarioId: "scenario-1",
      cashPositionSnapshotId: "snapshot-1",
      forecastDate: "2026-03-12",
      startDate: "2026-03-12",
      endDate: "2026-03-14",
      bucketGranularity: "daily",
      baseCurrencyCode: "USD",
      sourceVersion: "wave3-v1",
    });

    expect(result.ok).toBe(true);
  });
});
```

---

# 13. Index/barrel updates

## `packages/contracts/src/erp/finance/treasury/index.ts`

```ts
export * from "./shared";
export * from "./bank-account.entity";
export * from "./bank-account.commands";
export * from "./bank-statement.entity";
export * from "./bank-statement.commands";
export * from "./bank-statement-line.entity";
export * from "./reconciliation-session.entity";
export * from "./reconciliation-session.commands";
export * from "./treasury-payment-instruction.entity";
export * from "./treasury-payment-instruction.commands";
export * from "./treasury-payment-batch.entity";
export * from "./treasury-payment-batch.commands";
export * from "./cash-position-snapshot.entity";
export * from "./cash-position-snapshot.commands";
export * from "./liquidity-scenario.entity";
export * from "./liquidity-scenario.commands";
export * from "./liquidity-forecast.entity";
export * from "./liquidity-forecast.commands";
```

---

## `packages/db/src/schema/erp/finance/treasury/index.ts`

```ts
export * from "./bank-account.table";
export * from "./bank-statement.table";
export * from "./bank-statement-line.table";
export * from "./reconciliation-session.table";
export * from "./reconciliation-match.table";
export * from "./treasury-payment-instruction.table";
export * from "./treasury-payment-batch.table";
export * from "./treasury-payment-batch-item.table";
export * from "./cash-position-snapshot.table";
export * from "./liquidity-scenario.table";
export * from "./liquidity-forecast.table";
```

---

## `packages/core/src/erp/finance/treasury/index.ts`

```ts
export * from "./bank-account.service";
export * from "./bank-account.queries";
export * from "./bank-statement.service";
export * from "./bank-statement.queries";
export * from "./reconciliation-session.service";
export * from "./reconciliation-session.queries";
export * from "./treasury-payment-instruction.service";
export * from "./treasury-payment-instruction.queries";
export * from "./treasury-payment-batch.service";
export * from "./treasury-payment-batch.queries";
export * from "./cash-position-snapshot.service";
export * from "./cash-position-snapshot.queries";
export * from "./liquidity-forecast.service";
export * from "./liquidity-forecast.queries";
```

---

# 14. Migration starter

## `packages/db/drizzle/<timestamp>_treasury_cash_position_snapshot.sql`

```sql
CREATE TABLE treasury_cash_position_snapshot (
  id uuid PRIMARY KEY,
  org_id uuid NOT NULL,
  snapshot_date date NOT NULL,
  as_of_at timestamptz NOT NULL,
  base_currency_code text NOT NULL,
  status text NOT NULL,
  source_version text NOT NULL,
  total_book_balance_minor text NOT NULL,
  total_available_balance_minor text NOT NULL,
  total_pending_inflow_minor text NOT NULL,
  total_pending_outflow_minor text NOT NULL,
  total_projected_available_minor text NOT NULL,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);

CREATE TABLE treasury_cash_position_snapshot_line (
  id uuid PRIMARY KEY,
  org_id uuid NOT NULL,
  snapshot_id uuid NOT NULL,
  bank_account_id uuid,
  currency_code text NOT NULL,
  bucket_type text NOT NULL,
  amount_minor text NOT NULL,
  source_type text NOT NULL,
  source_id uuid,
  line_description text,
  created_at timestamptz NOT NULL
);
```

---

## `packages/db/drizzle/<timestamp>_treasury_liquidity_forecast.sql`

```sql
CREATE TABLE treasury_liquidity_scenario (
  id uuid PRIMARY KEY,
  org_id uuid NOT NULL,
  code text NOT NULL,
  name text NOT NULL,
  scenario_type text NOT NULL,
  status text NOT NULL,
  horizon_days integer NOT NULL,
  assumption_set_version text NOT NULL,
  assumptions_json jsonb NOT NULL,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);

CREATE TABLE treasury_liquidity_forecast (
  id uuid PRIMARY KEY,
  org_id uuid NOT NULL,
  liquidity_scenario_id uuid NOT NULL,
  cash_position_snapshot_id uuid NOT NULL,
  forecast_date date NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  bucket_granularity text NOT NULL,
  base_currency_code text NOT NULL,
  status text NOT NULL,
  source_version text NOT NULL,
  assumption_set_version text NOT NULL,
  opening_liquidity_minor text NOT NULL,
  closing_liquidity_minor text NOT NULL,
  total_expected_inflows_minor text NOT NULL,
  total_expected_outflows_minor text NOT NULL,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);

CREATE TABLE treasury_liquidity_forecast_bucket (
  id uuid PRIMARY KEY,
  org_id uuid NOT NULL,
  liquidity_forecast_id uuid NOT NULL,
  bucket_index integer NOT NULL,
  bucket_start_date date NOT NULL,
  bucket_end_date date NOT NULL,
  expected_inflows_minor text NOT NULL,
  expected_outflows_minor text NOT NULL,
  opening_balance_minor text NOT NULL,
  closing_balance_minor text NOT NULL,
  variance_minor text,
  created_at timestamptz NOT NULL
);
```

---

# 15. Cross-cutting registry additions

## Permissions

```ts
"erp.finance.treasury.cash-position.read"
"erp.finance.treasury.cash-position.manage"
"erp.finance.treasury.liquidity-scenario.read"
"erp.finance.treasury.liquidity-scenario.manage"
"erp.finance.treasury.liquidity-forecast.read"
"erp.finance.treasury.liquidity-forecast.manage"
```

## Audit actions

```ts
"treasury.cash-position-snapshot.request"
"treasury.cash-position-snapshot.calculate"
"treasury.liquidity-scenario.create"
"treasury.liquidity-scenario.activate"
"treasury.liquidity-forecast.request"
"treasury.liquidity-forecast.calculate"
```

## Error codes

```ts
TREASURY_CASH_POSITION_SNAPSHOT_NOT_FOUND
TREASURY_LIQUIDITY_SCENARIO_NOT_FOUND
TREASURY_LIQUIDITY_SCENARIO_CODE_EXISTS
TREASURY_LIQUIDITY_FORECAST_NOT_FOUND
TREASURY_LIQUIDITY_FORECAST_INVALID_DATE_RANGE
TREASURY_LIQUIDITY_FORECAST_INVALID_GRANULARITY
```

## Outbox events

```ts
treasury.cash-position-snapshot.calculated
treasury.liquidity-scenario.created
treasury.liquidity-scenario.activated
treasury.liquidity-forecast.calculated
```

---

# 16. What this Wave 3 gives you

Per your scaffold, Wave 3 is supposed to deliver:

* cash position snapshots
* liquidity forecasts
* reproducible outputs
* traceable assumptions
* org/currency rollups 

This scaffold gives you exactly that baseline:

## Sprint 3.1

* persistent as-of cash position snapshot
* line-level source attribution
* totals derived from source lines
* reproducibility through `sourceVersion + asOfAt`

## Sprint 3.2

* versioned liquidity scenarios
* scenario activation
* forecast generation from snapshot + assumptions
* bucket-level forecast persistence
* deterministic output for the same scenario/snapshot/version

---

# 17. My architecture advice for AFENDA specifically

This is the most important hardening step after you drop this in:

Do not let Wave 3 become a “math page.”

For AFENDA, cash position and liquidity forecast should preserve **truth lineage**:

* which bank statement rows contributed
* which payment instructions contributed
* which scenario assumptions were active
* which forecast version used which snapshot version
* which actor requested which calculation
* which output was later superseded

That means your real northstar should be:

* **append-only derived facts**
* **supersedable projections**
* **never-overwrite model lineage**

That aligns with your “not features, but truth” direction.

The user-uploaded scaffold is a strong backbone for this phased delivery and explicitly positions Wave 3 as the bridge from operational treasury into forecastable liquidity intelligence. 

Next best step is **Wave 3.1 hardening**, specifically:

* snapshot source adapters for AP due payments
* AR expected receipts feed
* FX normalization seam
* variance backtesting against later actuals

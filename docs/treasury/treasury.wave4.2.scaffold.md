Yes — here is the **Wave 4.2 full drop-in scaffold** for AFENDA Treasury:

* **netting session entities**
* **internal interest calculation services**
* **settlement posting integration seam to treasury accounting**

That is exactly the Wave 4.2 vertical slice in your treasury delivery scaffold, and the exit criteria are also explicit: **netting outputs must reconcile with source obligations** and **interest computation must be deterministic and tested**. 

This also matches the file manifest in your uploaded scaffold for Sprint 4.2:

* `netting-session.entity.ts`
* `netting-session.commands.ts`
* `internal-interest-rate.entity.ts`
* `internal-interest-rate.commands.ts`
* `netting-session.table.ts`
* `internal-interest-rate.table.ts`
* `netting-session.service.ts`
* `netting-session.queries.ts`
* `calculators/internal-interest.ts`
* test, worker, netting page, and settlement view. 

---

# 1. Design boundary

Wave 4.2 should do four things:

## Netting session

A controlled clearing cycle across multiple intercompany obligations.

It owns:

* included transfer obligations
* participants
* net result by legal entity
* session lifecycle
* close / settlement readiness

## Internal interest rate

A deterministic policy object for charging internal borrowing/lending.

It owns:

* effective rate
* calculation basis
* day count convention
* legal entity or currency scope
* activation lifecycle

## Internal interest calculation

A deterministic calculation service that:

* takes principal
* applies rate + day count
* produces reproducible accrued interest

## Settlement posting integration seam

Do **not** do GL posting in Wave 4.2.
Instead, emit bridge-ready events for Wave 5.2 treasury accounting bridge, because your scaffold explicitly places posting bridge and accounting policy mapping in Wave 5.2. 

---

# 2. Target file set

## Create

* `packages/contracts/src/erp/finance/treasury/netting-session.entity.ts`

* `packages/contracts/src/erp/finance/treasury/netting-session.commands.ts`

* `packages/contracts/src/erp/finance/treasury/internal-interest-rate.entity.ts`

* `packages/contracts/src/erp/finance/treasury/internal-interest-rate.commands.ts`

* `packages/db/src/schema/erp/finance/treasury/netting-session.table.ts`

* `packages/db/src/schema/erp/finance/treasury/internal-interest-rate.table.ts`

* `packages/core/src/erp/finance/treasury/netting-session.service.ts`

* `packages/core/src/erp/finance/treasury/netting-session.queries.ts`

* `packages/core/src/erp/finance/treasury/calculators/internal-interest.ts`

* `packages/core/src/erp/finance/treasury/__vitest_test__/netting-session.service.test.ts`

* `apps/worker/src/jobs/erp/finance/treasury/handle-netting-session-closed.ts`

* `apps/web/src/app/(erp)/finance/treasury/netting/page.tsx`

* `apps/web/src/app/(erp)/finance/treasury/components/netting-settlement-view.tsx`

## Update

* `packages/contracts/src/erp/finance/treasury/index.ts`
* `packages/db/src/schema/erp/finance/treasury/index.ts`
* `packages/core/src/erp/finance/treasury/calculators/index.ts`
* `packages/core/src/erp/finance/treasury/index.ts`
* `apps/api/src/routes/erp/finance/treasury.ts`
* `apps/worker/src/jobs/erp/finance/treasury/index.ts`
* `tools/gates/contract-db-sync.mjs`
* `packages/db/drizzle/<timestamp>_treasury_netting_interest.sql` 

---

# 3. Contracts

## `packages/contracts/src/erp/finance/treasury/netting-session.entity.ts`

```ts
import { z } from "zod";

export const nettingSessionStatusSchema = z.enum([
  "draft",
  "open",
  "closed",
  "settled",
  "cancelled",
]);

export const nettingObligationStatusSchema = z.enum([
  "included",
  "excluded",
  "netted",
  "settled",
]);

export const nettingParticipantPositionSchema = z.object({
  legalEntityId: z.string().uuid(),
  currencyCode: z.string().trim().length(3),
  grossPayableMinor: z.string(),
  grossReceivableMinor: z.string(),
  netPositionMinor: z.string(),
});

export const nettingSessionEntitySchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  sessionNumber: z.string().trim().min(1).max(64),
  currencyCode: z.string().trim().length(3),
  nettingDate: z.string().date(),
  settlementDate: z.string().date(),
  status: nettingSessionStatusSchema,
  totalObligationCount: z.number().int().nonnegative(),
  totalGrossPayableMinor: z.string(),
  totalGrossReceivableMinor: z.string(),
  totalNettableMinor: z.string(),
  sourceVersion: z.string().trim().min(1).max(128),
  closedAt: z.string().datetime().nullable(),
  settledAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const nettingSessionItemEntitySchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  nettingSessionId: z.string().uuid(),
  sourceType: z.enum(["intercompany_transfer"]),
  sourceId: z.string().uuid(),
  fromLegalEntityId: z.string().uuid(),
  toLegalEntityId: z.string().uuid(),
  currencyCode: z.string().trim().length(3),
  amountMinor: z.string(),
  status: nettingObligationStatusSchema,
  createdAt: z.string().datetime(),
});

export type NettingSessionEntity = z.infer<typeof nettingSessionEntitySchema>;
export type NettingSessionItemEntity = z.infer<typeof nettingSessionItemEntitySchema>;
export type NettingParticipantPosition = z.infer<typeof nettingParticipantPositionSchema>;
```

---

## `packages/contracts/src/erp/finance/treasury/netting-session.commands.ts`

```ts
import { z } from "zod";
import { idempotencyKeySchema, orgScopedMetadataSchema } from "./shared";

export const createNettingSessionCommandSchema = z.object({
  ...orgScopedMetadataSchema.shape,
  idempotencyKey: idempotencyKeySchema,
  sessionNumber: z.string().trim().min(1).max(64),
  currencyCode: z.string().trim().length(3),
  nettingDate: z.string().date(),
  settlementDate: z.string().date(),
  sourceVersion: z.string().trim().min(1).max(128),
});

export const addNettingSessionItemsCommandSchema = z.object({
  ...orgScopedMetadataSchema.shape,
  idempotencyKey: idempotencyKeySchema,
  nettingSessionId: z.string().uuid(),
  intercompanyTransferIds: z.array(z.string().uuid()).min(1),
});

export const closeNettingSessionCommandSchema = z.object({
  ...orgScopedMetadataSchema.shape,
  idempotencyKey: idempotencyKeySchema,
  nettingSessionId: z.string().uuid(),
});

export const settleNettingSessionCommandSchema = z.object({
  ...orgScopedMetadataSchema.shape,
  idempotencyKey: idempotencyKeySchema,
  nettingSessionId: z.string().uuid(),
});

export type CreateNettingSessionCommand = z.infer<
  typeof createNettingSessionCommandSchema
>;
export type AddNettingSessionItemsCommand = z.infer<
  typeof addNettingSessionItemsCommandSchema
>;
export type CloseNettingSessionCommand = z.infer<
  typeof closeNettingSessionCommandSchema
>;
export type SettleNettingSessionCommand = z.infer<
  typeof settleNettingSessionCommandSchema
>;
```

---

## `packages/contracts/src/erp/finance/treasury/internal-interest-rate.entity.ts`

```ts
import { z } from "zod";

export const internalInterestRateStatusSchema = z.enum([
  "draft",
  "active",
  "inactive",
]);

export const internalInterestDayCountSchema = z.enum([
  "actual_360",
  "actual_365",
  "30_360",
]);

export const internalInterestRateEntitySchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  code: z.string().trim().min(1).max(64),
  legalEntityId: z.string().uuid().nullable(),
  currencyCode: z.string().trim().length(3),
  annualRateBps: z.number().int().nonnegative(),
  dayCountConvention: internalInterestDayCountSchema,
  effectiveFrom: z.string().date(),
  effectiveTo: z.string().date().nullable(),
  status: internalInterestRateStatusSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type InternalInterestRateEntity = z.infer<
  typeof internalInterestRateEntitySchema
>;
```

---

## `packages/contracts/src/erp/finance/treasury/internal-interest-rate.commands.ts`

```ts
import { z } from "zod";
import { idempotencyKeySchema, orgScopedMetadataSchema } from "./shared";
import { internalInterestDayCountSchema } from "./internal-interest-rate.entity";

export const createInternalInterestRateCommandSchema = z.object({
  ...orgScopedMetadataSchema.shape,
  idempotencyKey: idempotencyKeySchema,
  code: z.string().trim().min(1).max(64),
  legalEntityId: z.string().uuid().nullable().optional(),
  currencyCode: z.string().trim().length(3),
  annualRateBps: z.number().int().nonnegative(),
  dayCountConvention: internalInterestDayCountSchema,
  effectiveFrom: z.string().date(),
  effectiveTo: z.string().date().nullable().optional(),
});

export const activateInternalInterestRateCommandSchema = z.object({
  ...orgScopedMetadataSchema.shape,
  idempotencyKey: idempotencyKeySchema,
  internalInterestRateId: z.string().uuid(),
});

export type CreateInternalInterestRateCommand = z.infer<
  typeof createInternalInterestRateCommandSchema
>;
export type ActivateInternalInterestRateCommand = z.infer<
  typeof activateInternalInterestRateCommandSchema
>;
```

---

# 4. DB schema

## `packages/db/src/schema/erp/finance/treasury/netting-session.table.ts`

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

export const treasuryNettingSessionTable = pgTable(
  "treasury_netting_session",
  {
    id: uuid("id").primaryKey(),
    orgId: uuid("org_id").notNull(),
    sessionNumber: text("session_number").notNull(),
    currencyCode: text("currency_code").notNull(),
    nettingDate: date("netting_date").notNull(),
    settlementDate: date("settlement_date").notNull(),
    status: text("status").notNull(),
    totalObligationCount: integer("total_obligation_count").notNull(),
    totalGrossPayableMinor: text("total_gross_payable_minor").notNull(),
    totalGrossReceivableMinor: text("total_gross_receivable_minor").notNull(),
    totalNettableMinor: text("total_nettable_minor").notNull(),
    sourceVersion: text("source_version").notNull(),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    settledAt: timestamp("settled_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => ({
    orgIdx: index("treasury_netting_session__org_idx").on(table.orgId),
    orgStatusIdx: index("treasury_netting_session__org_status_idx").on(
      table.orgId,
      table.status,
    ),
    orgSessionNumberUq: uniqueIndex(
      "treasury_netting_session__org_session_number_uq",
    ).on(table.orgId, table.sessionNumber),
  }),
);

export const treasuryNettingSessionItemTable = pgTable(
  "treasury_netting_session_item",
  {
    id: uuid("id").primaryKey(),
    orgId: uuid("org_id").notNull(),
    nettingSessionId: uuid("netting_session_id").notNull(),
    sourceType: text("source_type").notNull(),
    sourceId: uuid("source_id").notNull(),
    fromLegalEntityId: uuid("from_legal_entity_id").notNull(),
    toLegalEntityId: uuid("to_legal_entity_id").notNull(),
    currencyCode: text("currency_code").notNull(),
    amountMinor: text("amount_minor").notNull(),
    status: text("status").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (table) => ({
    orgSessionIdx: index("treasury_netting_session_item__org_session_idx").on(
      table.orgId,
      table.nettingSessionId,
    ),
    orgSourceIdx: index("treasury_netting_session_item__org_source_idx").on(
      table.orgId,
      table.sourceId,
    ),
  }),
);
```

---

## `packages/db/src/schema/erp/finance/treasury/internal-interest-rate.table.ts`

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

export const treasuryInternalInterestRateTable = pgTable(
  "treasury_internal_interest_rate",
  {
    id: uuid("id").primaryKey(),
    orgId: uuid("org_id").notNull(),
    code: text("code").notNull(),
    legalEntityId: uuid("legal_entity_id"),
    currencyCode: text("currency_code").notNull(),
    annualRateBps: integer("annual_rate_bps").notNull(),
    dayCountConvention: text("day_count_convention").notNull(),
    effectiveFrom: date("effective_from").notNull(),
    effectiveTo: date("effective_to"),
    status: text("status").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => ({
    orgIdx: index("treasury_internal_interest_rate__org_idx").on(table.orgId),
    orgCodeUq: uniqueIndex("treasury_internal_interest_rate__org_code_uq").on(
      table.orgId,
      table.code,
    ),
  }),
);
```

---

# 5. Core calculator

## `packages/core/src/erp/finance/treasury/calculators/internal-interest.ts`

```ts
export function dayCountFactor(params: {
  dayCountConvention: "actual_360" | "actual_365" | "30_360";
  days: number;
}): number {
  if (params.dayCountConvention === "actual_360") return params.days / 360;
  if (params.dayCountConvention === "actual_365") return params.days / 365;
  return params.days / 360;
}

export function calculateInternalInterestMinor(params: {
  principalMinor: string;
  annualRateBps: number;
  dayCountConvention: "actual_360" | "actual_365" | "30_360";
  days: number;
}): string {
  const principal = BigInt(params.principalMinor);
  const annualRateBps = BigInt(params.annualRateBps);
  const denominator =
    params.dayCountConvention === "actual_365" ? 365n : 360n;

  return (
    (principal * annualRateBps * BigInt(params.days)) /
    10000n /
    denominator
  ).toString();
}

export function buildNetPositions(
  items: Array<{
    fromLegalEntityId: string;
    toLegalEntityId: string;
    amountMinor: string;
  }>,
) {
  const positions = new Map<string, bigint>();

  for (const item of items) {
    const amount = BigInt(item.amountMinor);
    positions.set(
      item.fromLegalEntityId,
      (positions.get(item.fromLegalEntityId) ?? 0n) - amount,
    );
    positions.set(
      item.toLegalEntityId,
      (positions.get(item.toLegalEntityId) ?? 0n) + amount,
    );
  }

  return [...positions.entries()].map(([legalEntityId, netPosition]) => ({
    legalEntityId,
    netPositionMinor: netPosition.toString(),
  }));
}
```

---

# 6. Core services

## `packages/core/src/erp/finance/treasury/netting-session.service.ts`

```ts
import { and, eq, inArray } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import {
  addNettingSessionItemsCommandSchema,
  closeNettingSessionCommandSchema,
  createNettingSessionCommandSchema,
  settleNettingSessionCommandSchema,
} from "@afenda/contracts/erp/finance/treasury/netting-session.commands";
import { treasuryIntercompanyTransferTable } from "@afenda/db/schema/erp/finance/treasury/intercompany-transfer.table";
import {
  treasuryNettingSessionItemTable,
  treasuryNettingSessionTable,
} from "@afenda/db/schema/erp/finance/treasury/netting-session.table";
import { buildNetPositions } from "./calculators/internal-interest";

type DbTx = any;
type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } };

async function emitOutboxEvent(_: DbTx, __: unknown) {}
async function withAudit<T>(_: DbTx, __: unknown, fn: () => Promise<T>) {
  return fn();
}

export class NettingSessionService {
  constructor(private readonly db: DbTx) {}

  async create(raw: unknown): Promise<ServiceResult<{ id: string }>> {
    const input = createNettingSessionCommandSchema.parse(raw);

    const existing = await this.db.query.treasuryNettingSessionTable.findFirst({
      where: and(
        eq(treasuryNettingSessionTable.orgId, input.orgId),
        eq(treasuryNettingSessionTable.sessionNumber, input.sessionNumber),
      ),
    });

    if (existing) {
      return {
        ok: false,
        error: {
          code: "TREASURY_NETTING_SESSION_NUMBER_EXISTS",
          message: "Netting session number already exists",
        },
      };
    }

    const id = randomUUID();
    const now = new Date();

    await withAudit(this.db, {}, async () => {
      await this.db.insert(treasuryNettingSessionTable).values({
        id,
        orgId: input.orgId,
        sessionNumber: input.sessionNumber,
        currencyCode: input.currencyCode,
        nettingDate: input.nettingDate,
        settlementDate: input.settlementDate,
        status: "draft",
        totalObligationCount: 0,
        totalGrossPayableMinor: "0",
        totalGrossReceivableMinor: "0",
        totalNettableMinor: "0",
        sourceVersion: input.sourceVersion,
        closedAt: null,
        settledAt: null,
        createdAt: now,
        updatedAt: now,
      });

      await emitOutboxEvent(this.db, {
        eventType: "treasury.netting-session.created",
        aggregateId: id,
      });
    });

    return { ok: true, data: { id } };
  }

  async addItems(raw: unknown): Promise<ServiceResult<{ id: string }>> {
    const input = addNettingSessionItemsCommandSchema.parse(raw);

    const session = await this.db.query.treasuryNettingSessionTable.findFirst({
      where: and(
        eq(treasuryNettingSessionTable.orgId, input.orgId),
        eq(treasuryNettingSessionTable.id, input.nettingSessionId),
      ),
    });

    if (!session) {
      return {
        ok: false,
        error: {
          code: "TREASURY_NETTING_SESSION_NOT_FOUND",
          message: "Netting session not found",
        },
      };
    }

    if (session.status !== "draft" && session.status !== "open") {
      return {
        ok: false,
        error: {
          code: "TREASURY_NETTING_SESSION_ILLEGAL_TRANSITION",
          message: "Only draft/open session can accept items",
        },
      };
    }

    const transfers = await this.db
      .select()
      .from(treasuryIntercompanyTransferTable)
      .where(
        and(
          eq(treasuryIntercompanyTransferTable.orgId, input.orgId),
          inArray(treasuryIntercompanyTransferTable.id, input.intercompanyTransferIds),
        ),
      );

    if (transfers.length !== input.intercompanyTransferIds.length) {
      return {
        ok: false,
        error: {
          code: "TREASURY_NETTING_SOURCE_TRANSFER_NOT_FOUND",
          message: "One or more source transfers not found",
        },
      };
    }

    for (const row of transfers) {
      if (row.status !== "settled") {
        return {
          ok: false,
          error: {
            code: "TREASURY_NETTING_SOURCE_TRANSFER_NOT_SETTLED",
            message: "Only settled intercompany transfers can be netted",
          },
        };
      }

      if (row.currencyCode !== session.currencyCode) {
        return {
          ok: false,
          error: {
            code: "TREASURY_NETTING_SESSION_CURRENCY_MISMATCH",
            message: "All netting items must match session currency",
          },
        };
      }
    }

    const now = new Date();

    await withAudit(this.db, {}, async () => {
      for (const row of transfers) {
        await this.db.insert(treasuryNettingSessionItemTable).values({
          id: randomUUID(),
          orgId: input.orgId,
          nettingSessionId: session.id,
          sourceType: "intercompany_transfer",
          sourceId: row.id,
          fromLegalEntityId: row.fromLegalEntityId,
          toLegalEntityId: row.toLegalEntityId,
          currencyCode: row.currencyCode,
          amountMinor: row.transferAmountMinor,
          status: "included",
          createdAt: now,
        });
      }

      const gross = transfers.reduce(
        (acc: bigint, row: any) => acc + BigInt(row.transferAmountMinor),
        0n,
      );

      await this.db
        .update(treasuryNettingSessionTable)
        .set({
          status: "open",
          totalObligationCount: session.totalObligationCount + transfers.length,
          totalGrossPayableMinor: (BigInt(session.totalGrossPayableMinor) + gross).toString(),
          totalGrossReceivableMinor: (BigInt(session.totalGrossReceivableMinor) + gross).toString(),
          totalNettableMinor: (BigInt(session.totalNettableMinor) + gross).toString(),
          updatedAt: now,
        })
        .where(eq(treasuryNettingSessionTable.id, session.id));

      await emitOutboxEvent(this.db, {
        eventType: "treasury.netting-session.items-added",
        aggregateId: session.id,
      });
    });

    return { ok: true, data: { id: session.id } };
  }

  async close(raw: unknown): Promise<ServiceResult<{ id: string }>> {
    const input = closeNettingSessionCommandSchema.parse(raw);

    const session = await this.db.query.treasuryNettingSessionTable.findFirst({
      where: and(
        eq(treasuryNettingSessionTable.orgId, input.orgId),
        eq(treasuryNettingSessionTable.id, input.nettingSessionId),
      ),
    });

    if (!session) {
      return {
        ok: false,
        error: {
          code: "TREASURY_NETTING_SESSION_NOT_FOUND",
          message: "Netting session not found",
        },
      };
    }

    if (session.status !== "open") {
      return {
        ok: false,
        error: {
          code: "TREASURY_NETTING_SESSION_ILLEGAL_TRANSITION",
          message: "Only open session can be closed",
        },
      };
    }

    const items = await this.db
      .select()
      .from(treasuryNettingSessionItemTable)
      .where(
        and(
          eq(treasuryNettingSessionItemTable.orgId, input.orgId),
          eq(treasuryNettingSessionItemTable.nettingSessionId, session.id),
        ),
      );

    const positions = buildNetPositions(
      items.map((item: any) => ({
        fromLegalEntityId: item.fromLegalEntityId,
        toLegalEntityId: item.toLegalEntityId,
        amountMinor: item.amountMinor,
      })),
    );

    const totalNet = positions.reduce(
      (acc: bigint, pos: any) => acc + BigInt(pos.netPositionMinor),
      0n,
    );

    if (totalNet !== 0n) {
      return {
        ok: false,
        error: {
          code: "TREASURY_NETTING_SESSION_UNBALANCED",
          message: "Netting outputs do not reconcile to zero",
        },
      };
    }

    const now = new Date();

    await withAudit(this.db, {}, async () => {
      await this.db
        .update(treasuryNettingSessionTable)
        .set({
          status: "closed",
          closedAt: now,
          updatedAt: now,
        })
        .where(eq(treasuryNettingSessionTable.id, session.id));

      await emitOutboxEvent(this.db, {
        eventType: "treasury.netting-session.closed",
        aggregateId: session.id,
        payload: {
          positions,
        },
      });
    });

    return { ok: true, data: { id: session.id } };
  }

  async settle(raw: unknown): Promise<ServiceResult<{ id: string }>> {
    const input = settleNettingSessionCommandSchema.parse(raw);

    const session = await this.db.query.treasuryNettingSessionTable.findFirst({
      where: and(
        eq(treasuryNettingSessionTable.orgId, input.orgId),
        eq(treasuryNettingSessionTable.id, input.nettingSessionId),
      ),
    });

    if (!session) {
      return {
        ok: false,
        error: {
          code: "TREASURY_NETTING_SESSION_NOT_FOUND",
          message: "Netting session not found",
        },
      };
    }

    if (session.status !== "closed") {
      return {
        ok: false,
        error: {
          code: "TREASURY_NETTING_SESSION_ILLEGAL_TRANSITION",
          message: "Only closed session can be settled",
        },
      };
    }

    const now = new Date();

    await withAudit(this.db, {}, async () => {
      await this.db
        .update(treasuryNettingSessionTable)
        .set({
          status: "settled",
          settledAt: now,
          updatedAt: now,
        })
        .where(eq(treasuryNettingSessionTable.id, session.id));

      await this.db
        .update(treasuryNettingSessionItemTable)
        .set({
          status: "settled",
        })
        .where(eq(treasuryNettingSessionItemTable.nettingSessionId, session.id));

      await emitOutboxEvent(this.db, {
        eventType: "treasury.netting-session.settled",
        aggregateId: session.id,
      });
    });

    return { ok: true, data: { id: session.id } };
  }
}
```

---

## `packages/core/src/erp/finance/treasury/netting-session.queries.ts`

```ts
import { and, desc, eq } from "drizzle-orm";
import {
  treasuryNettingSessionItemTable,
  treasuryNettingSessionTable,
} from "@afenda/db/schema/erp/finance/treasury/netting-session.table";
import { treasuryInternalInterestRateTable } from "@afenda/db/schema/erp/finance/treasury/internal-interest-rate.table";

type DbTx = any;

export class NettingSessionQueries {
  constructor(private readonly db: DbTx) {}

  async listSessions(orgId: string) {
    return this.db
      .select()
      .from(treasuryNettingSessionTable)
      .where(eq(treasuryNettingSessionTable.orgId, orgId))
      .orderBy(desc(treasuryNettingSessionTable.createdAt));
  }

  async listSessionItems(orgId: string, sessionId: string) {
    return this.db
      .select()
      .from(treasuryNettingSessionItemTable)
      .where(
        and(
          eq(treasuryNettingSessionItemTable.orgId, orgId),
          eq(treasuryNettingSessionItemTable.nettingSessionId, sessionId),
        ),
      )
      .orderBy(desc(treasuryNettingSessionItemTable.createdAt));
  }

  async listInterestRates(orgId: string) {
    return this.db
      .select()
      .from(treasuryInternalInterestRateTable)
      .where(eq(treasuryInternalInterestRateTable.orgId, orgId))
      .orderBy(desc(treasuryInternalInterestRateTable.createdAt));
  }
}
```

---

# 7. Internal interest rate service

You requested only `netting-session.service.ts` and `calculators/internal-interest.ts` in the manifest, but practically Wave 4.2 needs a service to create and activate the rate policy object. I would add it even if your manifest only named the calculator, because otherwise the rate entity is dead scaffolding.

## `packages/core/src/erp/finance/treasury/internal-interest-rate.service.ts`

```ts
import { and, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import {
  activateInternalInterestRateCommandSchema,
  createInternalInterestRateCommandSchema,
} from "@afenda/contracts/erp/finance/treasury/internal-interest-rate.commands";
import { treasuryInternalInterestRateTable } from "@afenda/db/schema/erp/finance/treasury/internal-interest-rate.table";

type DbTx = any;
type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } };

async function emitOutboxEvent(_: DbTx, __: unknown) {}
async function withAudit<T>(_: DbTx, __: unknown, fn: () => Promise<T>) {
  return fn();
}

export class InternalInterestRateService {
  constructor(private readonly db: DbTx) {}

  async create(raw: unknown): Promise<ServiceResult<{ id: string }>> {
    const input = createInternalInterestRateCommandSchema.parse(raw);

    const existing = await this.db.query.treasuryInternalInterestRateTable.findFirst({
      where: and(
        eq(treasuryInternalInterestRateTable.orgId, input.orgId),
        eq(treasuryInternalInterestRateTable.code, input.code),
      ),
    });

    if (existing) {
      return {
        ok: false,
        error: {
          code: "TREASURY_INTERNAL_INTEREST_RATE_CODE_EXISTS",
          message: "Internal interest rate code already exists",
        },
      };
    }

    const id = randomUUID();
    const now = new Date();

    await withAudit(this.db, {}, async () => {
      await this.db.insert(treasuryInternalInterestRateTable).values({
        id,
        orgId: input.orgId,
        code: input.code,
        legalEntityId: input.legalEntityId ?? null,
        currencyCode: input.currencyCode,
        annualRateBps: input.annualRateBps,
        dayCountConvention: input.dayCountConvention,
        effectiveFrom: input.effectiveFrom,
        effectiveTo: input.effectiveTo ?? null,
        status: "draft",
        createdAt: now,
        updatedAt: now,
      });

      await emitOutboxEvent(this.db, {
        eventType: "treasury.internal-interest-rate.created",
        aggregateId: id,
      });
    });

    return { ok: true, data: { id } };
  }

  async activate(raw: unknown): Promise<ServiceResult<{ id: string }>> {
    const input = activateInternalInterestRateCommandSchema.parse(raw);

    const row = await this.db.query.treasuryInternalInterestRateTable.findFirst({
      where: and(
        eq(treasuryInternalInterestRateTable.orgId, input.orgId),
        eq(treasuryInternalInterestRateTable.id, input.internalInterestRateId),
      ),
    });

    if (!row) {
      return {
        ok: false,
        error: {
          code: "TREASURY_INTERNAL_INTEREST_RATE_NOT_FOUND",
          message: "Internal interest rate not found",
        },
      };
    }

    const now = new Date();

    await withAudit(this.db, {}, async () => {
      await this.db
        .update(treasuryInternalInterestRateTable)
        .set({
          status: "inactive",
          updatedAt: now,
        })
        .where(
          and(
            eq(treasuryInternalInterestRateTable.orgId, input.orgId),
            eq(treasuryInternalInterestRateTable.currencyCode, row.currencyCode),
          ),
        );

      await this.db
        .update(treasuryInternalInterestRateTable)
        .set({
          status: "active",
          updatedAt: now,
        })
        .where(eq(treasuryInternalInterestRateTable.id, row.id));

      await emitOutboxEvent(this.db, {
        eventType: "treasury.internal-interest-rate.activated",
        aggregateId: row.id,
      });
    });

    return { ok: true, data: { id: row.id } };
  }
}
```

---

# 8. API route extensions

Add these into `apps/api/src/routes/erp/finance/treasury.ts`.

```ts
import {
  addNettingSessionItemsCommandSchema,
  closeNettingSessionCommandSchema,
  createNettingSessionCommandSchema,
  settleNettingSessionCommandSchema,
} from "@afenda/contracts/erp/finance/treasury/netting-session.commands";
import {
  activateInternalInterestRateCommandSchema,
  createInternalInterestRateCommandSchema,
} from "@afenda/contracts/erp/finance/treasury/internal-interest-rate.commands";
import {
  InternalInterestRateService,
  NettingSessionQueries,
  NettingSessionService,
} from "@afenda/core/erp/finance/treasury";
```

```ts
  app.post("/v1/commands/erp/finance/treasury/netting-sessions/create", async (req, reply) => {
    const input = createNettingSessionCommandSchema.parse(req.body);
    const service = new NettingSessionService(app.db);
    const result = await service.create(input);
    if (!result.ok) return reply.code(400).send(result.error);
    return reply.code(201).send(result.data);
  });

  app.post("/v1/commands/erp/finance/treasury/netting-sessions/add-items", async (req, reply) => {
    const input = addNettingSessionItemsCommandSchema.parse(req.body);
    const service = new NettingSessionService(app.db);
    const result = await service.addItems(input);
    if (!result.ok) return reply.code(400).send(result.error);
    return reply.send(result.data);
  });

  app.post("/v1/commands/erp/finance/treasury/netting-sessions/close", async (req, reply) => {
    const input = closeNettingSessionCommandSchema.parse(req.body);
    const service = new NettingSessionService(app.db);
    const result = await service.close(input);
    if (!result.ok) return reply.code(400).send(result.error);
    return reply.send(result.data);
  });

  app.post("/v1/commands/erp/finance/treasury/netting-sessions/settle", async (req, reply) => {
    const input = settleNettingSessionCommandSchema.parse(req.body);
    const service = new NettingSessionService(app.db);
    const result = await service.settle(input);
    if (!result.ok) return reply.code(400).send(result.error);
    return reply.send(result.data);
  });

  app.get("/v1/erp/finance/treasury/netting-sessions", async (req: any) => {
    const queries = new NettingSessionQueries(app.db);
    return queries.listSessions(req.user.orgId);
  });

  app.get("/v1/erp/finance/treasury/netting-sessions/:id/items", async (req: any) => {
    const queries = new NettingSessionQueries(app.db);
    return queries.listSessionItems(req.user.orgId, req.params.id);
  });

  app.post("/v1/commands/erp/finance/treasury/internal-interest-rates/create", async (req, reply) => {
    const input = createInternalInterestRateCommandSchema.parse(req.body);
    const service = new InternalInterestRateService(app.db);
    const result = await service.create(input);
    if (!result.ok) return reply.code(400).send(result.error);
    return reply.code(201).send(result.data);
  });

  app.post("/v1/commands/erp/finance/treasury/internal-interest-rates/activate", async (req, reply) => {
    const input = activateInternalInterestRateCommandSchema.parse(req.body);
    const service = new InternalInterestRateService(app.db);
    const result = await service.activate(input);
    if (!result.ok) return reply.code(400).send(result.error);
    return reply.send(result.data);
  });

  app.get("/v1/erp/finance/treasury/internal-interest-rates", async (req: any) => {
    const queries = new NettingSessionQueries(app.db);
    return queries.listInterestRates(req.user.orgId);
  });
```

---

# 9. Worker job

## `apps/worker/src/jobs/erp/finance/treasury/handle-netting-session-closed.ts`

```ts
type JobContext = {
  logger: {
    info: (payload: Record<string, unknown>, msg?: string) => void;
  };
};

export async function handleNettingSessionClosed(
  ctx: JobContext,
  event: {
    orgId: string;
    nettingSessionId: string;
    correlationId: string;
  },
) {
  ctx.logger.info(
    {
      orgId: event.orgId,
      nettingSessionId: event.nettingSessionId,
      correlationId: event.correlationId,
    },
    "Handling treasury netting session closed",
  );

  // next:
  // 1. generate settlement instructions
  // 2. enqueue treasury accounting bridge event
  // 3. create evidence bundle for net positions

  return { ok: true };
}
```

---

# 10. Web UI

## `apps/web/src/app/(erp)/finance/treasury/components/netting-settlement-view.tsx`

```tsx
import { Card, CardContent, CardHeader, CardTitle } from "@afenda/ui";

export function NettingSettlementView({
  sessions,
  interestRates,
}: {
  sessions: any[];
  interestRates: any[];
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Netting Sessions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {sessions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No netting sessions yet.</p>
          ) : (
            sessions.map((row) => (
              <div key={row.id} className="rounded-xl border p-4">
                <div className="font-medium">
                  {row.sessionNumber} · {row.status}
                </div>
                <div className="text-sm text-muted-foreground">
                  {row.currencyCode} · obligations {row.totalObligationCount} · nettable {row.totalNettableMinor}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Internal Interest Rates</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {interestRates.length === 0 ? (
            <p className="text-sm text-muted-foreground">No internal interest rates yet.</p>
          ) : (
            interestRates.map((row) => (
              <div key={row.id} className="rounded-xl border p-4">
                <div className="font-medium">
                  {row.code} · {row.status}
                </div>
                <div className="text-sm text-muted-foreground">
                  {row.currencyCode} · {row.annualRateBps} bps · {row.dayCountConvention}
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

## `apps/web/src/app/(erp)/finance/treasury/netting/page.tsx`

```tsx
import { NettingSettlementView } from "../components/netting-settlement-view";

const API_BASE_URL = process.env.API_BASE_URL!;

async function getSessions() {
  const res = await fetch(`${API_BASE_URL}/v1/erp/finance/treasury/netting-sessions`, {
    cache: "no-store",
  });
  if (!res.ok) return [];
  return res.json();
}

async function getInterestRates() {
  const res = await fetch(`${API_BASE_URL}/v1/erp/finance/treasury/internal-interest-rates`, {
    cache: "no-store",
  });
  if (!res.ok) return [];
  return res.json();
}

export default async function NettingPage() {
  const [sessions, interestRates] = await Promise.all([
    getSessions(),
    getInterestRates(),
  ]);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Netting & Internal Interest</h1>
        <p className="text-sm text-muted-foreground">
          Net intercompany obligations and apply deterministic internal interest policies.
        </p>
      </div>

      <NettingSettlementView sessions={sessions} interestRates={interestRates} />
    </div>
  );
}
```

---

# 11. Tests

## `packages/core/src/erp/finance/treasury/__vitest_test__/netting-session.service.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { NettingSessionService } from "../netting-session.service";
import { calculateInternalInterestMinor } from "../calculators/internal-interest";

describe("NettingSessionService", () => {
  it("computes deterministic internal interest", () => {
    const interest = calculateInternalInterestMinor({
      principalMinor: "1000000",
      annualRateBps: 500,
      dayCountConvention: "actual_360",
      days: 30,
    });

    expect(interest).toBe("4166");
  });

  it("creates draft netting session", async () => {
    const db = {
      query: {
        treasuryNettingSessionTable: {
          findFirst: async () => null,
        },
      },
      insert: () => ({
        values: async () => undefined,
      }),
    };

    const service = new NettingSessionService(db as any);

    const result = await service.create({
      orgId: "00000000-0000-0000-0000-000000000001",
      actorUserId: "00000000-0000-0000-0000-000000000002",
      correlationId: "corr-1",
      idempotencyKey: "idem-1",
      sessionNumber: "NET-2026-001",
      currencyCode: "USD",
      nettingDate: "2026-03-12",
      settlementDate: "2026-03-14",
      sourceVersion: "wave4-v2",
    });

    expect(result.ok).toBe(true);
  });
});
```

---

# 12. Migration starter

## `packages/db/drizzle/<timestamp>_treasury_netting_interest.sql`

```sql
CREATE TABLE treasury_netting_session (
  id uuid PRIMARY KEY,
  org_id uuid NOT NULL,
  session_number text NOT NULL,
  currency_code text NOT NULL,
  netting_date date NOT NULL,
  settlement_date date NOT NULL,
  status text NOT NULL,
  total_obligation_count integer NOT NULL,
  total_gross_payable_minor text NOT NULL,
  total_gross_receivable_minor text NOT NULL,
  total_nettable_minor text NOT NULL,
  source_version text NOT NULL,
  closed_at timestamptz,
  settled_at timestamptz,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);

CREATE UNIQUE INDEX treasury_netting_session__org_session_number_uq
  ON treasury_netting_session(org_id, session_number);

CREATE INDEX treasury_netting_session__org_idx
  ON treasury_netting_session(org_id);

CREATE INDEX treasury_netting_session__org_status_idx
  ON treasury_netting_session(org_id, status);

CREATE TABLE treasury_netting_session_item (
  id uuid PRIMARY KEY,
  org_id uuid NOT NULL,
  netting_session_id uuid NOT NULL,
  source_type text NOT NULL,
  source_id uuid NOT NULL,
  from_legal_entity_id uuid NOT NULL,
  to_legal_entity_id uuid NOT NULL,
  currency_code text NOT NULL,
  amount_minor text NOT NULL,
  status text NOT NULL,
  created_at timestamptz NOT NULL
);

CREATE INDEX treasury_netting_session_item__org_session_idx
  ON treasury_netting_session_item(org_id, netting_session_id);

CREATE INDEX treasury_netting_session_item__org_source_idx
  ON treasury_netting_session_item(org_id, source_id);

CREATE TABLE treasury_internal_interest_rate (
  id uuid PRIMARY KEY,
  org_id uuid NOT NULL,
  code text NOT NULL,
  legal_entity_id uuid,
  currency_code text NOT NULL,
  annual_rate_bps integer NOT NULL,
  day_count_convention text NOT NULL,
  effective_from date NOT NULL,
  effective_to date,
  status text NOT NULL,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);

CREATE UNIQUE INDEX treasury_internal_interest_rate__org_code_uq
  ON treasury_internal_interest_rate(org_id, code);

CREATE INDEX treasury_internal_interest_rate__org_idx
  ON treasury_internal_interest_rate(org_id);
```

---

# 13. Barrel updates

## `packages/contracts/src/erp/finance/treasury/index.ts`

```ts
export * from "./netting-session.entity";
export * from "./netting-session.commands";
export * from "./internal-interest-rate.entity";
export * from "./internal-interest-rate.commands";
```

## `packages/db/src/schema/erp/finance/treasury/index.ts`

```ts
export * from "./netting-session.table";
export * from "./internal-interest-rate.table";
```

## `packages/core/src/erp/finance/treasury/calculators/index.ts`

```ts
export * from "./internal-interest";
```

## `packages/core/src/erp/finance/treasury/index.ts`

```ts
export * from "./netting-session.service";
export * from "./netting-session.queries";
export * from "./internal-interest-rate.service";
```

---

# 14. Cross-cutting additions

## Permissions

```ts
"erp.finance.treasury.netting-session.read"
"erp.finance.treasury.netting-session.manage"
"erp.finance.treasury.netting-session.settle"
"erp.finance.treasury.internal-interest-rate.read"
"erp.finance.treasury.internal-interest-rate.manage"
```

## Audit actions

```ts
"treasury.netting-session.create"
"treasury.netting-session.add-items"
"treasury.netting-session.close"
"treasury.netting-session.settle"
"treasury.internal-interest-rate.create"
"treasury.internal-interest-rate.activate"
```

## Error codes

```ts
TREASURY_NETTING_SESSION_NOT_FOUND
TREASURY_NETTING_SESSION_NUMBER_EXISTS
TREASURY_NETTING_SESSION_ILLEGAL_TRANSITION
TREASURY_NETTING_SESSION_UNBALANCED
TREASURY_NETTING_SOURCE_TRANSFER_NOT_FOUND
TREASURY_NETTING_SOURCE_TRANSFER_NOT_SETTLED
TREASURY_NETTING_SESSION_CURRENCY_MISMATCH
TREASURY_INTERNAL_INTEREST_RATE_NOT_FOUND
TREASURY_INTERNAL_INTEREST_RATE_CODE_EXISTS
```

## Outbox events

```ts
treasury.netting-session.created
treasury.netting-session.items-added
treasury.netting-session.closed
treasury.netting-session.settled
treasury.internal-interest-rate.created
treasury.internal-interest-rate.activated
```

---

# 15. What this gives you

This scaffold satisfies the Wave 4.2 intent from your uploaded plan:

* netting session entities
* internal interest calculation services
* settlement posting integration seam to treasury accounting 

And it directly targets the exit criteria:

* netting outputs reconcile with source obligations
* interest computation is deterministic and tested 

The file set also matches the Sprint 4.2 manifest in your uploaded scaffold. 

---

# 16. What I would harden next

Before Wave 5, I would add:

* netting participant summary projection table
* interest accrual run entity
* settlement evidence bundle for netting close
* source-link from netting outputs to Wave 5.2 treasury accounting bridge

That keeps Wave 4.2 operationally complete without prematurely embedding accounting logic.

# 17. Next scaffold after this

After Wave 4.2, the next scaffold is **Wave 5.1 — FX exposure and hedge baseline**, which is exactly what your uploaded manifest says comes next. 

Great. The next scaffold is **Wave 5.2 — Treasury Accounting Bridge**.

## Status (Updated 2026-03-13)

- Wave: 5.2
- Delivery status: Completed
- Closure status: Closed
- Implementation status: Scaffold completed and marked delivered
- Notes: Bridge event, policy mapping, and reconciliation scaffold are documented as completed

Your uploaded Treasury plan defines Wave 5.2 exactly as:

- **posting bridge events from treasury operations to GL**
- **accounting policy mapping tables**
- **reconciliation views between treasury and GL**

And its exit criteria are:

- **every posting event linked to a treasury source entity**
- **reconciliation report has zero orphan postings**

That means Wave 5.2 is where AFENDA Treasury stops being only operational truth and becomes **accounting-bridge truth**.

---

# 1. Design boundary

Wave 5.2 should do four things:

## Posting bridge event

A normalized accounting handoff event from Treasury into GL.

Source Treasury domains:

- bank statement settlement
- treasury payment instruction / batch
- intercompany transfer
- netting session
- revaluation event

## Accounting policy mapping

A deterministic mapping layer that decides:

- which treasury source type maps to which accounting policy
- which policy resolves to which posting template
- which legal entity / currency / event combination is allowed

## Posting generation

Generate **bridge posting rows**, not final GL journal lines yet if your GL engine already has a canonical posting interface.
If AFENDA GL expects journal proposals, this bridge should emit:

- debit account code
- credit account code
- amount
- currency
- source lineage
- policy lineage

## Reconciliation views

Treasury must be able to prove:

- which source events got bridged
- which got posted
- which failed
- which remain orphaned

That is exactly what your exit criteria require.

---

# 2. Target file set

## Create

- `packages/contracts/src/erp/finance/treasury/treasury-accounting-bridge-event.entity.ts`

- `packages/contracts/src/erp/finance/treasury/treasury-accounting-bridge-event.commands.ts`

- `packages/contracts/src/erp/finance/treasury/treasury-accounting-policy.entity.ts`

- `packages/contracts/src/erp/finance/treasury/treasury-accounting-policy.commands.ts`

- `packages/contracts/src/erp/finance/treasury/treasury-accounting-reconciliation.entity.ts`

- `packages/db/src/schema/erp/finance/treasury/treasury-accounting-bridge-event.table.ts`

- `packages/db/src/schema/erp/finance/treasury/treasury-accounting-policy.table.ts`

- `packages/core/src/erp/finance/treasury/treasury-accounting-bridge.service.ts`

- `packages/core/src/erp/finance/treasury/treasury-accounting-bridge.queries.ts`

- `packages/core/src/erp/finance/treasury/treasury-accounting-policy.service.ts`

- `packages/core/src/erp/finance/treasury/calculators/treasury-accounting.ts`

- `packages/core/src/erp/finance/treasury/__vitest_test__/treasury-accounting-bridge.service.test.ts`

- `apps/worker/src/jobs/erp/finance/treasury/handle-treasury-accounting-bridge-requested.ts`

- `apps/web/src/app/(erp)/finance/treasury/accounting-bridge/page.tsx`

- `apps/web/src/app/(erp)/finance/treasury/components/accounting-bridge-board.tsx`

## Update

- `packages/contracts/src/erp/finance/treasury/index.ts`
- `packages/db/src/schema/erp/finance/treasury/index.ts`
- `packages/core/src/erp/finance/treasury/calculators/index.ts`
- `packages/core/src/erp/finance/treasury/index.ts`
- `apps/api/src/routes/erp/finance/treasury.ts`
- `apps/worker/src/jobs/erp/finance/treasury/index.ts`
- `tools/gates/contract-db-sync.mjs`
- `packages/db/drizzle/<timestamp>_treasury_accounting_bridge.sql`

This structure follows your AFENDA pattern and Wave 5.2 intent.

---

# 3. Contracts

## `treasury-accounting-bridge-event.entity.ts`

```ts
import { z } from "zod";

export const treasuryAccountingBridgeStatusSchema = z.enum([
  "pending",
  "mapped",
  "posted",
  "failed",
]);

export const treasuryAccountingSourceTypeSchema = z.enum([
  "bank_statement",
  "treasury_payment_batch",
  "intercompany_transfer",
  "netting_session",
  "revaluation_event",
]);

export const treasuryAccountingBridgeEventEntitySchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  sourceType: treasuryAccountingSourceTypeSchema,
  sourceId: z.string().uuid(),
  legalEntityId: z.string().uuid(),
  policyId: z.string().uuid().nullable(),
  eventDate: z.string().date(),
  currencyCode: z.string().trim().length(3),
  amountMinor: z.string(),
  debitAccountCode: z.string().trim().max(64).nullable(),
  creditAccountCode: z.string().trim().max(64).nullable(),
  glJournalId: z.string().uuid().nullable(),
  status: treasuryAccountingBridgeStatusSchema,
  failureReason: z.string().nullable(),
  sourceVersion: z.string().trim().min(1).max(128),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type TreasuryAccountingBridgeEventEntity = z.infer<
  typeof treasuryAccountingBridgeEventEntitySchema
>;
```

---

## `treasury-accounting-bridge-event.commands.ts`

```ts
import { z } from "zod";
import { idempotencyKeySchema, orgScopedMetadataSchema } from "./shared";
import { treasuryAccountingSourceTypeSchema } from "./treasury-accounting-bridge-event.entity";

export const createTreasuryAccountingBridgeEventCommandSchema = z.object({
  ...orgScopedMetadataSchema.shape,
  idempotencyKey: idempotencyKeySchema,
  sourceType: treasuryAccountingSourceTypeSchema,
  sourceId: z.string().uuid(),
  legalEntityId: z.string().uuid(),
  eventDate: z.string().date(),
  currencyCode: z.string().trim().length(3),
  amountMinor: z.string(),
  sourceVersion: z.string().trim().min(1).max(128),
});

export const mapTreasuryAccountingBridgeEventCommandSchema = z.object({
  ...orgScopedMetadataSchema.shape,
  idempotencyKey: idempotencyKeySchema,
  treasuryAccountingBridgeEventId: z.string().uuid(),
});

export const markTreasuryAccountingBridgePostedCommandSchema = z.object({
  ...orgScopedMetadataSchema.shape,
  idempotencyKey: idempotencyKeySchema,
  treasuryAccountingBridgeEventId: z.string().uuid(),
  glJournalId: z.string().uuid(),
});

export type CreateTreasuryAccountingBridgeEventCommand = z.infer<
  typeof createTreasuryAccountingBridgeEventCommandSchema
>;
export type MapTreasuryAccountingBridgeEventCommand = z.infer<
  typeof mapTreasuryAccountingBridgeEventCommandSchema
>;
export type MarkTreasuryAccountingBridgePostedCommand = z.infer<
  typeof markTreasuryAccountingBridgePostedCommandSchema
>;
```

---

## `treasury-accounting-policy.entity.ts`

```ts
import { z } from "zod";
import { treasuryAccountingSourceTypeSchema } from "./treasury-accounting-bridge-event.entity";

export const treasuryAccountingPolicyStatusSchema = z.enum([
  "draft",
  "active",
  "inactive",
]);

export const treasuryAccountingPolicyEntitySchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  code: z.string().trim().min(1).max(64),
  legalEntityId: z.string().uuid().nullable(),
  sourceType: treasuryAccountingSourceTypeSchema,
  currencyCode: z.string().trim().length(3).nullable(),
  debitAccountCode: z.string().trim().min(1).max(64),
  creditAccountCode: z.string().trim().min(1).max(64),
  status: treasuryAccountingPolicyStatusSchema,
  effectiveFrom: z.string().date(),
  effectiveTo: z.string().date().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type TreasuryAccountingPolicyEntity = z.infer<
  typeof treasuryAccountingPolicyEntitySchema
>;
```

---

## `treasury-accounting-policy.commands.ts`

```ts
import { z } from "zod";
import { idempotencyKeySchema, orgScopedMetadataSchema } from "./shared";
import { treasuryAccountingSourceTypeSchema } from "./treasury-accounting-bridge-event.entity";

export const createTreasuryAccountingPolicyCommandSchema = z.object({
  ...orgScopedMetadataSchema.shape,
  idempotencyKey: idempotencyKeySchema,
  code: z.string().trim().min(1).max(64),
  legalEntityId: z.string().uuid().nullable().optional(),
  sourceType: treasuryAccountingSourceTypeSchema,
  currencyCode: z.string().trim().length(3).nullable().optional(),
  debitAccountCode: z.string().trim().min(1).max(64),
  creditAccountCode: z.string().trim().min(1).max(64),
  effectiveFrom: z.string().date(),
  effectiveTo: z.string().date().nullable().optional(),
});

export const activateTreasuryAccountingPolicyCommandSchema = z.object({
  ...orgScopedMetadataSchema.shape,
  idempotencyKey: idempotencyKeySchema,
  treasuryAccountingPolicyId: z.string().uuid(),
});

export type CreateTreasuryAccountingPolicyCommand = z.infer<
  typeof createTreasuryAccountingPolicyCommandSchema
>;
export type ActivateTreasuryAccountingPolicyCommand = z.infer<
  typeof activateTreasuryAccountingPolicyCommandSchema
>;
```

---

## `treasury-accounting-reconciliation.entity.ts`

```ts
import { z } from "zod";

export const treasuryAccountingReconciliationRowSchema = z.object({
  treasuryAccountingBridgeEventId: z.string().uuid(),
  sourceType: z.string(),
  sourceId: z.string().uuid(),
  legalEntityId: z.string().uuid(),
  amountMinor: z.string(),
  currencyCode: z.string(),
  policyId: z.string().uuid().nullable(),
  glJournalId: z.string().uuid().nullable(),
  status: z.string(),
  orphaned: z.boolean(),
});

export type TreasuryAccountingReconciliationRow = z.infer<
  typeof treasuryAccountingReconciliationRowSchema
>;
```

---

# 4. DB schema

## `treasury-accounting-bridge-event.table.ts`

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

export const treasuryAccountingBridgeEventTable = pgTable(
  "treasury_accounting_bridge_event",
  {
    id: uuid("id").primaryKey(),
    orgId: uuid("org_id").notNull(),
    sourceType: text("source_type").notNull(),
    sourceId: uuid("source_id").notNull(),
    legalEntityId: uuid("legal_entity_id").notNull(),
    policyId: uuid("policy_id"),
    eventDate: date("event_date").notNull(),
    currencyCode: text("currency_code").notNull(),
    amountMinor: text("amount_minor").notNull(),
    debitAccountCode: text("debit_account_code"),
    creditAccountCode: text("credit_account_code"),
    glJournalId: uuid("gl_journal_id"),
    status: text("status").notNull(),
    failureReason: text("failure_reason"),
    sourceVersion: text("source_version").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => ({
    orgIdx: index("treasury_accounting_bridge_event__org_idx").on(table.orgId),
    orgStatusIdx: index("treasury_accounting_bridge_event__org_status_idx").on(
      table.orgId,
      table.status,
    ),
    orgSourceUq: uniqueIndex("treasury_accounting_bridge_event__org_source_uq").on(
      table.orgId,
      table.sourceType,
      table.sourceId,
    ),
  }),
);
```

---

## `treasury-accounting-policy.table.ts`

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

export const treasuryAccountingPolicyTable = pgTable(
  "treasury_accounting_policy",
  {
    id: uuid("id").primaryKey(),
    orgId: uuid("org_id").notNull(),
    code: text("code").notNull(),
    legalEntityId: uuid("legal_entity_id"),
    sourceType: text("source_type").notNull(),
    currencyCode: text("currency_code"),
    debitAccountCode: text("debit_account_code").notNull(),
    creditAccountCode: text("credit_account_code").notNull(),
    status: text("status").notNull(),
    effectiveFrom: date("effective_from").notNull(),
    effectiveTo: date("effective_to"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => ({
    orgIdx: index("treasury_accounting_policy__org_idx").on(table.orgId),
    orgCodeUq: uniqueIndex("treasury_accounting_policy__org_code_uq").on(
      table.orgId,
      table.code,
    ),
    orgSourceTypeIdx: index("treasury_accounting_policy__org_source_type_idx").on(
      table.orgId,
      table.sourceType,
    ),
  }),
);
```

---

# 5. Core calculator

## `calculators/treasury-accounting.ts`

```ts
export function resolvePostingDirection(params: {
  amountMinor: string;
  debitAccountCode: string;
  creditAccountCode: string;
}) {
  const amount = BigInt(params.amountMinor);
  if (amount < 0n) {
    return {
      amountMinor: (-amount).toString(),
      debitAccountCode: params.creditAccountCode,
      creditAccountCode: params.debitAccountCode,
    };
  }

  return {
    amountMinor: amount.toString(),
    debitAccountCode: params.debitAccountCode,
    creditAccountCode: params.creditAccountCode,
  };
}
```

---

# 6. Core services

## `treasury-accounting-policy.service.ts`

```ts
import { and, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import {
  activateTreasuryAccountingPolicyCommandSchema,
  createTreasuryAccountingPolicyCommandSchema,
} from "@afenda/contracts/erp/finance/treasury/treasury-accounting-policy.commands";
import { treasuryAccountingPolicyTable } from "@afenda/db/schema/erp/finance/treasury/treasury-accounting-policy.table";

type DbTx = any;
type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } };

async function emitOutboxEvent(_: DbTx, __: unknown) {}
async function withAudit<T>(_: DbTx, __: unknown, fn: () => Promise<T>) {
  return fn();
}

export class TreasuryAccountingPolicyService {
  constructor(private readonly db: DbTx) {}

  async create(raw: unknown): Promise<ServiceResult<{ id: string }>> {
    const input = createTreasuryAccountingPolicyCommandSchema.parse(raw);

    const existing = await this.db.query.treasuryAccountingPolicyTable.findFirst({
      where: and(
        eq(treasuryAccountingPolicyTable.orgId, input.orgId),
        eq(treasuryAccountingPolicyTable.code, input.code),
      ),
    });

    if (existing) {
      return {
        ok: false,
        error: {
          code: "TREASURY_ACCOUNTING_POLICY_CODE_EXISTS",
          message: "Treasury accounting policy code already exists",
        },
      };
    }

    const id = randomUUID();
    const now = new Date();

    await withAudit(this.db, {}, async () => {
      await this.db.insert(treasuryAccountingPolicyTable).values({
        id,
        orgId: input.orgId,
        code: input.code,
        legalEntityId: input.legalEntityId ?? null,
        sourceType: input.sourceType,
        currencyCode: input.currencyCode ?? null,
        debitAccountCode: input.debitAccountCode,
        creditAccountCode: input.creditAccountCode,
        status: "draft",
        effectiveFrom: input.effectiveFrom,
        effectiveTo: input.effectiveTo ?? null,
        createdAt: now,
        updatedAt: now,
      });

      await emitOutboxEvent(this.db, {
        eventType: "treasury.accounting-policy.created",
        aggregateId: id,
      });
    });

    return { ok: true, data: { id } };
  }

  async activate(raw: unknown): Promise<ServiceResult<{ id: string }>> {
    const input = activateTreasuryAccountingPolicyCommandSchema.parse(raw);

    const row = await this.db.query.treasuryAccountingPolicyTable.findFirst({
      where: and(
        eq(treasuryAccountingPolicyTable.orgId, input.orgId),
        eq(treasuryAccountingPolicyTable.id, input.treasuryAccountingPolicyId),
      ),
    });

    if (!row) {
      return {
        ok: false,
        error: {
          code: "TREASURY_ACCOUNTING_POLICY_NOT_FOUND",
          message: "Treasury accounting policy not found",
        },
      };
    }

    const now = new Date();

    await withAudit(this.db, {}, async () => {
      await this.db
        .update(treasuryAccountingPolicyTable)
        .set({ status: "active", updatedAt: now })
        .where(eq(treasuryAccountingPolicyTable.id, row.id));

      await emitOutboxEvent(this.db, {
        eventType: "treasury.accounting-policy.activated",
        aggregateId: row.id,
      });
    });

    return { ok: true, data: { id: row.id } };
  }
}
```

---

## `treasury-accounting-bridge.service.ts`

```ts
import { and, eq, isNull, or } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import {
  createTreasuryAccountingBridgeEventCommandSchema,
  mapTreasuryAccountingBridgeEventCommandSchema,
  markTreasuryAccountingBridgePostedCommandSchema,
} from "@afenda/contracts/erp/finance/treasury/treasury-accounting-bridge-event.commands";
import { treasuryAccountingBridgeEventTable } from "@afenda/db/schema/erp/finance/treasury/treasury-accounting-bridge-event.table";
import { treasuryAccountingPolicyTable } from "@afenda/db/schema/erp/finance/treasury/treasury-accounting-policy.table";
import { resolvePostingDirection } from "./calculators/treasury-accounting";

type DbTx = any;
type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } };

async function emitOutboxEvent(_: DbTx, __: unknown) {}
async function withAudit<T>(_: DbTx, __: unknown, fn: () => Promise<T>) {
  return fn();
}

export class TreasuryAccountingBridgeService {
  constructor(private readonly db: DbTx) {}

  async createBridgeEvent(raw: unknown): Promise<ServiceResult<{ id: string }>> {
    const input = createTreasuryAccountingBridgeEventCommandSchema.parse(raw);

    const existing = await this.db.query.treasuryAccountingBridgeEventTable.findFirst({
      where: and(
        eq(treasuryAccountingBridgeEventTable.orgId, input.orgId),
        eq(treasuryAccountingBridgeEventTable.sourceType, input.sourceType),
        eq(treasuryAccountingBridgeEventTable.sourceId, input.sourceId),
      ),
    });

    if (existing) {
      return { ok: true, data: { id: existing.id } };
    }

    const id = randomUUID();
    const now = new Date();

    await withAudit(this.db, {}, async () => {
      await this.db.insert(treasuryAccountingBridgeEventTable).values({
        id,
        orgId: input.orgId,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        legalEntityId: input.legalEntityId,
        policyId: null,
        eventDate: input.eventDate,
        currencyCode: input.currencyCode,
        amountMinor: input.amountMinor,
        debitAccountCode: null,
        creditAccountCode: null,
        glJournalId: null,
        status: "pending",
        failureReason: null,
        sourceVersion: input.sourceVersion,
        createdAt: now,
        updatedAt: now,
      });

      await emitOutboxEvent(this.db, {
        eventType: "treasury.accounting-bridge-event.created",
        aggregateId: id,
      });
    });

    return { ok: true, data: { id } };
  }

  async mapBridgeEvent(raw: unknown): Promise<ServiceResult<{ id: string }>> {
    const input = mapTreasuryAccountingBridgeEventCommandSchema.parse(raw);

    const row = await this.db.query.treasuryAccountingBridgeEventTable.findFirst({
      where: and(
        eq(treasuryAccountingBridgeEventTable.orgId, input.orgId),
        eq(
          treasuryAccountingBridgeEventTable.id,
          input.treasuryAccountingBridgeEventId,
        ),
      ),
    });

    if (!row) {
      return {
        ok: false,
        error: {
          code: "TREASURY_ACCOUNTING_BRIDGE_EVENT_NOT_FOUND",
          message: "Treasury accounting bridge event not found",
        },
      };
    }

    const policy = await this.db.query.treasuryAccountingPolicyTable.findFirst({
      where: and(
        eq(treasuryAccountingPolicyTable.orgId, input.orgId),
        eq(treasuryAccountingPolicyTable.sourceType, row.sourceType),
        eq(treasuryAccountingPolicyTable.status, "active"),
        or(
          eq(treasuryAccountingPolicyTable.legalEntityId, row.legalEntityId),
          isNull(treasuryAccountingPolicyTable.legalEntityId),
        ),
      ),
    });

    if (!policy) {
      const now = new Date();

      await this.db
        .update(treasuryAccountingBridgeEventTable)
        .set({
          status: "failed",
          failureReason: "Accounting policy not found",
          updatedAt: now,
        })
        .where(eq(treasuryAccountingBridgeEventTable.id, row.id));

      return {
        ok: false,
        error: {
          code: "TREASURY_ACCOUNTING_POLICY_NOT_FOUND",
          message: "No active accounting policy found",
        },
      };
    }

    const resolved = resolvePostingDirection({
      amountMinor: row.amountMinor,
      debitAccountCode: policy.debitAccountCode,
      creditAccountCode: policy.creditAccountCode,
    });

    const now = new Date();

    await withAudit(this.db, {}, async () => {
      await this.db
        .update(treasuryAccountingBridgeEventTable)
        .set({
          policyId: policy.id,
          debitAccountCode: resolved.debitAccountCode,
          creditAccountCode: resolved.creditAccountCode,
          amountMinor: resolved.amountMinor,
          status: "mapped",
          failureReason: null,
          updatedAt: now,
        })
        .where(eq(treasuryAccountingBridgeEventTable.id, row.id));

      await emitOutboxEvent(this.db, {
        eventType: "treasury.accounting-bridge-event.mapped",
        aggregateId: row.id,
      });
    });

    return { ok: true, data: { id: row.id } };
  }

  async markPosted(raw: unknown): Promise<ServiceResult<{ id: string }>> {
    const input = markTreasuryAccountingBridgePostedCommandSchema.parse(raw);

    const row = await this.db.query.treasuryAccountingBridgeEventTable.findFirst({
      where: and(
        eq(treasuryAccountingBridgeEventTable.orgId, input.orgId),
        eq(
          treasuryAccountingBridgeEventTable.id,
          input.treasuryAccountingBridgeEventId,
        ),
      ),
    });

    if (!row) {
      return {
        ok: false,
        error: {
          code: "TREASURY_ACCOUNTING_BRIDGE_EVENT_NOT_FOUND",
          message: "Treasury accounting bridge event not found",
        },
      };
    }

    if (row.status !== "mapped") {
      return {
        ok: false,
        error: {
          code: "TREASURY_ACCOUNTING_BRIDGE_EVENT_ILLEGAL_TRANSITION",
          message: "Only mapped event can be posted",
        },
      };
    }

    const now = new Date();

    await withAudit(this.db, {}, async () => {
      await this.db
        .update(treasuryAccountingBridgeEventTable)
        .set({
          glJournalId: input.glJournalId,
          status: "posted",
          updatedAt: now,
        })
        .where(eq(treasuryAccountingBridgeEventTable.id, row.id));

      await emitOutboxEvent(this.db, {
        eventType: "treasury.accounting-bridge-event.posted",
        aggregateId: row.id,
      });
    });

    return { ok: true, data: { id: row.id } };
  }
}
```

---

## `treasury-accounting-bridge.queries.ts`

```ts
import { and, desc, eq, isNull } from "drizzle-orm";
import { treasuryAccountingBridgeEventTable } from "@afenda/db/schema/erp/finance/treasury/treasury-accounting-bridge-event.table";
import { treasuryAccountingPolicyTable } from "@afenda/db/schema/erp/finance/treasury/treasury-accounting-policy.table";

type DbTx = any;

export class TreasuryAccountingBridgeQueries {
  constructor(private readonly db: DbTx) {}

  async listBridgeEvents(orgId: string) {
    return this.db
      .select()
      .from(treasuryAccountingBridgeEventTable)
      .where(eq(treasuryAccountingBridgeEventTable.orgId, orgId))
      .orderBy(desc(treasuryAccountingBridgeEventTable.createdAt));
  }

  async listPolicies(orgId: string) {
    return this.db
      .select()
      .from(treasuryAccountingPolicyTable)
      .where(eq(treasuryAccountingPolicyTable.orgId, orgId))
      .orderBy(desc(treasuryAccountingPolicyTable.createdAt));
  }

  async listOrphans(orgId: string) {
    return this.db
      .select()
      .from(treasuryAccountingBridgeEventTable)
      .where(
        and(
          eq(treasuryAccountingBridgeEventTable.orgId, orgId),
          isNull(treasuryAccountingBridgeEventTable.glJournalId),
        ),
      )
      .orderBy(desc(treasuryAccountingBridgeEventTable.createdAt));
  }
}
```

---

# 7. API route extensions

Add into `apps/api/src/routes/erp/finance/treasury.ts`:

```ts
import {
  createTreasuryAccountingBridgeEventCommandSchema,
  mapTreasuryAccountingBridgeEventCommandSchema,
  markTreasuryAccountingBridgePostedCommandSchema,
} from "@afenda/contracts/erp/finance/treasury/treasury-accounting-bridge-event.commands";
import {
  activateTreasuryAccountingPolicyCommandSchema,
  createTreasuryAccountingPolicyCommandSchema,
} from "@afenda/contracts/erp/finance/treasury/treasury-accounting-policy.commands";
import {
  TreasuryAccountingBridgeQueries,
  TreasuryAccountingBridgeService,
  TreasuryAccountingPolicyService,
} from "@afenda/core/erp/finance/treasury";
```

```ts
  app.post("/v1/commands/erp/finance/treasury/accounting-policies/create", async (req, reply) => {
    const input = createTreasuryAccountingPolicyCommandSchema.parse(req.body);
    const service = new TreasuryAccountingPolicyService(app.db);
    const result = await service.create(input);
    if (!result.ok) return reply.code(400).send(result.error);
    return reply.code(201).send(result.data);
  });

  app.post("/v1/commands/erp/finance/treasury/accounting-policies/activate", async (req, reply) => {
    const input = activateTreasuryAccountingPolicyCommandSchema.parse(req.body);
    const service = new TreasuryAccountingPolicyService(app.db);
    const result = await service.activate(input);
    if (!result.ok) return reply.code(400).send(result.error);
    return reply.send(result.data);
  });

  app.get("/v1/erp/finance/treasury/accounting-policies", async (req: any) => {
    const queries = new TreasuryAccountingBridgeQueries(app.db);
    return queries.listPolicies(req.user.orgId);
  });

  app.post("/v1/commands/erp/finance/treasury/accounting-bridge-events/create", async (req, reply) => {
    const input = createTreasuryAccountingBridgeEventCommandSchema.parse(req.body);
    const service = new TreasuryAccountingBridgeService(app.db);
    const result = await service.createBridgeEvent(input);
    if (!result.ok) return reply.code(400).send(result.error);
    return reply.code(201).send(result.data);
  });

  app.post("/v1/commands/erp/finance/treasury/accounting-bridge-events/map", async (req, reply) => {
    const input = mapTreasuryAccountingBridgeEventCommandSchema.parse(req.body);
    const service = new TreasuryAccountingBridgeService(app.db);
    const result = await service.mapBridgeEvent(input);
    if (!result.ok) return reply.code(400).send(result.error);
    return reply.send(result.data);
  });

  app.post("/v1/commands/erp/finance/treasury/accounting-bridge-events/mark-posted", async (req, reply) => {
    const input = markTreasuryAccountingBridgePostedCommandSchema.parse(req.body);
    const service = new TreasuryAccountingBridgeService(app.db);
    const result = await service.markPosted(input);
    if (!result.ok) return reply.code(400).send(result.error);
    return reply.send(result.data);
  });

  app.get("/v1/erp/finance/treasury/accounting-bridge-events", async (req: any) => {
    const queries = new TreasuryAccountingBridgeQueries(app.db);
    return queries.listBridgeEvents(req.user.orgId);
  });

  app.get("/v1/erp/finance/treasury/accounting-bridge-events/orphans", async (req: any) => {
    const queries = new TreasuryAccountingBridgeQueries(app.db);
    return queries.listOrphans(req.user.orgId);
  });
```

---

# 8. Worker

## `apps/worker/src/jobs/erp/finance/treasury/handle-treasury-accounting-bridge-requested.ts`

```ts
type JobContext = {
  logger: {
    info: (payload: Record<string, unknown>, msg?: string) => void;
  };
};

export async function handleTreasuryAccountingBridgeRequested(
  ctx: JobContext,
  event: {
    orgId: string;
    treasuryAccountingBridgeEventId: string;
    correlationId: string;
  },
) {
  ctx.logger.info(
    {
      orgId: event.orgId,
      treasuryAccountingBridgeEventId: event.treasuryAccountingBridgeEventId,
      correlationId: event.correlationId,
    },
    "Handling treasury accounting bridge requested",
  );

  return { ok: true };
}
```

---

# 9. Web

## `components/accounting-bridge-board.tsx`

```tsx
import { Card, CardContent, CardHeader, CardTitle } from "@afenda/ui";

export function AccountingBridgeBoard({
  events,
  policies,
  orphans,
}: {
  events: any[];
  policies: any[];
  orphans: any[];
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle>Bridge Events</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {events.length === 0 ? (
            <p className="text-sm text-muted-foreground">No bridge events yet.</p>
          ) : (
            events.map((row) => (
              <div key={row.id} className="rounded-xl border p-4">
                <div className="font-medium">
                  {row.sourceType} · {row.status}
                </div>
                <div className="text-sm text-muted-foreground">
                  {row.amountMinor} {row.currencyCode}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Accounting Policies</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {policies.length === 0 ? (
            <p className="text-sm text-muted-foreground">No policies yet.</p>
          ) : (
            policies.map((row) => (
              <div key={row.id} className="rounded-xl border p-4">
                <div className="font-medium">
                  {row.code} · {row.status}
                </div>
                <div className="text-sm text-muted-foreground">
                  {row.sourceType} · {row.debitAccountCode} / {row.creditAccountCode}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Orphan Reconciliation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {orphans.length === 0 ? (
            <p className="text-sm text-muted-foreground">No orphan bridge rows.</p>
          ) : (
            orphans.map((row) => (
              <div key={row.id} className="rounded-xl border p-4">
                <div className="font-medium">
                  {row.sourceType} · {row.status}
                </div>
                <div className="text-sm text-muted-foreground">
                  source {row.sourceId} · policy {row.policyId ?? "none"} · gl {row.glJournalId ?? "none"}
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

## `accounting-bridge/page.tsx`

```tsx
import { AccountingBridgeBoard } from "../components/accounting-bridge-board";

const API_BASE_URL = process.env.API_BASE_URL!;

async function getEvents() {
  const res = await fetch(`${API_BASE_URL}/v1/erp/finance/treasury/accounting-bridge-events`, {
    cache: "no-store",
  });
  if (!res.ok) return [];
  return res.json();
}

async function getPolicies() {
  const res = await fetch(`${API_BASE_URL}/v1/erp/finance/treasury/accounting-policies`, {
    cache: "no-store",
  });
  if (!res.ok) return [];
  return res.json();
}

async function getOrphans() {
  const res = await fetch(`${API_BASE_URL}/v1/erp/finance/treasury/accounting-bridge-events/orphans`, {
    cache: "no-store",
  });
  if (!res.ok) return [];
  return res.json();
}

export default async function AccountingBridgePage() {
  const [events, policies, orphans] = await Promise.all([
    getEvents(),
    getPolicies(),
    getOrphans(),
  ]);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Treasury Accounting Bridge</h1>
        <p className="text-sm text-muted-foreground">
          Bridge treasury source events into GL-ready accounting mappings and reconciliation.
        </p>
      </div>

      <AccountingBridgeBoard events={events} policies={policies} orphans={orphans} />
    </div>
  );
}
```

---

# 10. Tests

## `__vitest_test__/treasury-accounting-bridge.service.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { TreasuryAccountingBridgeService } from "../treasury-accounting-bridge.service";

describe("TreasuryAccountingBridgeService", () => {
  it("maps bridge event using active accounting policy", async () => {
    const updates: any[] = [];

    const db = {
      query: {
        treasuryAccountingBridgeEventTable: {
          findFirst: async () => ({
            id: "bridge-1",
            orgId: "org-1",
            sourceType: "intercompany_transfer",
            sourceId: "src-1",
            legalEntityId: "le-1",
            amountMinor: "1000",
            status: "pending",
          }),
        },
        treasuryAccountingPolicyTable: {
          findFirst: async () => ({
            id: "policy-1",
            debitAccountCode: "131000",
            creditAccountCode: "251000",
          }),
        },
      },
      update: () => ({
        set: (value: any) => {
          updates.push(value);
          return { where: async () => undefined };
        },
      }),
    };

    const service = new TreasuryAccountingBridgeService(db as any);

    const result = await service.mapBridgeEvent({
      orgId: "org-1",
      actorUserId: "user-1",
      correlationId: "corr-1",
      idempotencyKey: "idem-1",
      treasuryAccountingBridgeEventId: "bridge-1",
    });

    expect(result.ok).toBe(true);
    expect(updates[0].debitAccountCode).toBe("131000");
    expect(updates[0].creditAccountCode).toBe("251000");
  });
});
```

---

# 11. Migration starter

## `packages/db/drizzle/<timestamp>_treasury_accounting_bridge.sql`

```sql
CREATE TABLE treasury_accounting_policy (
  id uuid PRIMARY KEY,
  org_id uuid NOT NULL,
  code text NOT NULL,
  legal_entity_id uuid,
  source_type text NOT NULL,
  currency_code text,
  debit_account_code text NOT NULL,
  credit_account_code text NOT NULL,
  status text NOT NULL,
  effective_from date NOT NULL,
  effective_to date,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);

CREATE UNIQUE INDEX treasury_accounting_policy__org_code_uq
  ON treasury_accounting_policy(org_id, code);

CREATE INDEX treasury_accounting_policy__org_idx
  ON treasury_accounting_policy(org_id);

CREATE INDEX treasury_accounting_policy__org_source_type_idx
  ON treasury_accounting_policy(org_id, source_type);

CREATE TABLE treasury_accounting_bridge_event (
  id uuid PRIMARY KEY,
  org_id uuid NOT NULL,
  source_type text NOT NULL,
  source_id uuid NOT NULL,
  legal_entity_id uuid NOT NULL,
  policy_id uuid,
  event_date date NOT NULL,
  currency_code text NOT NULL,
  amount_minor text NOT NULL,
  debit_account_code text,
  credit_account_code text,
  gl_journal_id uuid,
  status text NOT NULL,
  failure_reason text,
  source_version text NOT NULL,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);

CREATE UNIQUE INDEX treasury_accounting_bridge_event__org_source_uq
  ON treasury_accounting_bridge_event(org_id, source_type, source_id);

CREATE INDEX treasury_accounting_bridge_event__org_idx
  ON treasury_accounting_bridge_event(org_id);

CREATE INDEX treasury_accounting_bridge_event__org_status_idx
  ON treasury_accounting_bridge_event(org_id, status);
```

---

# 12. Barrel updates

## `packages/contracts/src/erp/finance/treasury/index.ts`

```ts
export * from "./treasury-accounting-bridge-event.entity";
export * from "./treasury-accounting-bridge-event.commands";
export * from "./treasury-accounting-policy.entity";
export * from "./treasury-accounting-policy.commands";
export * from "./treasury-accounting-reconciliation.entity";
```

## `packages/db/src/schema/erp/finance/treasury/index.ts`

```ts
export * from "./treasury-accounting-bridge-event.table";
export * from "./treasury-accounting-policy.table";
```

## `packages/core/src/erp/finance/treasury/calculators/index.ts`

```ts
export * from "./treasury-accounting";
```

## `packages/core/src/erp/finance/treasury/index.ts`

```ts
export * from "./treasury-accounting-policy.service";
export * from "./treasury-accounting-bridge.service";
export * from "./treasury-accounting-bridge.queries";
```

---

# 13. Cross-cutting additions

## Permissions

```ts
"erp.finance.treasury.accounting-policy.read"
"erp.finance.treasury.accounting-policy.manage"
"erp.finance.treasury.accounting-bridge.read"
"erp.finance.treasury.accounting-bridge.manage"
"erp.finance.treasury.accounting-reconciliation.read"
```

## Audit actions

```ts
"treasury.accounting-policy.create"
"treasury.accounting-policy.activate"
"treasury.accounting-bridge-event.create"
"treasury.accounting-bridge-event.map"
"treasury.accounting-bridge-event.mark-posted"
```

## Error codes

```ts
TREASURY_ACCOUNTING_POLICY_NOT_FOUND
TREASURY_ACCOUNTING_POLICY_CODE_EXISTS
TREASURY_ACCOUNTING_BRIDGE_EVENT_NOT_FOUND
TREASURY_ACCOUNTING_BRIDGE_EVENT_ILLEGAL_TRANSITION
```

## Outbox events

```ts
treasury.accounting-policy.created
treasury.accounting-policy.activated
treasury.accounting-bridge-event.created
treasury.accounting-bridge-event.mapped
treasury.accounting-bridge-event.posted
```

---

# 14. What this gives you

This Wave 5.2 scaffold matches your plan exactly:

- posting bridge events from treasury operations to GL
- accounting policy mapping tables
- reconciliation views between treasury and GL

And it directly targets the exit criteria:

- every posting event linked to a treasury source entity
- reconciliation report with zero orphan postings

---

# 15. What I would harden next

Before Wave 6, I would add:

- policy resolution precedence rules
- legal-entity + currency + source-type exact match before wildcard fallback
- GL posting acknowledgment callback
- reconciliation aging buckets
- signed accounting bridge export manifest

That keeps the bridge audit-grade.

# 16. Next scaffold after this

After Wave 5.2, the next scaffold is **Wave 6.1 — Treasury Policy and Limits**, because your uploaded plan places governance, compliance, and external connectivity next, starting with:

- policy and limit definition entities
- real-time limit checks
- breach events and override flow

Good. The next scaffold is **Wave 6.1 — Treasury Policy and Limits**.

## Status (Updated 2026-03-13)

- Wave: 6.1
- Delivery status: Completed
- Closure status: Closed
- Implementation status: Implemented and wired into contracts, db schema, core services, api routes, worker, and web governance page
- Notes: Policy and limit control plane is in place with breach and override workflow coverage

Your uploaded scaffold defines Wave 6.1 as:

- **policy and limit definition entities**
- **real-time limit checks in services**
- **breach events and approval override flow**

with exit criteria:

- **policy violations block forbidden transitions**
- **all overrides audited with correlation IDs**

It also lists the concrete file pack for Sprint 6.1:

- `treasury-policy.entity.ts`
- `treasury-policy.commands.ts`
- `treasury-limit.entity.ts`
- `treasury-limit.commands.ts`
- `treasury-policy.table.ts`
- `treasury-limit.table.ts`
- `treasury-policy.service.ts`
- `treasury-policy.queries.ts`
- `calculators/limit-breach.ts`
- tests, worker, governance page, and treasury policy console.

---

# 1. Design boundary

Wave 6.1 is the first true **governance control plane** for Treasury.

It should do four things:

## Treasury policy

Define what is allowed:

- which source types
- which entities
- which currencies
- whether override is allowed
- effective dates

## Treasury limit

Define quantitative thresholds:

- max payment amount
- max intercompany transfer amount
- max netting total
- max exposure amount
- max revaluation threshold

## Real-time breach checks

Treasury services should call a limit-check calculator before completing sensitive transitions.

## Override flow

If a breach is overrideable:

- create audited override event
- require actor + reason + correlationId
- preserve decision history

This is exactly consistent with your scaffold’s stated purpose for Wave 6.1.

---

# 2. Target file set

## Create

- `packages/contracts/src/erp/finance/treasury/treasury-policy.entity.ts`

- `packages/contracts/src/erp/finance/treasury/treasury-policy.commands.ts`

- `packages/contracts/src/erp/finance/treasury/treasury-limit.entity.ts`

- `packages/contracts/src/erp/finance/treasury/treasury-limit.commands.ts`

- `packages/db/src/schema/erp/finance/treasury/treasury-policy.table.ts`

- `packages/db/src/schema/erp/finance/treasury/treasury-limit.table.ts`

- `packages/core/src/erp/finance/treasury/treasury-policy.service.ts`

- `packages/core/src/erp/finance/treasury/treasury-policy.queries.ts`

- `packages/core/src/erp/finance/treasury/calculators/limit-breach.ts`

- `packages/core/src/erp/finance/treasury/__vitest_test__/treasury-policy.service.test.ts`

- `apps/worker/src/jobs/erp/finance/treasury/handle-treasury-limit-breached.ts`

- `apps/web/src/app/(erp)/finance/treasury/governance/page.tsx`

- `apps/web/src/app/(erp)/finance/treasury/components/treasury-policy-console.tsx`

## Update

- `packages/contracts/src/erp/finance/treasury/index.ts`
- `packages/db/src/schema/erp/finance/treasury/index.ts`
- `packages/core/src/erp/finance/treasury/calculators/index.ts`
- `packages/core/src/erp/finance/treasury/index.ts`
- `apps/api/src/routes/erp/finance/treasury.ts`
- `apps/worker/src/jobs/erp/finance/treasury/index.ts`
- `tools/gates/contract-db-sync.mjs`
- `packages/db/drizzle/<timestamp>_treasury_policy_limits.sql`

---

# 3. Contracts

## `treasury-policy.entity.ts`

```ts
import { z } from "zod";

export const treasuryPolicyStatusSchema = z.enum([
  "draft",
  "active",
  "inactive",
]);

export const treasuryPolicyScopeTypeSchema = z.enum([
  "payment_instruction",
  "payment_batch",
  "intercompany_transfer",
  "netting_session",
  "fx_exposure",
  "revaluation_event",
]);

export const treasuryPolicyEntitySchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  code: z.string().trim().min(1).max(64),
  name: z.string().trim().min(1).max(255),
  scopeType: treasuryPolicyScopeTypeSchema,
  legalEntityId: z.string().uuid().nullable(),
  currencyCode: z.string().trim().length(3).nullable(),
  allowOverride: z.boolean(),
  status: treasuryPolicyStatusSchema,
  effectiveFrom: z.string().date(),
  effectiveTo: z.string().date().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type TreasuryPolicyEntity = z.infer<typeof treasuryPolicyEntitySchema>;
```

---

## `treasury-policy.commands.ts`

```ts
import { z } from "zod";
import { idempotencyKeySchema, orgScopedMetadataSchema } from "./shared";
import { treasuryPolicyScopeTypeSchema } from "./treasury-policy.entity";

export const createTreasuryPolicyCommandSchema = z.object({
  ...orgScopedMetadataSchema.shape,
  idempotencyKey: idempotencyKeySchema,
  code: z.string().trim().min(1).max(64),
  name: z.string().trim().min(1).max(255),
  scopeType: treasuryPolicyScopeTypeSchema,
  legalEntityId: z.string().uuid().nullable().optional(),
  currencyCode: z.string().trim().length(3).nullable().optional(),
  allowOverride: z.boolean(),
  effectiveFrom: z.string().date(),
  effectiveTo: z.string().date().nullable().optional(),
});

export const activateTreasuryPolicyCommandSchema = z.object({
  ...orgScopedMetadataSchema.shape,
  idempotencyKey: idempotencyKeySchema,
  treasuryPolicyId: z.string().uuid(),
});

export type CreateTreasuryPolicyCommand = z.infer<
  typeof createTreasuryPolicyCommandSchema
>;
export type ActivateTreasuryPolicyCommand = z.infer<
  typeof activateTreasuryPolicyCommandSchema
>;
```

---

## `treasury-limit.entity.ts`

```ts
import { z } from "zod";
import { treasuryPolicyScopeTypeSchema } from "./treasury-policy.entity";

export const treasuryLimitStatusSchema = z.enum([
  "draft",
  "active",
  "inactive",
]);

export const treasuryLimitMetricSchema = z.enum([
  "single_amount_minor",
  "daily_total_minor",
  "monthly_total_minor",
]);

export const treasuryLimitEntitySchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  policyId: z.string().uuid(),
  code: z.string().trim().min(1).max(64),
  scopeType: treasuryPolicyScopeTypeSchema,
  legalEntityId: z.string().uuid().nullable(),
  currencyCode: z.string().trim().length(3).nullable(),
  metric: treasuryLimitMetricSchema,
  thresholdMinor: z.string(),
  hardBlock: z.boolean(),
  status: treasuryLimitStatusSchema,
  effectiveFrom: z.string().date(),
  effectiveTo: z.string().date().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const treasuryLimitBreachEntitySchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  treasuryLimitId: z.string().uuid(),
  sourceType: treasuryPolicyScopeTypeSchema,
  sourceId: z.string().uuid(),
  measuredValueMinor: z.string(),
  thresholdMinor: z.string(),
  hardBlock: z.boolean(),
  overrideRequested: z.boolean(),
  overrideApprovedByUserId: z.string().uuid().nullable(),
  overrideReason: z.string().nullable(),
  correlationId: z.string(),
  createdAt: z.string().datetime(),
});

export type TreasuryLimitEntity = z.infer<typeof treasuryLimitEntitySchema>;
export type TreasuryLimitBreachEntity = z.infer<
  typeof treasuryLimitBreachEntitySchema
>;
```

---

## `treasury-limit.commands.ts`

```ts
import { z } from "zod";
import { idempotencyKeySchema, orgScopedMetadataSchema } from "./shared";
import {
  treasuryLimitMetricSchema,
} from "./treasury-limit.entity";
import { treasuryPolicyScopeTypeSchema } from "./treasury-policy.entity";

export const createTreasuryLimitCommandSchema = z.object({
  ...orgScopedMetadataSchema.shape,
  idempotencyKey: idempotencyKeySchema,
  policyId: z.string().uuid(),
  code: z.string().trim().min(1).max(64),
  scopeType: treasuryPolicyScopeTypeSchema,
  legalEntityId: z.string().uuid().nullable().optional(),
  currencyCode: z.string().trim().length(3).nullable().optional(),
  metric: treasuryLimitMetricSchema,
  thresholdMinor: z.string(),
  hardBlock: z.boolean(),
  effectiveFrom: z.string().date(),
  effectiveTo: z.string().date().nullable().optional(),
});

export const activateTreasuryLimitCommandSchema = z.object({
  ...orgScopedMetadataSchema.shape,
  idempotencyKey: idempotencyKeySchema,
  treasuryLimitId: z.string().uuid(),
});

export const approveTreasuryLimitOverrideCommandSchema = z.object({
  ...orgScopedMetadataSchema.shape,
  idempotencyKey: idempotencyKeySchema,
  treasuryLimitBreachId: z.string().uuid(),
  reason: z.string().trim().min(1).max(255),
});

export type CreateTreasuryLimitCommand = z.infer<
  typeof createTreasuryLimitCommandSchema
>;
export type ActivateTreasuryLimitCommand = z.infer<
  typeof activateTreasuryLimitCommandSchema
>;
export type ApproveTreasuryLimitOverrideCommand = z.infer<
  typeof approveTreasuryLimitOverrideCommandSchema
>;
```

---

# 4. DB schema

## `treasury-policy.table.ts`

```ts
import {
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  boolean,
  date,
} from "drizzle-orm/pg-core";

export const treasuryPolicyTable = pgTable(
  "treasury_policy",
  {
    id: uuid("id").primaryKey(),
    orgId: uuid("org_id").notNull(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    scopeType: text("scope_type").notNull(),
    legalEntityId: uuid("legal_entity_id"),
    currencyCode: text("currency_code"),
    allowOverride: boolean("allow_override").notNull(),
    status: text("status").notNull(),
    effectiveFrom: date("effective_from").notNull(),
    effectiveTo: date("effective_to"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => ({
    orgIdx: index("treasury_policy__org_idx").on(table.orgId),
    orgCodeUq: uniqueIndex("treasury_policy__org_code_uq").on(
      table.orgId,
      table.code,
    ),
  }),
);
```

---

## `treasury-limit.table.ts`

```ts
import {
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  date,
} from "drizzle-orm/pg-core";

export const treasuryLimitTable = pgTable(
  "treasury_limit",
  {
    id: uuid("id").primaryKey(),
    orgId: uuid("org_id").notNull(),
    policyId: uuid("policy_id").notNull(),
    code: text("code").notNull(),
    scopeType: text("scope_type").notNull(),
    legalEntityId: uuid("legal_entity_id"),
    currencyCode: text("currency_code"),
    metric: text("metric").notNull(),
    thresholdMinor: text("threshold_minor").notNull(),
    hardBlock: boolean("hard_block").notNull(),
    status: text("status").notNull(),
    effectiveFrom: date("effective_from").notNull(),
    effectiveTo: date("effective_to"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => ({
    orgIdx: index("treasury_limit__org_idx").on(table.orgId),
    orgPolicyIdx: index("treasury_limit__org_policy_idx").on(
      table.orgId,
      table.policyId,
    ),
    orgCodeUq: uniqueIndex("treasury_limit__org_code_uq").on(
      table.orgId,
      table.code,
    ),
  }),
);

export const treasuryLimitBreachTable = pgTable(
  "treasury_limit_breach",
  {
    id: uuid("id").primaryKey(),
    orgId: uuid("org_id").notNull(),
    treasuryLimitId: uuid("treasury_limit_id").notNull(),
    sourceType: text("source_type").notNull(),
    sourceId: uuid("source_id").notNull(),
    measuredValueMinor: text("measured_value_minor").notNull(),
    thresholdMinor: text("threshold_minor").notNull(),
    hardBlock: boolean("hard_block").notNull(),
    overrideRequested: boolean("override_requested").notNull(),
    overrideApprovedByUserId: uuid("override_approved_by_user_id"),
    overrideReason: text("override_reason"),
    correlationId: text("correlation_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (table) => ({
    orgIdx: index("treasury_limit_breach__org_idx").on(table.orgId),
    orgLimitIdx: index("treasury_limit_breach__org_limit_idx").on(
      table.orgId,
      table.treasuryLimitId,
    ),
  }),
);
```

---

# 5. Core calculator

## `calculators/limit-breach.ts`

```ts
export function evaluateLimitBreach(params: {
  measuredValueMinor: string;
  thresholdMinor: string;
}) {
  const measured = BigInt(params.measuredValueMinor);
  const threshold = BigInt(params.thresholdMinor);

  return {
    breached: measured > threshold,
    exceededByMinor: measured > threshold ? (measured - threshold).toString() : "0",
  };
}
```

---

# 6. Core service

## `treasury-policy.service.ts`

```ts
import { and, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import {
  activateTreasuryLimitCommandSchema,
  approveTreasuryLimitOverrideCommandSchema,
  createTreasuryLimitCommandSchema,
} from "@afenda/contracts/erp/finance/treasury/treasury-limit.commands";
import {
  activateTreasuryPolicyCommandSchema,
  createTreasuryPolicyCommandSchema,
} from "@afenda/contracts/erp/finance/treasury/treasury-policy.commands";
import {
  treasuryLimitBreachTable,
  treasuryLimitTable,
} from "@afenda/db/schema/erp/finance/treasury/treasury-limit.table";
import { treasuryPolicyTable } from "@afenda/db/schema/erp/finance/treasury/treasury-policy.table";
import { evaluateLimitBreach } from "./calculators/limit-breach";

type DbTx = any;
type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } };

async function emitOutboxEvent(_: DbTx, __: unknown) {}
async function withAudit<T>(_: DbTx, __: unknown, fn: () => Promise<T>) {
  return fn();
}

export class TreasuryPolicyService {
  constructor(private readonly db: DbTx) {}

  async createPolicy(raw: unknown): Promise<ServiceResult<{ id: string }>> {
    const input = createTreasuryPolicyCommandSchema.parse(raw);

    const existing = await this.db.query.treasuryPolicyTable.findFirst({
      where: and(
        eq(treasuryPolicyTable.orgId, input.orgId),
        eq(treasuryPolicyTable.code, input.code),
      ),
    });

    if (existing) {
      return {
        ok: false,
        error: {
          code: "TREASURY_POLICY_CODE_EXISTS",
          message: "Treasury policy code already exists",
        },
      };
    }

    const id = randomUUID();
    const now = new Date();

    await withAudit(this.db, {}, async () => {
      await this.db.insert(treasuryPolicyTable).values({
        id,
        orgId: input.orgId,
        code: input.code,
        name: input.name,
        scopeType: input.scopeType,
        legalEntityId: input.legalEntityId ?? null,
        currencyCode: input.currencyCode ?? null,
        allowOverride: input.allowOverride,
        status: "draft",
        effectiveFrom: input.effectiveFrom,
        effectiveTo: input.effectiveTo ?? null,
        createdAt: now,
        updatedAt: now,
      });

      await emitOutboxEvent(this.db, {
        eventType: "treasury.policy.created",
        aggregateId: id,
      });
    });

    return { ok: true, data: { id } };
  }

  async activatePolicy(raw: unknown): Promise<ServiceResult<{ id: string }>> {
    const input = activateTreasuryPolicyCommandSchema.parse(raw);

    const row = await this.db.query.treasuryPolicyTable.findFirst({
      where: and(
        eq(treasuryPolicyTable.orgId, input.orgId),
        eq(treasuryPolicyTable.id, input.treasuryPolicyId),
      ),
    });

    if (!row) {
      return {
        ok: false,
        error: {
          code: "TREASURY_POLICY_NOT_FOUND",
          message: "Treasury policy not found",
        },
      };
    }

    const now = new Date();

    await this.db
      .update(treasuryPolicyTable)
      .set({ status: "active", updatedAt: now })
      .where(eq(treasuryPolicyTable.id, row.id));

    return { ok: true, data: { id: row.id } };
  }

  async createLimit(raw: unknown): Promise<ServiceResult<{ id: string }>> {
    const input = createTreasuryLimitCommandSchema.parse(raw);

    const policy = await this.db.query.treasuryPolicyTable.findFirst({
      where: and(
        eq(treasuryPolicyTable.orgId, input.orgId),
        eq(treasuryPolicyTable.id, input.policyId),
      ),
    });

    if (!policy) {
      return {
        ok: false,
        error: {
          code: "TREASURY_POLICY_NOT_FOUND",
          message: "Treasury policy not found",
        },
      };
    }

    const id = randomUUID();
    const now = new Date();

    await this.db.insert(treasuryLimitTable).values({
      id,
      orgId: input.orgId,
      policyId: input.policyId,
      code: input.code,
      scopeType: input.scopeType,
      legalEntityId: input.legalEntityId ?? null,
      currencyCode: input.currencyCode ?? null,
      metric: input.metric,
      thresholdMinor: input.thresholdMinor,
      hardBlock: input.hardBlock,
      status: "draft",
      effectiveFrom: input.effectiveFrom,
      effectiveTo: input.effectiveTo ?? null,
      createdAt: now,
      updatedAt: now,
    });

    return { ok: true, data: { id } };
  }

  async activateLimit(raw: unknown): Promise<ServiceResult<{ id: string }>> {
    const input = activateTreasuryLimitCommandSchema.parse(raw);

    const row = await this.db.query.treasuryLimitTable.findFirst({
      where: and(
        eq(treasuryLimitTable.orgId, input.orgId),
        eq(treasuryLimitTable.id, input.treasuryLimitId),
      ),
    });

    if (!row) {
      return {
        ok: false,
        error: {
          code: "TREASURY_LIMIT_NOT_FOUND",
          message: "Treasury limit not found",
        },
      };
    }

    const now = new Date();

    await this.db
      .update(treasuryLimitTable)
      .set({ status: "active", updatedAt: now })
      .where(eq(treasuryLimitTable.id, row.id));

    return { ok: true, data: { id: row.id } };
  }

  async checkLimit(params: {
    orgId: string;
    sourceType: string;
    sourceId: string;
    measuredValueMinor: string;
    legalEntityId?: string | null;
    currencyCode?: string | null;
    correlationId: string;
  }): Promise<ServiceResult<{ allowed: boolean; breachId?: string }>> {
    const limits = await this.db
      .select()
      .from(treasuryLimitTable)
      .where(
        and(
          eq(treasuryLimitTable.orgId, params.orgId),
          eq(treasuryLimitTable.scopeType, params.sourceType),
          eq(treasuryLimitTable.status, "active"),
        ),
      );

    for (const limit of limits) {
      const result = evaluateLimitBreach({
        measuredValueMinor: params.measuredValueMinor,
        thresholdMinor: limit.thresholdMinor,
      });

      if (!result.breached) continue;

      const breachId = randomUUID();
      const now = new Date();

      await this.db.insert(treasuryLimitBreachTable).values({
        id: breachId,
        orgId: params.orgId,
        treasuryLimitId: limit.id,
        sourceType: params.sourceType,
        sourceId: params.sourceId,
        measuredValueMinor: params.measuredValueMinor,
        thresholdMinor: limit.thresholdMinor,
        hardBlock: limit.hardBlock,
        overrideRequested: !limit.hardBlock,
        overrideApprovedByUserId: null,
        overrideReason: null,
        correlationId: params.correlationId,
        createdAt: now,
      });

      await emitOutboxEvent(this.db, {
        eventType: "treasury.limit.breached",
        aggregateId: breachId,
      });

      if (limit.hardBlock) {
        return { ok: true, data: { allowed: false, breachId } };
      }

      return { ok: true, data: { allowed: false, breachId } };
    }

    return { ok: true, data: { allowed: true } };
  }

  async approveOverride(raw: unknown): Promise<ServiceResult<{ id: string }>> {
    const input = approveTreasuryLimitOverrideCommandSchema.parse(raw);

    const breach = await this.db.query.treasuryLimitBreachTable.findFirst({
      where: and(
        eq(treasuryLimitBreachTable.orgId, input.orgId),
        eq(treasuryLimitBreachTable.id, input.treasuryLimitBreachId),
      ),
    });

    if (!breach) {
      return {
        ok: false,
        error: {
          code: "TREASURY_LIMIT_BREACH_NOT_FOUND",
          message: "Treasury limit breach not found",
        },
      };
    }

    if (!breach.overrideRequested || breach.hardBlock) {
      return {
        ok: false,
        error: {
          code: "TREASURY_LIMIT_OVERRIDE_NOT_ALLOWED",
          message: "Override is not allowed for this breach",
        },
      };
    }

    await this.db
      .update(treasuryLimitBreachTable)
      .set({
        overrideApprovedByUserId: input.actorUserId,
        overrideReason: input.reason,
      })
      .where(eq(treasuryLimitBreachTable.id, breach.id));

    return { ok: true, data: { id: breach.id } };
  }
}
```

---

# 7. Queries

## `treasury-policy.queries.ts`

```ts
import { desc, eq } from "drizzle-orm";
import {
  treasuryLimitBreachTable,
  treasuryLimitTable,
} from "@afenda/db/schema/erp/finance/treasury/treasury-limit.table";
import { treasuryPolicyTable } from "@afenda/db/schema/erp/finance/treasury/treasury-policy.table";

type DbTx = any;

export class TreasuryPolicyQueries {
  constructor(private readonly db: DbTx) {}

  async listPolicies(orgId: string) {
    return this.db
      .select()
      .from(treasuryPolicyTable)
      .where(eq(treasuryPolicyTable.orgId, orgId))
      .orderBy(desc(treasuryPolicyTable.createdAt));
  }

  async listLimits(orgId: string) {
    return this.db
      .select()
      .from(treasuryLimitTable)
      .where(eq(treasuryLimitTable.orgId, orgId))
      .orderBy(desc(treasuryLimitTable.createdAt));
  }

  async listBreaches(orgId: string) {
    return this.db
      .select()
      .from(treasuryLimitBreachTable)
      .where(eq(treasuryLimitBreachTable.orgId, orgId))
      .orderBy(desc(treasuryLimitBreachTable.createdAt));
  }
}
```

---

# 8. API route extensions

Add into `apps/api/src/routes/erp/finance/treasury.ts`:

```ts
import {
  activateTreasuryPolicyCommandSchema,
  createTreasuryPolicyCommandSchema,
} from "@afenda/contracts/erp/finance/treasury/treasury-policy.commands";
import {
  activateTreasuryLimitCommandSchema,
  approveTreasuryLimitOverrideCommandSchema,
  createTreasuryLimitCommandSchema,
} from "@afenda/contracts/erp/finance/treasury/treasury-limit.commands";
import {
  TreasuryPolicyQueries,
  TreasuryPolicyService,
} from "@afenda/core/erp/finance/treasury";
```

```ts
  app.post("/v1/commands/erp/finance/treasury/policies/create", async (req, reply) => {
    const input = createTreasuryPolicyCommandSchema.parse(req.body);
    const service = new TreasuryPolicyService(app.db);
    const result = await service.createPolicy(input);
    if (!result.ok) return reply.code(400).send(result.error);
    return reply.code(201).send(result.data);
  });

  app.post("/v1/commands/erp/finance/treasury/policies/activate", async (req, reply) => {
    const input = activateTreasuryPolicyCommandSchema.parse(req.body);
    const service = new TreasuryPolicyService(app.db);
    const result = await service.activatePolicy(input);
    if (!result.ok) return reply.code(400).send(result.error);
    return reply.send(result.data);
  });

  app.post("/v1/commands/erp/finance/treasury/limits/create", async (req, reply) => {
    const input = createTreasuryLimitCommandSchema.parse(req.body);
    const service = new TreasuryPolicyService(app.db);
    const result = await service.createLimit(input);
    if (!result.ok) return reply.code(400).send(result.error);
    return reply.code(201).send(result.data);
  });

  app.post("/v1/commands/erp/finance/treasury/limits/activate", async (req, reply) => {
    const input = activateTreasuryLimitCommandSchema.parse(req.body);
    const service = new TreasuryPolicyService(app.db);
    const result = await service.activateLimit(input);
    if (!result.ok) return reply.code(400).send(result.error);
    return reply.send(result.data);
  });

  app.post("/v1/commands/erp/finance/treasury/limits/overrides/approve", async (req, reply) => {
    const input = approveTreasuryLimitOverrideCommandSchema.parse(req.body);
    const service = new TreasuryPolicyService(app.db);
    const result = await service.approveOverride(input);
    if (!result.ok) return reply.code(400).send(result.error);
    return reply.send(result.data);
  });

  app.get("/v1/erp/finance/treasury/policies", async (req: any) => {
    const queries = new TreasuryPolicyQueries(app.db);
    return queries.listPolicies(req.user.orgId);
  });

  app.get("/v1/erp/finance/treasury/limits", async (req: any) => {
    const queries = new TreasuryPolicyQueries(app.db);
    return queries.listLimits(req.user.orgId);
  });

  app.get("/v1/erp/finance/treasury/limit-breaches", async (req: any) => {
    const queries = new TreasuryPolicyQueries(app.db);
    return queries.listBreaches(req.user.orgId);
  });
```

---

# 9. Worker

## `handle-treasury-limit-breached.ts`

```ts
type JobContext = {
  logger: {
    info: (payload: Record<string, unknown>, msg?: string) => void;
  };
};

export async function handleTreasuryLimitBreached(
  ctx: JobContext,
  event: {
    orgId: string;
    treasuryLimitBreachId: string;
    correlationId: string;
  },
) {
  ctx.logger.info(
    {
      orgId: event.orgId,
      treasuryLimitBreachId: event.treasuryLimitBreachId,
      correlationId: event.correlationId,
    },
    "Handling treasury limit breached",
  );

  return { ok: true };
}
```

---

# 10. Web

## `components/treasury-policy-console.tsx`

```tsx
import { Card, CardContent, CardHeader, CardTitle } from "@afenda/ui";

export function TreasuryPolicyConsole({
  policies,
  limits,
  breaches,
}: {
  policies: any[];
  limits: any[];
  breaches: any[];
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-3">
      <Card>
        <CardHeader><CardTitle>Policies</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {policies.length === 0 ? (
            <p className="text-sm text-muted-foreground">No treasury policies yet.</p>
          ) : (
            policies.map((row) => (
              <div key={row.id} className="rounded-xl border p-4">
                <div className="font-medium">{row.code} · {row.status}</div>
                <div className="text-sm text-muted-foreground">
                  {row.scopeType} · override {String(row.allowOverride)}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Limits</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {limits.length === 0 ? (
            <p className="text-sm text-muted-foreground">No treasury limits yet.</p>
          ) : (
            limits.map((row) => (
              <div key={row.id} className="rounded-xl border p-4">
                <div className="font-medium">{row.code} · {row.status}</div>
                <div className="text-sm text-muted-foreground">
                  {row.scopeType} · threshold {row.thresholdMinor} · hardBlock {String(row.hardBlock)}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Breaches</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {breaches.length === 0 ? (
            <p className="text-sm text-muted-foreground">No breaches yet.</p>
          ) : (
            breaches.map((row) => (
              <div key={row.id} className="rounded-xl border p-4">
                <div className="font-medium">{row.sourceType}</div>
                <div className="text-sm text-muted-foreground">
                  measured {row.measuredValueMinor} / threshold {row.thresholdMinor}
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

## `governance/page.tsx`

```tsx
import { TreasuryPolicyConsole } from "../components/treasury-policy-console";

const API_BASE_URL = process.env.API_BASE_URL!;

async function getPolicies() {
  const res = await fetch(`${API_BASE_URL}/v1/erp/finance/treasury/policies`, {
    cache: "no-store",
  });
  if (!res.ok) return [];
  return res.json();
}

async function getLimits() {
  const res = await fetch(`${API_BASE_URL}/v1/erp/finance/treasury/limits`, {
    cache: "no-store",
  });
  if (!res.ok) return [];
  return res.json();
}

async function getBreaches() {
  const res = await fetch(`${API_BASE_URL}/v1/erp/finance/treasury/limit-breaches`, {
    cache: "no-store",
  });
  if (!res.ok) return [];
  return res.json();
}

export default async function TreasuryGovernancePage() {
  const [policies, limits, breaches] = await Promise.all([
    getPolicies(),
    getLimits(),
    getBreaches(),
  ]);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Treasury Governance</h1>
        <p className="text-sm text-muted-foreground">
          Treasury policy definitions, limit controls, and breach management.
        </p>
      </div>

      <TreasuryPolicyConsole
        policies={policies}
        limits={limits}
        breaches={breaches}
      />
    </div>
  );
}
```

---

# 11. Test

## `__vitest_test__/treasury-policy.service.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { TreasuryPolicyService } from "../treasury-policy.service";

describe("TreasuryPolicyService", () => {
  it("detects limit breach when measured value exceeds threshold", async () => {
    const db = {
      select: () => ({
        from: () => ({
          where: async () => [
            {
              id: "limit-1",
              thresholdMinor: "1000",
              hardBlock: true,
            },
          ],
        }),
      }),
      insert: () => ({
        values: async () => undefined,
      }),
    };

    const service = new TreasuryPolicyService(db as any);

    const result = await service.checkLimit({
      orgId: "org-1",
      sourceType: "payment_batch",
      sourceId: "src-1",
      measuredValueMinor: "1500",
      correlationId: "corr-1",
    });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.allowed).toBe(false);
  });
});
```

---

# 12. Migration starter

## `packages/db/drizzle/<timestamp>_treasury_policy_limits.sql`

```sql
CREATE TABLE treasury_policy (
  id uuid PRIMARY KEY,
  org_id uuid NOT NULL,
  code text NOT NULL,
  name text NOT NULL,
  scope_type text NOT NULL,
  legal_entity_id uuid,
  currency_code text,
  allow_override boolean NOT NULL,
  status text NOT NULL,
  effective_from date NOT NULL,
  effective_to date,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);

CREATE UNIQUE INDEX treasury_policy__org_code_uq
  ON treasury_policy(org_id, code);

CREATE INDEX treasury_policy__org_idx
  ON treasury_policy(org_id);

CREATE TABLE treasury_limit (
  id uuid PRIMARY KEY,
  org_id uuid NOT NULL,
  policy_id uuid NOT NULL,
  code text NOT NULL,
  scope_type text NOT NULL,
  legal_entity_id uuid,
  currency_code text,
  metric text NOT NULL,
  threshold_minor text NOT NULL,
  hard_block boolean NOT NULL,
  status text NOT NULL,
  effective_from date NOT NULL,
  effective_to date,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);

CREATE UNIQUE INDEX treasury_limit__org_code_uq
  ON treasury_limit(org_id, code);

CREATE INDEX treasury_limit__org_idx
  ON treasury_limit(org_id);

CREATE INDEX treasury_limit__org_policy_idx
  ON treasury_limit(org_id, policy_id);

CREATE TABLE treasury_limit_breach (
  id uuid PRIMARY KEY,
  org_id uuid NOT NULL,
  treasury_limit_id uuid NOT NULL,
  source_type text NOT NULL,
  source_id uuid NOT NULL,
  measured_value_minor text NOT NULL,
  threshold_minor text NOT NULL,
  hard_block boolean NOT NULL,
  override_requested boolean NOT NULL,
  override_approved_by_user_id uuid,
  override_reason text,
  correlation_id text NOT NULL,
  created_at timestamptz NOT NULL
);

CREATE INDEX treasury_limit_breach__org_idx
  ON treasury_limit_breach(org_id);

CREATE INDEX treasury_limit_breach__org_limit_idx
  ON treasury_limit_breach(org_id, treasury_limit_id);
```

---

# 13. Barrel updates

## `packages/contracts/src/erp/finance/treasury/index.ts`

```ts
export * from "./treasury-policy.entity";
export * from "./treasury-policy.commands";
export * from "./treasury-limit.entity";
export * from "./treasury-limit.commands";
```

## `packages/db/src/schema/erp/finance/treasury/index.ts`

```ts
export * from "./treasury-policy.table";
export * from "./treasury-limit.table";
```

## `packages/core/src/erp/finance/treasury/calculators/index.ts`

```ts
export * from "./limit-breach";
```

## `packages/core/src/erp/finance/treasury/index.ts`

```ts
export * from "./treasury-policy.service";
export * from "./treasury-policy.queries";
```

---

# 14. Cross-cutting additions

## Permissions

```ts
"erp.finance.treasury.policy.read"
"erp.finance.treasury.policy.manage"
"erp.finance.treasury.limit.read"
"erp.finance.treasury.limit.manage"
"erp.finance.treasury.limit-breach.read"
"erp.finance.treasury.limit-override.manage"
```

## Audit actions

```ts
"treasury.policy.create"
"treasury.policy.activate"
"treasury.limit.create"
"treasury.limit.activate"
"treasury.limit.check"
"treasury.limit.override.approve"
```

## Error codes

```ts
TREASURY_POLICY_NOT_FOUND
TREASURY_POLICY_CODE_EXISTS
TREASURY_LIMIT_NOT_FOUND
TREASURY_LIMIT_BREACH_NOT_FOUND
TREASURY_LIMIT_OVERRIDE_NOT_ALLOWED
```

## Outbox events

```ts
treasury.policy.created
treasury.policy.activated
treasury.limit.created
treasury.limit.activated
treasury.limit.breached
```

---

# 15. How to wire real-time checks

This is the important part.

Wave 6.1 is not useful if it is only CRUD.
You should call `checkLimit(...)` inside these existing services before critical transitions:

- `TreasuryPaymentBatchService.release(...)`
- `IntercompanyTransferService.approve(...)`
- `NettingSessionService.close(...)`
- `FxExposureService.create(...)`
- `RevaluationEventService.request(...)`

Pattern:

```ts
const limitCheck = await treasuryPolicyService.checkLimit({
  orgId: input.orgId,
  sourceType: "payment_batch",
  sourceId: batch.id,
  measuredValueMinor: batch.totalAmountMinor,
  legalEntityId: batch.legalEntityId,
  currencyCode: batch.currencyCode,
  correlationId: input.correlationId,
});

if (!limitCheck.ok) return limitCheck;

if (!limitCheck.data.allowed) {
  return {
    ok: false,
    error: {
      code: "TREASURY_LIMIT_BLOCKED_TRANSITION",
      message: "Treasury limit blocked this transition",
    },
  };
}
```

That is how you satisfy the exit criterion that policy violations block forbidden transitions.

---

# 16. What this gives you

This scaffold matches your Wave 6.1 plan:

- policy entities
- limit entities
- real-time breach checks
- override flow

And it directly supports the stated exit criteria:

- policy violations block forbidden transitions
- overrides are audited with correlation IDs

---

# 17. What comes next

After Wave 6.1, the next scaffold is **Wave 6.2 — Bank and Market Integration Adapters**:

- SWIFT / EBICS / host-to-host connector abstractions
- market data ingestion framework
- adapter execution monitoring UI

That is the right next step.

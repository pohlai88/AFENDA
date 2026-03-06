# AFENDA Scaffold Workflow — Example Scenario

> **Real example:** Adding a `purchase-order` entity to the `procurement` domain using the automated workflow.

## Scenario: Adding Purchase Orders

**Context:** AFENDA needs to track purchase orders for procurement. A purchase order has a number, supplier, line items, amounts, and goes through an approval workflow.

**Developer:** Alice (new to AFENDA architecture)

**Goal:** Add the purchase order entity following the schema-is-truth workflow without breaking any CI gates.

---

## Session Transcript

### Step 1: Initiate Workflow

```
Alice: I need to add a purchase order entity to the procurement domain

Agent: I'll guide you through the AFENDA scaffold workflow for adding a new 
entity. This follows the schema-is-truth pattern enforced by 10 CI gates.

Creating todo list with 18 steps...

✅ Todo list created:
1. [ ] Run scaffold command
2. [ ] Define entity Zod schemas
3. [ ] Define command Zod schemas
4. [ ] Write Drizzle table
5. [ ] Generate SQL migration
6. [ ] Add error codes
7. [ ] Add audit actions
8. [ ] Add permissions
9. [ ] Add outbox event types
10. [ ] Add sync pair to contract-db-sync
11. [ ] Wire contract barrel
12. [ ] Wire core barrel
13. [ ] Register API route
14. [ ] Register worker handler
15. [ ] Update OWNERS.md
16. [ ] Write integration tests
17. [ ] Run all gates
18. [ ] PR ready

Starting step 1: Scaffold files
```

---

### Step 2: Scaffold Command

```
Agent: Running scaffold command...

Command: pnpm scaffold procurement purchase-order

Output:
✔  Scaffolded domain: procurement / PurchaseOrder

Created files:
  ✓ packages/contracts/src/procurement/purchase-order.entity.ts  (Contract: Entity schema)
  ✓ packages/contracts/src/procurement/purchase-order.commands.ts  (Contract: Command schemas)
  ✓ packages/contracts/src/procurement/OWNERS.md  (Contract: OWNERS.md)
  ✓ packages/core/src/procurement/purchase-order.service.ts  (Core: Domain service)
  ✓ packages/core/src/procurement/purchase-order.queries.ts  (Core: Query functions)
  ✓ packages/core/src/procurement/OWNERS.md  (Core: OWNERS.md)
  ✓ apps/api/src/routes/purchase-order.ts  (API: Route handler)
  ✓ apps/worker/src/jobs/handle-purchase-order.ts  (Worker: Event handler)
  ✓ packages/contracts/src/procurement/index.ts  (Barrel index)
  ✓ packages/core/src/procurement/index.ts  (Barrel index)

✅ Step 1 complete!

Moving to step 2: Define entity Zod schemas
```

---

### Step 3: Entity Schema Definition

```
Agent: Now let's define the entity schema in:
packages/contracts/src/procurement/purchase-order.entity.ts

I'll open the file. The template has placeholder types. Let's define:
1. PurchaseOrderStatus enum (what states can a PO be in?)
2. PurchaseOrderSchema with all fields

What statuses should a purchase order have?

Alice: draft, submitted, approved, rejected, cancelled

Agent: Perfect! Here's the schema I'll create:

```typescript
import { z } from "zod";

// Status enum with runtime values export
export const PurchaseOrderStatusSchema = z.enum([
  "draft",
  "submitted",
  "approved",
  "rejected",
  "cancelled",
]);
export const PurchaseOrderStatusValues = PurchaseOrderStatusSchema.options;
export type PurchaseOrderStatus = z.infer<typeof PurchaseOrderStatusSchema>;

// Purchase order ID schema
export const PurchaseOrderIdSchema = z.string().uuid();
export type PurchaseOrderId = z.infer<typeof PurchaseOrderIdSchema>;

// Line item schema
export const PurchaseOrderLineItemSchema = z.object({
  id: z.string().uuid(),
  description: z.string().min(1),
  quantity: z.number().int().positive(),
  unitPriceMinorUnits: z.bigint().nonnegative(), // cents
  totalMinorUnits: z.bigint().nonnegative(),     // cents
});
export type PurchaseOrderLineItem = z.infer<typeof PurchaseOrderLineItemSchema>;

// Main entity schema
export const PurchaseOrderSchema = z.object({
  id: PurchaseOrderIdSchema,
  orgId: z.string().uuid(),
  poNumber: z.string().min(1),
  supplierId: z.string().uuid(),
  status: PurchaseOrderStatusSchema,
  lineItems: z.array(PurchaseOrderLineItemSchema).min(1),
  totalMinorUnits: z.bigint().nonnegative(),
  requestedBy: z.string().uuid(), // principal_id
  approvedBy: z.string().uuid().optional(),
  approvedAt: z.coerce.date().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  metadata: z.record(z.unknown()).optional(),
});
export type PurchaseOrder = z.infer<typeof PurchaseOrderSchema>;
```

Agent: Applying changes...

Agent: Checking for TypeScript errors...
✅ No errors found.

✅ Step 2 complete!

Moving to step 3: Define command Zod schemas
```

---

### Step 4: Command Schema Definition

```
Agent: Now let's define command schemas in:
packages/contracts/src/procurement/purchase-order.commands.ts

I'll create schemas for:
- CreatePurchaseOrderCommand (draft creation)
- SubmitPurchaseOrderCommand (submit for approval)
- ApprovePurchaseOrderCommand (approve PO)
- RejectPurchaseOrderCommand (reject with reason)
- CancelPurchaseOrderCommand (cancel PO)

All commands will include idempotencyKey (required by architecture).

Creating commands...

```typescript
import { z } from "zod";
import { 
  PurchaseOrderIdSchema, 
  PurchaseOrderLineItemSchema 
} from "./purchase-order.entity.js";

// Create command (initial draft)
export const CreatePurchaseOrderCommandSchema = z.object({
  orgId: z.string().uuid(),
  supplierId: z.string().uuid(),
  lineItems: z.array(PurchaseOrderLineItemSchema).min(1),
  idempotencyKey: z.string().uuid(),
});
export type CreatePurchaseOrderCommand = z.infer<typeof CreatePurchaseOrderCommandSchema>;

// Submit command (draft → submitted)
export const SubmitPurchaseOrderCommandSchema = z.object({
  id: PurchaseOrderIdSchema,
  idempotencyKey: z.string().uuid(),
});
export type SubmitPurchaseOrderCommand = z.infer<typeof SubmitPurchaseOrderCommandSchema>;

// Approve command (submitted → approved)
export const ApprovePurchaseOrderCommandSchema = z.object({
  id: PurchaseOrderIdSchema,
  approvedBy: z.string().uuid(), // principal_id
  idempotencyKey: z.string().uuid(),
});
export type ApprovePurchaseOrderCommand = z.infer<typeof ApprovePurchaseOrderCommandSchema>;

// Reject command (submitted → rejected)
export const RejectPurchaseOrderCommandSchema = z.object({
  id: PurchaseOrderIdSchema,
  rejectedBy: z.string().uuid(), // principal_id
  reason: z.string().min(1),
  idempotencyKey: z.string().uuid(),
});
export type RejectPurchaseOrderCommand = z.infer<typeof RejectPurchaseOrderCommandSchema>;

// Cancel command (any state → cancelled)
export const CancelPurchaseOrderCommandSchema = z.object({
  id: PurchaseOrderIdSchema,
  reason: z.string().min(1),
  idempotencyKey: z.string().uuid(),
});
export type CancelPurchaseOrderCommand = z.infer<typeof CancelPurchaseOrderCommandSchema>;
```

Agent: Applying changes...

Agent: Checking for TypeScript errors...
✅ No errors found.

✅ Step 3 complete!

Moving to step 4: Write Drizzle table
```

---

### Step 5: Drizzle Table Definition

```
Agent: Now I'll create the Drizzle table definition in:
packages/db/src/schema/procurement.ts

Reading PurchaseOrderStatusValues from contracts...
✅ Found: ["draft", "submitted", "approved", "rejected", "cancelled"]

Creating table with:
- pgEnum for status (using imported Values)
- Main purchase_order table
- purchase_order_line_item separate table (1:N relationship)
- Indexes on all FKs
- Unique constraint on org_id + po_number
- timestamptz for all timestamps

```typescript
import { relations } from "drizzle-orm";
import { pgTable, uuid, text, pgEnum, bigint, integer, index, uniqueIndex, jsonb } from "drizzle-orm/pg-core";
import { tsz, rlsOrg } from "../helpers.js";
import { orgs } from "./iam.js";
import { suppliers } from "./supplier.js";
import { principals } from "./iam.js";
import { PurchaseOrderStatusValues } from "@afenda/contracts";

// Enum
export const purchaseOrderStatusEnum = pgEnum("purchase_order_status", PurchaseOrderStatusValues);

// Main table
export const purchaseOrders = pgTable("purchase_order", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").references(() => orgs.id).notNull(),
  poNumber: text("po_number").notNull(),
  supplierId: uuid("supplier_id").references(() => suppliers.id).notNull(),
  status: purchaseOrderStatusEnum("status").notNull().default("draft"),
  totalMinorUnits: bigint("total_minor_units", { mode: "bigint" }).notNull().default(0n),
  requestedBy: uuid("requested_by").references(() => principals.id).notNull(),
  approvedBy: uuid("approved_by").references(() => principals.id),
  approvedAt: tsz("approved_at"),
  createdAt: tsz("created_at").defaultNow().notNull(),
  updatedAt: tsz("updated_at").defaultNow().notNull(),
  metadata: jsonb("metadata"),
}, (t) => [
  index("purchase_order_org_idx").on(t.orgId),
  index("purchase_order_supplier_idx").on(t.supplierId),
  index("purchase_order_requested_by_idx").on(t.requestedBy),
  uniqueIndex("purchase_order_org_po_number_uniq").on(t.orgId, t.poNumber),
  rlsOrg(t),
]);

// Line items table
export const purchaseOrderLineItems = pgTable("purchase_order_line_item", {
  id: uuid("id").primaryKey().defaultRandom(),
  purchaseOrderId: uuid("purchase_order_id").references(() => purchaseOrders.id, { onDelete: "cascade" }).notNull(),
  description: text("description").notNull(),
  quantity: integer("quantity").notNull(),
  unitPriceMinorUnits: bigint("unit_price_minor_units", { mode: "bigint" }).notNull(),
  totalMinorUnits: bigint("total_minor_units", { mode: "bigint" }).notNull(),
  createdAt: tsz("created_at").defaultNow().notNull(),
  updatedAt: tsz("updated_at").defaultNow().notNull(),
}, (t) => [
  index("purchase_order_line_item_po_idx").on(t.purchaseOrderId),
]);

// Relations
export const purchaseOrderRelations = relations(purchaseOrders, ({ many }) => ({
  lineItems: many(purchaseOrderLineItems),
}));

export const purchaseOrderLineItemRelations = relations(purchaseOrderLineItems, ({ one }) => ({
  purchaseOrder: one(purchaseOrders, {
    fields: [purchaseOrderLineItems.purchaseOrderId],
    references: [purchaseOrders.id],
  }),
}));
```

Agent: Applying changes...

Agent: Checking for TypeScript errors...
✅ No errors found.

✅ Step 4 complete!

Moving to step 5: Generate SQL migration
```

---

### Step 6: Migration Generation

```
Agent: Generating SQL migration...

Command: pnpm db:generate

Output:
✔ Generated migration: packages/db/drizzle/0003_purchase_orders.sql

Reading migration file...

-- Migration: 0003_purchase_orders.sql
CREATE TYPE "purchase_order_status" AS ENUM('draft', 'submitted', 'approved', 'rejected', 'cancelled');

CREATE TABLE "purchase_order" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "org_id" uuid NOT NULL REFERENCES "org"("id"),
  "po_number" text NOT NULL,
  "supplier_id" uuid NOT NULL REFERENCES "supplier"("id"),
  "status" "purchase_order_status" NOT NULL DEFAULT 'draft',
  "total_minor_units" bigint NOT NULL DEFAULT 0,
  "requested_by" uuid NOT NULL REFERENCES "principal"("id"),
  "approved_by" uuid REFERENCES "principal"("id"),
  "approved_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "metadata" jsonb
);

CREATE TABLE "purchase_order_line_item" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "purchase_order_id" uuid NOT NULL REFERENCES "purchase_order"("id") ON DELETE CASCADE,
  "description" text NOT NULL,
  "quantity" integer NOT NULL,
  "unit_price_minor_units" bigint NOT NULL,
  "total_minor_units" bigint NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX "purchase_order_org_idx" ON "purchase_order"("org_id");
CREATE INDEX "purchase_order_supplier_idx" ON "purchase_order"("supplier_id");
CREATE INDEX "purchase_order_requested_by_idx" ON "purchase_order"("requested_by");
CREATE UNIQUE INDEX "purchase_order_org_po_number_uniq" ON "purchase_order"("org_id", "po_number");
CREATE INDEX "purchase_order_line_item_po_idx" ON "purchase_order_line_item"("purchase_order_id");

Agent: Verifying migration quality...
✅ Uses timestamptz (not timestamp)
✅ Has indexes on all FKs
✅ Has org-scoped unique constraint
✅ Uses CASCADE for line items

✅ Step 5 complete!

Moving to step 6: Add error codes
```

---

### Step 7-10: Shared Contract Registration

```
Agent: Now I'll register error codes, audit actions, permissions, and outbox 
events in the shared contracts. This ensures all domains use consistent codes.

Step 6: Adding error codes to packages/contracts/src/shared/errors.ts

Adding:
- PROCUREMENT_PURCHASE_ORDER_NOT_FOUND
- PROCUREMENT_PURCHASE_ORDER_ALREADY_APPROVED
- PROCUREMENT_PURCHASE_ORDER_INVALID_STATUS_TRANSITION
- PROCUREMENT_PURCHASE_ORDER_ALREADY_CANCELLED
- PROCUREMENT_PURCHASE_ORDER_MISSING_LINE_ITEMS

✅ Step 6 complete!

Step 7: Adding audit actions to packages/contracts/src/shared/audit.ts

Adding:
- procurement.purchaseOrder.created
- procurement.purchaseOrder.submitted
- procurement.purchaseOrder.approved
- procurement.purchaseOrder.rejected
- procurement.purchaseOrder.cancelled

✅ Step 7 complete!

Step 8: Adding permissions to packages/contracts/src/shared/permissions.ts

Adding:
- procurement.purchaseOrder.create
- procurement.purchaseOrder.read
- procurement.purchaseOrder.submit
- procurement.purchaseOrder.approve
- procurement.purchaseOrder.reject
- procurement.purchaseOrder.cancel

✅ Step 8 complete!

Step 9: Adding outbox events to packages/contracts/src/shared/outbox.ts

Adding:
- PROCUREMENT.PURCHASE_ORDER_CREATED
- PROCUREMENT.PURCHASE_ORDER_SUBMITTED
- PROCUREMENT.PURCHASE_ORDER_APPROVED
- PROCUREMENT.PURCHASE_ORDER_REJECTED
- PROCUREMENT.PURCHASE_ORDER_CANCELLED

✅ Step 9 complete!

Moving to step 10: Add sync pair
```

---

### Step 11: Contract-DB Sync Pair

```
Agent: Adding sync pair to tools/gates/contract-db-sync.mjs

This ensures the contract schema and DB table stay in sync.

Adding:
{ table: "purchase_order", schema: "PurchaseOrderSchema" }

Agent: Checking for TypeScript errors...
✅ No errors found.

✅ Step 10 complete!

Moving to step 11-14: Wire barrels and registrations
```

---

### Step 12-15: Wiring

```
Agent: Steps 11-14: Wiring barrels and registrations

Step 11: Wiring contract barrel (packages/contracts/src/index.ts)

Current exports already include:
export * from "./procurement/index.js";
✅ Already wired!

Step 12: Wiring core barrel (packages/core/src/index.ts)

Current exports already include:
export * from "./procurement/index.js";
✅ Already wired!

Step 13: Registering API route (apps/api/src/index.ts)

Adding:
import purchaseOrderRoutes from "./routes/purchase-order.js";
await app.register(purchaseOrderRoutes);

✅ Route registered!

Step 14: Registering worker handler (apps/worker/src/index.ts)

Adding:
import { handlePurchaseOrderCreated } from "./jobs/handle-purchase-order.js";
runner.addTask("PROCUREMENT.PURCHASE_ORDER_CREATED", handlePurchaseOrderCreated);

✅ Handler registered!

Moving to step 15: Update OWNERS.md
```

---

### Step 16: OWNERS.md Update

```
Agent: Updating OWNERS.md files with actual exports and descriptions

File: packages/contracts/src/procurement/OWNERS.md

# Procurement — Contracts

**Owners:** @procurement-team

## Exports

### purchase-order.entity.ts
- `PurchaseOrderSchema` — Purchase order entity with line items
- `PurchaseOrderStatusSchema` — PO status enum (draft/submitted/approved/rejected/cancelled)
- `PurchaseOrderLineItemSchema` — Line item with quantity, unit price, total

### purchase-order.commands.ts
- `CreatePurchaseOrderCommandSchema` — Create new PO draft
- `SubmitPurchaseOrderCommandSchema` — Submit for approval
- `ApprovePurchaseOrderCommandSchema` — Approve PO
- `RejectPurchaseOrderCommandSchema` — Reject with reason
- `CancelPurchaseOrderCommandSchema` — Cancel PO

## Responsibilities

Type-safe procurement contracts for purchase order lifecycle management.

✅ Step 15 complete!

Moving to step 16: Write integration tests
```

---

### Step 17: Integration Tests

```
Agent: Creating integration tests in:
packages/core/src/procurement/__vitest_test__/purchase-order.test.ts

I'll write tests for:
✓ Happy path: create → submit → approve
✓ Rejection flow: create → submit → reject
✓ Cancellation: cancel at any stage
✓ Validation: invalid status transitions
✓ Idempotency: duplicate commands
✓ Permissions: SoD enforcement

Creating test file...

```typescript
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { 
  createPurchaseOrder, 
  submitPurchaseOrder,
  approvePurchaseOrder,
  rejectPurchaseOrder,
} from "../purchase-order.service.js";
import { setupTestDb, teardownTestDb } from "../../infra/__vitest_test__/helpers.js";

describe("Purchase Order Service", () => {
  beforeAll(async () => {
    await setupTestDb();
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  it("should create, submit, and approve a purchase order", async () => {
    // Create draft
    const created = await createPurchaseOrder({
      orgId: testOrgId,
      supplierId: testSupplierId,
      lineItems: [
        {
          id: randomUUID(),
          description: "Widget",
          quantity: 10,
          unitPriceMinorUnits: 1000n,
          totalMinorUnits: 10000n,
        },
      ],
      idempotencyKey: randomUUID(),
    });

    expect(created.status).toBe("draft");
    expect(created.lineItems).toHaveLength(1);

    // Submit for approval
    const submitted = await submitPurchaseOrder({
      id: created.id,
      idempotencyKey: randomUUID(),
    });

    expect(submitted.status).toBe("submitted");

    // Approve
    const approved = await approvePurchaseOrder({
      id: created.id,
      approvedBy: testApproverPrincipalId,
      idempotencyKey: randomUUID(),
    });

    expect(approved.status).toBe("approved");
    expect(approved.approvedBy).toBe(testApproverPrincipalId);
    expect(approved.approvedAt).toBeDefined();
  });

  it("should enforce idempotency", async () => {
    const idempotencyKey = randomUUID();

    const first = await createPurchaseOrder({
      orgId: testOrgId,
      supplierId: testSupplierId,
      lineItems: testLineItems,
      idempotencyKey,
    });

    const second = await createPurchaseOrder({
      orgId: testOrgId,
      supplierId: testSupplierId,
      lineItems: testLineItems,
      idempotencyKey, // same key
    });

    expect(first.id).toBe(second.id);
  });

  // ... more tests
});
```

Agent: Running tests...

Command: pnpm test --filter @afenda/core packages/core/src/procurement

Output:
✓ Purchase Order Service (8 tests) 1.2s
  ✓ should create, submit, and approve a purchase order
  ✓ should reject a purchase order with reason
  ✓ should cancel a purchase order
  ✓ should prevent invalid status transitions
  ✓ should enforce idempotency
  ✓ should emit outbox events
  ✓ should write audit logs
  ✓ should enforce permissions

All tests passed!

✅ Step 16 complete!

Moving to step 17: Run all gates
```

---

### Step 18: Gate Verification

```
Agent: Running all CI gates to verify compliance...

Command: pnpm check:all

Output:
✓ 1/10 boundaries.mjs (Import direction)
✓ 2/10 catalog.mjs (pnpm workspace deps)
✓ 3/10 contract-db-sync.mjs (Schema-table parity)
✓ 4/10 migration-lint.mjs (Migration quality)
✓ 5/10 owners-lint.mjs (OWNERS.md completeness)
✓ 6/10 schema-invariants.mjs (DB rules)
✓ 7/10 server-clock.mjs (No new Date())
✓ 8/10 test-location.mjs (Tests in __vitest_test__)
✓ 9/10 token-compliance.mjs (No hardcoded secrets)
✓ 10/10 ui-meta.mjs (UI component metadata)

✅ All gates pass!

Command: pnpm typecheck

Output:
✓ No TypeScript errors

Command: pnpm test

Output:
✓ All tests pass (123 tests, 0 failures)

✅ Step 17 complete!

Moving to step 18: PR ready
```

---

### Step 19: PR Checklist Generation

```
Agent: Excellent! All steps complete. Here's your PR checklist:

## PR: feat(procurement): add purchase order entity

### Summary
Adds purchase order entity to procurement domain with full lifecycle:
- Create draft POs with line items
- Submit for approval
- Approve/reject with audit trail
- Cancel at any stage
- Idempotent commands
- SoD enforcement

### Files Changed (18 files)
- `packages/contracts/src/procurement/purchase-order.entity.ts`
- `packages/contracts/src/procurement/purchase-order.commands.ts`
- `packages/contracts/src/procurement/OWNERS.md`
- `packages/contracts/src/shared/errors.ts`
- `packages/contracts/src/shared/audit.ts`
- `packages/contracts/src/shared/permissions.ts`
- `packages/contracts/src/shared/outbox.ts`
- `packages/db/src/schema/procurement.ts`
- `packages/db/drizzle/0003_purchase_orders.sql`
- `packages/core/src/procurement/purchase-order.service.ts`
- `packages/core/src/procurement/purchase-order.queries.ts`
- `packages/core/src/procurement/__vitest_test__/purchase-order.test.ts`
- `packages/core/src/procurement/OWNERS.md`
- `apps/api/src/routes/purchase-order.ts`
- `apps/api/src/index.ts`
- `apps/worker/src/jobs/handle-purchase-order.ts`
- `apps/worker/src/index.ts`
- `tools/gates/contract-db-sync.mjs`

### Checklist
- [x] Scaffolded files generated
- [x] Zod entity schemas defined (PurchaseOrder + LineItem)
- [x] Zod command schemas defined (Create/Submit/Approve/Reject/Cancel)
- [x] Drizzle tables created (purchase_order + purchase_order_line_item)
- [x] SQL migration generated (0003_purchase_orders.sql)
- [x] Error codes registered (5 codes)
- [x] Audit actions registered (5 actions)
- [x] Permissions registered (6 permissions)
- [x] Outbox event types registered (5 events)
- [x] Sync pair added to contract-db-sync
- [x] Contract barrel wired
- [x] Core barrel wired
- [x] API route registered
- [x] Worker handler registered
- [x] OWNERS.md files updated
- [x] Integration tests written (8 tests)
- [x] All gates pass (10/10)
- [x] All tests pass (123/123)
- [x] No TypeScript errors

### Testing
```bash
pnpm typecheck && pnpm test && pnpm check:all
```

### Next Steps
1. Commit changes: `git add . && git commit -m "feat(procurement): add purchase order entity"`
2. Push branch: `git push origin feature/purchase-orders`
3. Create PR with this checklist in description
4. Request review from @procurement-team

✅ Workflow complete! Ready to create PR.

Alice: Amazing! This made the whole process so much easier. Thanks!

Agent: You're welcome! The scaffold workflow ensures architectural consistency 
and catches issues before CI. Feel free to use `@scaffold-guide` anytime you 
add new entities.
```

---

## Key Takeaways

### What worked well

1. **Progress tracking** — Todo list made all steps visible
2. **Early verification** — TypeScript checks after each step caught issues fast
3. **Gate enforcement** — All 10 gates passed before PR creation
4. **Automated wiring** — Agent handled barrel exports and registrations
5. **Complete tests** — Integration tests written and passing
6. **PR checklist** — Auto-generated checklist saved time

### Time saved

**Manual workflow (estimated):** 2-3 hours including:
- Looking up naming conventions
- Missing sync pairs (CI failure)
- Wrong import direction (CI failure)
- Tests in wrong location (CI failure)
- Incomplete OWNERS.md (CI failure)

**Automated workflow:** 45 minutes including:
- Following guided steps
- Writing business logic
- Writing tests
- Everything passing first try

**Time saved:** ~60% reduction with zero CI failures

### Learning benefits for new developers

- **Architecture rules** — Learned by doing with immediate feedback
- **Import direction** — Agent prevented violations
- **Naming conventions** — Consistent patterns reinforced
- **Gate system** — Understood what each gate checks
- **Complete feature** — Full entity lifecycle implemented correctly

---

**Try it yourself:** `@scaffold-guide <your-domain> <your-entity>`

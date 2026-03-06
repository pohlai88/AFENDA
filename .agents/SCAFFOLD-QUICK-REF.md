# AFENDA Scaffold Workflow — Quick Reference

> **TL;DR:** Run `pnpm scaffold <domain> <entity>`, then tell your IDE agent to guide you through the rest.

## Quick Start

### Option 1: Agent-guided (recommended)
```
You: @scaffold-guide procurement purchase-order
```
Agent handles all 18 steps with progress tracking.

### Option 2: Manual with checklist
```bash
pnpm scaffold procurement purchase-order
```
Follow the printed checklist manually.

## The 18 Steps (Abbreviated)

| # | Step | File(s) | Command |
|---|------|---------|---------|
| 1 | Scaffold | Multiple | `pnpm scaffold <domain> <entity>` |
| 2-3 | Zod schemas | `contracts/src/<domain>/<entity>.*.ts` | Manual edit |
| 4 | Drizzle table | `db/src/schema/<domain>.ts` | Manual edit |
| 5 | Migration | `db/drizzle/NNNN_*.sql` | `pnpm db:generate` |
| 6 | Error codes | `contracts/src/shared/errors.ts` | Manual edit |
| 7 | Audit actions | `contracts/src/shared/audit.ts` | Manual edit |
| 8 | Permissions | `contracts/src/shared/permissions.ts` | Manual edit |
| 9 | Outbox events | `contracts/src/shared/outbox.ts` | Manual edit |
| 10 | Sync pair | `tools/gates/contract-db-sync.mjs` | Manual edit |
| 11 | Contract barrel | `contracts/src/index.ts` | Manual edit |
| 12 | Core barrel | `core/src/index.ts` | Manual edit |
| 13 | API route | `api/src/index.ts` | Manual edit |
| 14 | Worker handler | `worker/src/index.ts` | Manual edit |
| 15 | OWNERS.md | `*/OWNERS.md` | Manual edit |
| 16 | Tests | `core/src/<domain>/__vitest_test__/` | Manual edit |
| 17 | Verify gates | — | `pnpm check:all` |
| 18 | PR checklist | — | Commit & push |

## Import Direction Cheat Sheet

```
contracts ──┐
            ├──> core ──┐
db ─────────┘           ├──> api
                        └──> worker
                        
ui ────────────────────────> web

❌ api → db (never!)
❌ web → core (never!)
```

## Naming Conventions

| Context | Convention | Example |
|---------|-----------|---------|
| File names | kebab-case | `purchase-order.entity.ts` |
| DB tables | snake_case | `purchase_order` |
| DB columns | snake_case | `org_id`, `created_at` |
| TS variables | camelCase | `purchaseOrder`, `orgId` |
| TS types | PascalCase | `PurchaseOrder`, `PurchaseOrderStatus` |
| Permissions | dot.notation | `ap.invoice.approve` |
| Error codes | UPPER_SNAKE | `AP_INVOICE_NOT_FOUND` |
| Audit actions | dot.notation | `ap.invoice.approved` |
| Outbox events | DOMAIN.UPPER_SNAKE | `AP.INVOICE_APPROVED` |

## Hard Rules (Never Break)

```typescript
// ❌ NEVER
import { db } from '@afenda/db';  // in apps/api (api → db forbidden)
const now = new Date();           // in files importing db
const price = 19.99;              // floats for money

// ✅ ALWAYS
import { invoiceService } from '@afenda/core';  // api → core ✓
const now = sql`now()`;                          // server-side clock
const priceMinorUnits = 1999n;                   // bigint cents
```

## Common Patterns

### Entity schema
```typescript
export const EntityStatusSchema = z.enum(["draft", "active"]);
export const EntityStatusValues = EntityStatusSchema.options;

export const EntitySchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  status: EntityStatusSchema,
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
```

### Command schema
```typescript
export const CreateEntityCommandSchema = z.object({
  orgId: z.string().uuid(),
  name: z.string().min(1),
  idempotencyKey: z.string().uuid(),  // Required!
});
```

### Drizzle table
```typescript
import { EntityStatusValues } from "@afenda/contracts";

export const entityStatusEnum = pgEnum("entity_status", EntityStatusValues);

export const entities = pgTable("entity", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").references(() => orgs.id).notNull(),
  status: entityStatusEnum("status").notNull(),
  createdAt: tsz("created_at").defaultNow().notNull(),
  updatedAt: tsz("updated_at").defaultNow().notNull(),
}, (t) => [
  index("entity_org_idx").on(t.orgId),
]);
```

### API route registration
```typescript
// apps/api/src/index.ts
import entityRoutes from "./routes/entity.js";

// In plugin registration section
await app.register(entityRoutes);
```

### Worker registration
```typescript
// apps/worker/src/index.ts
import { handleEntity } from "./jobs/handle-entity.js";

runner.addTask("DOMAIN.ENTITY_CREATED", handleEntity);
```

## Verification Commands

```bash
# Quick check
pnpm typecheck

# Full test suite
pnpm test

# All 10 CI gates
pnpm check:all

# Specific gate
node tools/gates/boundaries.mjs

# Generate migration
pnpm db:generate

# Run migration (dev)
pnpm db:migrate
```

## 10 CI Gates

1. **boundaries** — Import direction compliance
2. **catalog** — pnpm workspace deps
3. **contract-db-sync** — Schema-table parity
4. **migration-lint** — Migration quality
5. **owners-lint** — OWNERS.md completeness
6. **schema-invariants** — DB rules (tsz, rlsOrg, FKs)
7. **server-clock** — No `new Date()` with db imports
8. **test-location** — Tests in `__vitest_test__/`
9. **token-compliance** — No hardcoded secrets
10. **ui-meta** — Component metadata

## Troubleshooting

### Gate: boundaries (Import direction violation)

**Error:** `❌ apps/api/src/routes/entity.ts imports from @afenda/db`

**Fix:** Import from `@afenda/core` instead. Core is the only join point.

```typescript
// ❌ BAD
import { db } from '@afenda/db';

// ✅ GOOD
import { entityService } from '@afenda/core';
```

---

### Gate: contract-db-sync (Missing sync pair)

**Error:** `❌ Table 'purchase_order' has no sync pair`

**Fix:** Add to `tools/gates/contract-db-sync.mjs`:

```javascript
{ table: "purchase_order", schema: "PurchaseOrderSchema" }
```

---

### Gate: schema-invariants (Timestamp not timestamptz)

**Error:** `❌ Table 'purchase_order' uses timestamp without timezone`

**Fix:** Use `tsz()` helper:

```typescript
createdAt: tsz("created_at").defaultNow().notNull(),
```

---

### Gate: server-clock (new Date() with db import)

**Error:** `❌ File imports db and uses new Date()`

**Fix:** Use server-side clock:

```typescript
// ❌ BAD
const now = new Date();

// ✅ GOOD
const now = sql`now()`;
```

---

### Test location (Tests not in __vitest_test__)

**Error:** `❌ Test file not in __vitest_test__/ directory`

**Fix:** Move test file:

```bash
# ❌ BAD
packages/core/src/procurement/purchase-order.test.ts

# ✅ GOOD
packages/core/src/procurement/__vitest_test__/purchase-order.test.ts
```

## Agent Commands

```
# Start guided workflow
@scaffold-guide <domain> <entity>

# Resume interrupted workflow
Continue scaffold workflow for procurement/purchase-order

# Skip to specific step
Start from step 6 (error codes) for purchase-order

# Ask for help
What's next in the scaffold workflow?
How do I fix the boundaries gate?
What does the contract-db-sync gate check?
```

## File Locations Reference

```
packages/
  contracts/src/
    <domain>/
      <entity>.entity.ts        ← Entity + Status schemas
      <entity>.commands.ts      ← Command schemas
      OWNERS.md                 ← Document exports
    shared/
      errors.ts                 ← Error codes
      audit.ts                  ← Audit actions
      permissions.ts            ← Permission keys
      outbox.ts                 ← Event types
    index.ts                    ← Barrel re-export domains
      
  core/src/
    <domain>/
      <entity>.service.ts       ← Business logic
      <entity>.queries.ts       ← Read queries
      __vitest_test__/
        <entity>.test.ts        ← Integration tests
      OWNERS.md                 ← Document exports
    index.ts                    ← Barrel re-export domains
      
  db/src/
    schema/<domain>.ts          ← Drizzle tables
    drizzle/
      NNNN_<description>.sql    ← Migrations
      
apps/
  api/src/
    routes/<entity>.ts          ← Fastify routes
    index.ts                    ← Register routes
      
  worker/src/
    jobs/handle-<entity>.ts     ← Event handlers
    index.ts                    ← Register tasks
      
tools/gates/
  contract-db-sync.mjs          ← Add sync pairs here
  boundaries.mjs                ← Import direction checks
  ...                           ← Other gates
```

## PR Checklist Template

```markdown
## Changes
- Adds `<entity>` entity to `<domain>` domain

## Checklist
- [x] Scaffolded files generated
- [x] Zod entity schemas defined
- [x] Zod command schemas defined
- [x] Drizzle table created
- [x] SQL migration generated
- [x] Error codes registered
- [x] Audit actions registered
- [x] Permissions registered
- [x] Outbox event types registered
- [x] Sync pair added to contract-db-sync
- [x] Contract barrel wired
- [x] Core barrel wired
- [x] API route registered
- [x] Worker handler registered
- [x] OWNERS.md files updated
- [x] Integration tests written
- [x] All gates pass (`pnpm check:all`)
- [x] All tests pass (`pnpm test`)
- [x] No TypeScript errors (`pnpm typecheck`)

## Files Changed
- `packages/contracts/src/<domain>/<entity>.entity.ts`
- `packages/contracts/src/<domain>/<entity>.commands.ts`
- `packages/db/src/schema/<domain>.ts`
- `packages/core/src/<domain>/<entity>.service.ts`
- ...

## Testing
Tested locally with:
```bash
pnpm typecheck && pnpm test && pnpm check:all
```
```

---

**Need help?** Ask: `@scaffold-guide how do I add a new entity?`

**Full docs:** See `.agents/SCAFFOLD-WORKFLOW.md`

**Templates:** See `templates/` directory

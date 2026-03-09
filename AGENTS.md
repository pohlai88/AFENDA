# AGENTS.md — AI Agent Architecture Guide

> **Quick reference for AI assistants working with AFENDA codebase**

**Last Updated:** March 9, 2026  
**Version:** 1.2  
**Purpose:** Enable AI agents to understand and contribute to AFENDA effectively

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Import Direction Law](#2-import-direction-law-critical)
3. [Pillar Structure](#3-pillar-structure-adr-0005)
4. [Hard Rules (Never Break)](#4-hard-rules-never-break)
5. [Schema-is-Truth Workflow](#5-schema-is-truth-workflow)
6. [UI Components (shadcn)](#6-ui-components-shadcn)
7. [CI Gates (18 Total)](#7-ci-gates-18-total)
8. [Common Tasks](#8-common-tasks)
9. [Naming Conventions](#9-naming-conventions)
10. [Quick Commands](#10-quick-commands)
11. [Brand Identity](#11-brand-identity)
12. [Key Files Reference](#12-key-files-reference)
13. [Performance Optimization Patterns](#13-performance-optimization-patterns)
14. [Security Best Practices](#14-security-best-practices)

---

## 1. Architecture Overview

**AFENDA** = **A**udit-**F**irst **N**exus for **D**ata **A**ccountability

### Tech Stack

```
Frontend:  Next.js 16 (App Router) + React 19 + shadcn/ui + Tailwind CSS v4
Backend:   Fastify + PostgreSQL + Drizzle ORM
Workers:   Graphile Worker (LISTEN/NOTIFY)
Monorepo:  pnpm + Turborepo
```

### Core Principles

1. **Truth-First:** Every financial fact is reproducible, auditable, explainable
2. **Append-Only:** Truth tables (journal_entry, audit_log, outbox_event) never UPDATE/DELETE
3. **Event-Driven:** Commands → Outbox Events → Workers → Side Effects
4. **Type-Safe:** Zod schemas → TypeScript types → PostgreSQL schema
5. **Design System:** All UI components use shadcn/ui (no raw HTML elements)

### Project Structure

```
apps/
  api/        → Fastify REST API (commands + queries)
  web/        → Next.js 16 frontend (App Router)
  worker/     → Graphile Worker (event handlers)
packages/
  contracts/  → Zod schemas (source of truth)
  db/         → Drizzle ORM + migrations
  core/       → Business logic services
  ui/         → shadcn components + field-kit + shell
  tsconfig/   → Shared TypeScript config
templates/    → Scaffold templates for new entities
tools/
  gates/      → 18 CI enforcement gates
  scaffold.mjs → Entity generator
docs/
  adr/        → Architecture Decision Records
  ci-gates/   → Gate documentation
```

---

## 2. Import Direction Law (CRITICAL)

**Violating this will cause CI failure.**

```
contracts  → zod only (no monorepo deps)
db         → drizzle-orm + pg + *Values from contracts
core       → contracts + db (THE ONLY JOIN POINT)
ui         → contracts only (no core, no db)
api        → contracts + core (never db)
web        → contracts + ui (never core, never db)
worker     → contracts + core + db
```

### What This Means

| Package | Can Import | NEVER Import |
|---------|-----------|--------------|
| `contracts` | zod, date-fns | Anything from monorepo |
| `db` | drizzle-orm, pg, `@afenda/contracts` | core, ui, api, web, worker |
| `core` | `@afenda/contracts`, `@afenda/db` | ui, api, web, worker |
| `ui` | `@afenda/contracts` | core, db, api, web, worker |
| `api` | `@afenda/contracts`, `@afenda/core` | db, ui, web, worker |
| `web` | `@afenda/contracts`, `@afenda/ui` | core, db, api, worker |
| `worker` | `@afenda/contracts`, `@afenda/core`, `@afenda/db` | ui, api, web |

**Enforced by:** `tools/gates/boundaries.mjs` (CI gate)

---

## 3. Pillar Structure (ADR-0005)

Every layer package is organized into **four pillars:**

### Pillar Taxonomy

```
packages/
  contracts/src/
    shared/       ← Cross-cutting utilities (ids, errors, money, permissions)
    kernel/       ← Org-level governance (audit, identity, execution, policy)
    erp/          ← Transactional business logic (finance, supplier, purchasing)
    comm/         ← Communication (notification, email, webhooks)

  db/src/schema/
    kernel/       ← Identity, audit, outbox tables
    erp/          ← Business entity tables
    comm/         ← Notification tables

  core/src/
    shared/       ← Shared utilities
    kernel/       ← Governance services
    erp/          ← Business domain services
    comm/         ← Communication services

  ui/src/
    shared/       ← Utilities
    kernel/       ← Admin, auth, settings UI
    erp/          ← Business domain UI
    comm/         ← Notification UI
```

### Module Examples

| Pillar | Module Path | Purpose |
|--------|------------|---------|
| `shared` | `shared/ids` | ID schemas (orgId, userId, invoiceId) |
| `shared` | `shared/errors` | Error code registry |
| `shared` | `shared/money` | Money type utilities |
| `kernel` | `kernel/governance/audit` | Audit log schemas + services |
| `kernel` | `kernel/identity` | User, org, role schemas |
| `kernel` | `kernel/execution/outbox` | Event outbox patterns |
| `erp` | `erp/finance/ap` | Accounts Payable domain |
| `erp` | `erp/finance/gl` | General Ledger domain |
| `erp` | `erp/supplier` | Supplier management |
| `comm` | `comm/notification` | Notification system |

**Enforced by:** `tools/gates/module-boundaries.mjs` (CI gate)

---

## 4. Hard Rules (Never Break)

### Database

- ✅ **Use `sql\`now()\``** for timestamps — `new Date()` breaks reproducibility
- ✅ **Money = bigint minor units** — NO floats (123.45 → 12345 cents)
- ✅ **All timestamps = `timestamptz`** — never `timestamp without time zone`
- ✅ **Truth tables are append-only** — NO UPDATE/DELETE on:
  - `journal_entry`
  - `audit_log`
  - `outbox_event`
- ✅ **Every table needs:**
  - `org_id uuid NOT NULL` for multi-tenancy
  - `created_at timestamptz DEFAULT now()`
  - `updated_at timestamptz DEFAULT now()`
  - Unique constraint including `org_id`
  - B-tree indexes on all foreign keys

### Commands & Events

- ✅ **Every command must:**
  - Accept `idempotencyKey: string`
  - Emit an outbox event
  - Write an audit log with `correlationId`
  - Check permissions
  - Validate using Zod schema

### Code Organization

- ✅ **Tests in `__vitest_test__/`** — never colocated with source
- ✅ **Barrel files < 60 lines** — split if growing
- ✅ **No `console.*`** — use Pino logger from `@afenda/core/infra/logger`
- ✅ **No hardcoded colors** — use Tailwind design tokens

### UI Components

- ✅ **All components use shadcn/ui** — NO raw HTML elements:
  - ❌ `<input>` → ✅ `<Input>` from `@afenda/ui`
  - ❌ `<textarea>` → ✅ `<Textarea>` from `@afenda/ui`
  - ❌ `<button>` → ✅ `<Button>` from `@afenda/ui`
  - ❌ `<label>` → ✅ `<Label>` from `@afenda/ui`
  - ❌ `<select>` → ✅ `<Select>` composition from `@afenda/ui`
- ✅ **Auto-fix available:** `node tools/gates/shadcn-enforcement-autofix.mjs`

**Enforced by:** `tools/gates/shadcn-enforcement.mjs` (CI gate)

---

## 5. Schema-is-Truth Workflow

**When adding a new entity, follow this exact order:**

### Step-by-Step

1. **Zod Schemas** (`packages/contracts/src/<pillar>/<module>/`)
   ```typescript
   // entity.entity.ts
   export const InvoiceSchema = z.object({
     id: z.string().uuid(),
     orgId: z.string().uuid(),
     status: z.enum(InvoiceStatusValues),
     amount: z.bigint(), // ← minor units (cents)
     createdAt: z.date(),
   });
   ```

2. **Drizzle Table** (`packages/db/src/schema/<pillar>/<module>/`)
   ```typescript
   import { InvoiceStatusValues } from "@afenda/contracts";
   
   export const invoice = pgTable("invoice", {
     id: uuid("id").primaryKey().defaultRandom(),
     orgId: uuid("org_id").notNull(),
     status: pgEnum("invoice_status", InvoiceStatusValues)("status"),
     amount: bigint("amount", { mode: "bigint" }).notNull(),
     createdAt: timestamptz("created_at").defaultNow(),
   }, (t) => ({
     orgIdx: index("invoice_org_id_idx").on(t.orgId),
   }));
   ```

3. **SQL Migration**
   ```bash
   pnpm db:generate
   # Edit migration file, add RLS policies
   pnpm db:migrate
   ```

4. **Domain Service** (`packages/core/src/<pillar>/<module>/`)
   ```typescript
   export async function createInvoice(
     db: Db,
     ctx: Context,
     cmd: CreateInvoiceCommand
   ): Promise<Result<Invoice>> {
     // Validate, check permissions, insert, emit event, audit
   }
   ```

5. **API Route** (`apps/api/src/routes/<pillar>/<module>/`)
   ```typescript
   app.post("/v1/commands/create-invoice", {
     schema: { body: CreateInvoiceCommandSchema },
     handler: async (req, reply) => {
       const result = await createInvoice(app.db, req.ctx, req.body);
       // Handle result, return response
     }
   });
   ```

6. **Worker Handler** (`apps/worker/src/jobs/<pillar>/<module>/`)
   ```typescript
   export async function handleInvoiceCreated(
     payload: InvoiceCreatedEvent
   ) {
     // Side effects: send email, update cache, etc.
   }
   ```

7. **UI** (`apps/web/src/app/(erp)/finance/ap/invoices/`)
   ```tsx
   // page.tsx, loading.tsx, error.tsx
   // Use field-kit for forms
   ```

8. **Tests + OWNERS.md**
   ```bash
   # packages/core/src/<pillar>/<module>/__vitest_test__/
   # Update OWNERS.md with exports
   ```

### Automation Available

```bash
# Generate entity scaffold
node tools/scaffold.mjs erp/finance/ap invoice

# Follow checklist in output
```

---

## 6. UI Components (shadcn)

### Component Library

All UI components from `@afenda/ui`:

**Form Controls:**
- `Input`, `Textarea`, `Button`, `Label`
- `Switch`, `Checkbox`
- `Select` + composition (SelectTrigger, SelectContent, SelectItem, SelectValue)

**Layout:**
- `Card` + composition
- `Dialog` + composition
- `Table` + composition
- `Separator`, `Tabs`, `Badge`, `Tooltip`

### Import Pattern

```typescript
// ✅ Correct
import { Input, Label, Button, Switch } from "@afenda/ui";

// ✅ Within packages/ui/src
import { Input } from "../../components/input";

// ❌ NEVER
import * as Switch from "@radix-ui/react-switch";
```

### Auto-Fix Violations

```bash
# Preview fixes
node tools/gates/shadcn-enforcement-autofix.mjs --dry-run

# Apply fixes
node tools/gates/shadcn-enforcement-autofix.mjs
```

### Exemption Marker

```tsx
{/* shadcn-exempt: Reason for raw HTML */}
<button type="button">Simple icon button</button>
```

**Documentation:** `docs/ci-gates/shadcn-enforcement.md`

---

## 7. CI Gates (18 Total)

All gates run via `pnpm check:all` and block CI on failure.

### Phase 1: Static Correctness (8 gates)

| Gate | Purpose | Location |
|------|---------|----------|
| `test-location` | Tests in `__vitest_test__/` only | `tools/gates/test-location.mjs` |
| `schema-invariants` | DB schema rules (timestamptz, org_id) | `tools/gates/schema-invariants.mjs` |
| `migration-lint` | SQL migration safety checks | `tools/gates/migration-lint.mjs` |
| `contract-db-sync` | Zod schemas ↔ Drizzle tables match | `tools/gates/contract-db-sync.mjs` |
| `token-compliance` | No hardcoded colors | `tools/gates/token-compliance.mjs` |
| **`shadcn-enforcement`** | All UI uses shadcn components | `tools/gates/shadcn-enforcement.mjs` |
| `owners-lint` | OWNERS.md files complete | `tools/gates/owners-lint.mjs` |
| `catalog` | pnpm catalog consistency | `tools/gates/catalog.mjs` |

### Phase 2: Architecture Boundaries (4 gates)

| Gate | Purpose |
|------|---------|
| `boundaries` | Import Direction Law enforcement |
| `module-boundaries` | Pillar structure enforcement |
| `org-isolation` | Multi-tenant isolation checks |
| `finance-invariants` | Money type, journal entry rules |

### Phase 3: Domain Completeness (6 gates)

| Gate | Purpose |
|------|---------|
| `domain-completeness` | Error codes, audit actions, permissions registered |
| `route-registry-sync` | API routes documented |
| `audit-enforcement` | Audit logs on mutations |
| `ui-meta` | Entity metadata completeness |
| `server-clock` | No `new Date()` in backend |
| `page-states` | Next.js page suspense boundaries |

**ESLint complements gates** — runs in-editor and at `pnpm lint` (before gates):
- `@afenda/no-hardcoded-colors` — design tokens (mirrors token-compliance)
- `@afenda/no-raw-form-elements` — shadcn only (mirrors shadcn-enforcement)
- `@afenda/no-js-date-in-db` — no `new Date()` in DB code (mirrors server-clock)
- `react-hooks/rules-of-hooks` + `exhaustive-deps` — React Hooks safety
- `@typescript-eslint/no-floating-promises`, `no-misused-promises`, `await-thenable` — async safety (type-aware)
- `jsx-a11y/*` — accessibility (alt-text, aria-*, etc.)
- `drizzle/enforce-delete-with-where`, `enforce-update-with-where` — Drizzle safety (core, db, api)

See `docs/ci-gates-eslint-integration.md` for details.

**Run all gates:**
```bash
pnpm check:all
```

**Run specific gate:**
```bash
node tools/gates/shadcn-enforcement.mjs
```

---

## 8. Common Tasks

### Add a New Entity

```bash
# 1. Scaffold
node tools/scaffold.mjs erp/finance/ap invoice

# 2. Follow checklist
# - Edit Zod schemas
# - Create Drizzle table
# - Generate migration
# - Implement service
# - Create API route
# - Add worker handler
# - Build UI

# 3. Verify
pnpm typecheck
pnpm test
pnpm check:all
```

### Fix shadcn Violations

```bash
# Auto-fix simple cases
node tools/gates/shadcn-enforcement-autofix.mjs

# Check remaining
node tools/gates/shadcn-enforcement.mjs

# Manual fixes for complex cases (see docs)
```

### Add a Permission

```typescript
// 1. Add to packages/contracts/src/shared/permissions.ts
export const AP_INVOICE_CREATE = "ap.invoice.create" as const;

// 2. Add to permission registry
export const ALL_PERMISSIONS = [
  // ...
  AP_INVOICE_CREATE,
] as const;

// 3. Use in service
import { AP_INVOICE_CREATE } from "@afenda/contracts";
await checkPermission(ctx, AP_INVOICE_CREATE);
```

### Add an Error Code

```typescript
// packages/contracts/src/shared/errors.ts
export const AP_INVOICE_NOT_FOUND = "AP_INVOICE_NOT_FOUND" as const;
export const AP_INVOICE_ALREADY_APPROVED = "AP_INVOICE_ALREADY_APPROVED" as const;

// Use in service
return { ok: false, error: AP_INVOICE_NOT_FOUND };
```

### Add an Audit Action

```typescript
// packages/contracts/src/kernel/governance/audit/actions.ts
export const AUDIT_ACTION_AP_INVOICE_CREATED = "ap.invoice.created" as const;

// Use in service
await createAuditLog(db, {
  action: AUDIT_ACTION_AP_INVOICE_CREATED,
  entityType: "invoice",
  entityId: invoice.id,
  correlationId: ctx.correlationId,
});
```

### Create a Form with Field-Kit

```tsx
import { GeneratedForm } from "@afenda/ui";

<GeneratedForm
  entityType="invoice"
  mode="create"
  fieldCaps={fieldCaps}
  onSubmit={handleSubmit}
/>
```

### Create a List View

```tsx
import { GeneratedList } from "@afenda/ui";

<GeneratedList
  entityType="invoice"
  rows={invoices}
  fieldCaps={fieldCaps}
  actionCaps={actionCaps}
  onSort={handleSort}
  onFilter={handleFilter}
/>
```

---

## 9. Naming Conventions

| Context | Convention | Example |
|---------|-----------|----------|
| **Database** | | |
| Columns | snake_case | `org_id`, `created_at`, `invoice_number` |
| Tables | snake_case singular | `invoice`, `journal_entry`, `audit_log` |
| Indexes | `{table}_{columns}_idx` | `invoice_org_id_idx` |
| Enums | snake_case | `invoice_status`, `payment_method` |
| **TypeScript** | | |
| Variables | camelCase | `orgId`, `createdAt`, `invoiceNumber` |
| Types/Interfaces | PascalCase | `Invoice`, `CreateInvoiceCommand` |
| Functions | camelCase | `createInvoice`, `approveInvoice` |
| Files | kebab-case | `invoice.entity.ts`, `create-invoice.ts` |
| **Schemas** | | |
| Zod schemas | PascalCase + Schema | `InvoiceSchema`, `CreateInvoiceCommandSchema` |
| Entity schemas | PascalCase + Schema | `InvoiceSchema` |
| Command schemas | Create/Update + PascalCase + Command + Schema | `CreateInvoiceCommandSchema` |
| **Registry** | | |
| Permissions | dot.notation | `ap.invoice.create`, `ap.invoice.approve` |
| Error codes | UPPER_SNAKE | `AP_INVOICE_NOT_FOUND` |
| Audit actions | dot.notation | `ap.invoice.created`, `ap.invoice.approved` |
| Event types | UPPER_SNAKE | `AP_INVOICE_CREATED`, `AP_INVOICE_APPROVED` |
| **Routes** | | |
| Commands | `/v1/commands/{action}` | `/v1/commands/create-invoice` |
| Queries | `/v1/{entities}` | `/v1/invoices`, `/v1/invoices/{id}` |

---

## 10. Quick Commands

### Development

```bash
# Install dependencies
pnpm install

# Type check
pnpm typecheck

# Run tests
pnpm test

# Run all CI gates
pnpm check:all

# Start dev servers (all apps)
pnpm dev

# Start specific app
pnpm --filter @afenda/web dev     # Frontend
pnpm --filter @afenda/api dev     # API
pnpm --filter @afenda/worker dev  # Worker
```

### Database

```bash
# Generate migration
pnpm db:generate

# Run migrations
pnpm db:migrate

# Open Drizzle Studio
pnpm db:studio

# Reset database (dev only)
pnpm db:reset
```

### Build

```bash
# Build all packages
pnpm build

# Build specific package
pnpm --filter @afenda/ui build
pnpm --filter @afenda/core build
```

### Scaffolding

```bash
# Generate new entity
node tools/scaffold.mjs <pillar/module> <entity-kebab>

# Example
node tools/scaffold.mjs erp/finance/ap invoice
```

### CI Gates

```bash
# Run all gates
pnpm check:all

# Run specific gate
node tools/gates/shadcn-enforcement.mjs
node tools/gates/boundaries.mjs
node tools/gates/schema-invariants.mjs

# Auto-fix shadcn violations
node tools/gates/shadcn-enforcement-autofix.mjs
```

---

## 11. Brand Identity

### The AfendaMark

The AFENDA brand mark is a **3-dot audit mark** — two solid circles and one hollow ring:

```
●  ●  ○
```

- **Dot 1 & 2** (solid, `r=2`) — Data input and processing. Certainty, finality.
- **Dot 3** (hollow ring, `r=2.5`, `strokeWidth=1.5`) — The audit loop. Continuous, cyclical, transparent.

The hollow ring prevents the mark from reading as a generic ellipsis (`...`) or kebab menu. It signals *inspection* — you can see through it.

### SVG Specification

```
viewBox:     0 0 24 24
Dot 1:       cx=5  cy=12 r=2   fill=#14b8a6
Dot 2:       cx=12 cy=12 r=2   fill=#14b8a6
Audit Ring:  cx=19 cy=12 r=2.5 stroke=#14b8a6 strokeWidth=1.5 fill=none
```

### Component: `AfendaMark`

**Location:** `apps/web/src/app/(public)/(marketing)/AfendaMark.tsx`

```tsx
import { AfendaMark } from "./AfendaMark";

// Static — favicons, nav, footer, metadata (zero JS overhead)
<AfendaMark size={20} />

// Animated — hero, CTA, interactive areas (spring physics)
<AfendaMark size={20} variant="animated" />
```

| Prop | Default | Purpose |
|------|---------|--------|
| `size` | `24` | Render size in px (scales from 24×24 viewBox) |
| `variant` | `"static"` | `"static"` = no transitions, `"animated"` = spring hover + stagger |
| `color` | `#14b8a6` | Fill/stroke color (teal-500) |
| `hoverColor` | `#0d9488` | Hover color shift (teal-700) |
| `className` | — | Additional CSS classes |

### Animation Physics

The animated variant uses a **spring model** (not cubic-bezier):

```
type: "spring", stiffness: 400, damping: 25
```

- Dots stagger in on `whileInView` (appear once)
- Hover: scale 1.2 (dots) / 1.25 (ring) with color shift
- Stagger delays: 0ms → 50ms → 100ms
- Ring over-scales to 1.25 to compensate for lower visual mass

### Favicon Files

| File | Purpose |
|------|--------|
| `apps/web/src/app/icon.svg` | SVG favicon (auto-detected by Next.js) |
| `apps/web/src/app/apple-icon.svg` | Apple touch icon (dark bg #0B0D12) |
| `apps/web/scripts/generate-favicon.mjs` | SVG → multi-resolution ICO generator |

### Usage Rules

- ✅ **Always use `AfendaMark`** for AFENDA brand representation
- ✅ Static variant for chrome/metadata contexts
- ✅ Animated variant for interactive/marketing contexts
- ❌ **Never use lucide Globe/Shield/etc. as the AFENDA brand mark**
- ❌ **Never modify the 3-dot geometry** (cx/cy/r values are locked)

---

## 12. Key Files Reference

### Architecture Documentation

| File | Purpose |
|------|---------|
| **`PROJECT.md`** | Complete architecture specification |
| **`AGENTS.md`** | This file - AI agent quick reference |
| **`.github/copilot-instructions.md`** | GitHub Copilot rules |
| **`docs/adr/adr_0005_module_architecture_restructure.md`** | Pillar structure ADR |

### Configuration

| File | Purpose |
|------|---------|
| `turbo.json` | Turborepo build configuration |
| `pnpm-workspace.yaml` | Workspace packages |
| `package.json` | Root package scripts + catalog |
| `tsconfig.base.json` | Shared TypeScript config |
| `vitest.workspace.ts` | Vitest test configuration |

### Registry Files (CRITICAL)

| File | Purpose |
|------|---------|
| **`packages/contracts/src/shared/errors.ts`** | All error codes |
| **`packages/contracts/src/kernel/governance/audit/actions.ts`** | All audit actions |
| **`packages/contracts/src/shared/permissions.ts`** | All permission keys |
| **`packages/contracts/src/kernel/execution/outbox/envelope.ts`** | Event types |

### CI Gates

| Directory | Purpose |
|-----------|---------|
| **`tools/gates/`** | 18 CI enforcement gates |
| **`docs/ci-gates/`** | Gate documentation |

### Templates

| Directory | Purpose |
|-----------|---------|
| **`templates/`** | Scaffold templates for new entities |

### Key Implementation Files

| File | Purpose |
|------|---------|
| `apps/api/src/index.ts` | API server entry + route registration |
| `apps/api/src/types.ts` | Fastify type augmentations |
| `apps/api/src/helpers/responses.ts` | Response builders, error codes |
| `apps/web/src/app/layout.tsx` | Root layout |
| `packages/ui/src/field-kit/registry.ts` | Field renderer registry |
| `packages/ui/src/meta/registry.ts` | Entity metadata registry |
| `packages/core/src/infra/logger.ts` | Pino logger setup |
| `apps/web/src/app/(public)/(marketing)/AfendaMark.tsx` | Brand icon component (static + animated) |
| `apps/web/src/app/icon.svg` | SVG favicon |

---

## 13. Performance Optimization Patterns

### Frontend Optimization

#### React Optimization

**1. Use React Hooks Wisely**
```typescript
// ✅ Memoize expensive computed values
const columns = useMemo(() => {
  return metaFields.map(field => ({
    key: field.key,
    label: field.label,
    renderer: fieldRenderers[field.type],
  }));
}, [metaFields]);

// ✅ Memoize event handlers to prevent child re-renders
const handleSort = useCallback((field: string) => {
  setSortBy(field);
}, []);

// ❌ Avoid - creates new function on every render
<Button onClick={() => handleClick(id)}>Click</Button>

// ✅ Better - stable reference
const handleClick = useCallback(() => {
  onClick(id);
}, [id, onClick]);
```

**2. Component Code Splitting**
```typescript
// Next.js dynamic imports with loading states
import dynamic from 'next/dynamic';

const HeavyChart = dynamic(() => import('./HeavyChart'), {
  loading: () => <ChartSkeleton />,
  ssr: false, // Client-only if needed
});

// React.lazy for code splitting
const AdminPanel = lazy(() => import('./AdminPanel'));

<Suspense fallback={<Skeleton />}>
  <AdminPanel />
</Suspense>
```

**3. Suspense Boundaries for Streaming (Next.js 16)**
```typescript
// apps/web/src/app/page.tsx
import { Suspense } from "react";

export default function Page() {
  return (
    <div>
      <Suspense fallback={<HeaderSkeleton />}>
        <Header />
      </Suspense>
      
      <Suspense fallback={<DataTableSkeleton />}>
        <DataTable />
      </Suspense>
    </div>
  );
}
```

**4. Performance Monitoring**
```typescript
// Built into GeneratedList and GeneratedForm components
const renderStart = useRef(performance.now());

useEffect(() => {
  const duration = performance.now() - renderStart.current;
  performance.mark(`GeneratedList:${entityKey}:rendered`);
  performance.measure(
    `GeneratedList:${entityKey}`,
    { start: renderStart.current }
  );
}, [entityKey]);
```

#### Next.js App Router Optimization

**1. Route Segment Config**
```typescript
// Force dynamic for real-time data
export const dynamic = "force-dynamic";

// Static generation for content pages
export const dynamic = "force-static";

// Revalidate ISR every hour
export const revalidate = 3600;
```

**2. Parallel Data Fetching**
```typescript
// ✅ Fetch in parallel
async function Page() {
  const [user, invoices] = await Promise.all([
    getUser(),
    getInvoices(),
  ]);
  
  return <Dashboard user={user} invoices={invoices} />;
}

// ❌ Sequential waterfalls
async function Page() {
  const user = await getUser();
  const invoices = await getInvoices(); // Waits for user
}
```

**3. Image & Font Optimization**
```typescript
// Use Next.js Image component
import Image from "next/image";

<Image
  src="/hero.jpg"
  alt="Hero"
  width={1200}
  height={600}
  priority // LCP optimization
  placeholder="blur"
/>

// Font optimization
import { Inter } from "next/font/google";

const inter = Inter({ 
  subsets: ["latin"],
  display: "swap",
  preload: true,
});
```

### Backend Optimization

#### Database Performance

**1. Connection Pooling**
```typescript
// packages/db/src/client.ts
const pool = new Pool({
  connectionString,
  max: 10,                        // Max connections
  idleTimeoutMillis: 30_000,      // Close idle after 30s
  connectionTimeoutMillis: 5_000, // Connection timeout
});
```

**2. Use Indexes Effectively**
```typescript
// Every table MUST have indexes on:
// - Foreign keys (for joins)
// - org_id (for multi-tenancy isolation)
// - Frequently queried columns

export const invoice = pgTable("invoice", {
  id: uuid("id").primaryKey(),
  orgId: uuid("org_id").notNull(),
  supplierId: uuid("supplier_id").notNull(),
  status: text("status").notNull(),
}, (t) => ({
  orgIdx: index("invoice_org_id_idx").on(t.orgId),
  supplierIdx: index("invoice_supplier_id_idx").on(t.supplierId),
  statusIdx: index("invoice_status_idx").on(t.status),
}));
```

**3. Use Transactions for Multi-Step Operations**
```typescript
// packages/db/src/client.ts - ADR-0003 pattern
import { withOrgContext } from "@afenda/db";

const result = await withOrgContext(db, {
  orgId: ctx.activeContext.orgId,
  principalId: ctx.principalId,
}, async (tx) => {
  // All queries in this block run in same transaction
  const invoice = await tx.insert(invoiceTable).values(data).returning();
  await tx.insert(auditLog).values(auditEntry);
  return invoice;
});
```

**4. Batch Operations**
```typescript
// ✅ Batch inserts
await db.insert(auditLog).values([
  { action: "ap.invoice.created", entityId: id1 },
  { action: "ap.invoice.created", entityId: id2 },
  { action: "ap.invoice.created", entityId: id3 },
]);

// ❌ Avoid - N+1 queries
for (const item of items) {
  await db.insert(auditLog).values(item);
}
```

#### API Performance

**1. Rate Limiting**
```typescript
// apps/api/src/index.ts
await app.register(rateLimit, {
  max: 100,              // 100 requests
  timeWindow: "1 minute", // per minute
  keyGenerator: (req) => req.ctx.principalId || req.ip,
});

// Per-route overrides
app.post("/v1/commands/create-invoice", {
  config: { rateLimit: { max: 30, timeWindow: "1 minute" } },
  handler: async (req, reply) => { /* ... */ }
});
```

**2. Request Deduplication (Idempotency)**
```typescript
// Every command must accept idempotencyKey
export interface CreateInvoiceCommand {
  idempotencyKey: string;
  orgId: string;
  // ... other fields
}

// apps/api/src/plugins/idempotency.ts handles dedup
```

**3. Correlation IDs for Tracing**
```typescript
// apps/api/src/index.ts
app.addHook("onRequest", async (req, reply) => {
  const correlationId = 
    req.headers[CorrelationIdHeader] ?? crypto.randomUUID();
  req.correlationId = correlationId;
  reply.header(CorrelationIdHeader, correlationId);
});
```

### Caching Strategies

**1. Next.js Data Cache**
```typescript
// Revalidate on-demand
fetch('https://api.example.com/data', {
  next: { revalidate: 3600 } // Cache for 1 hour
});

// Cache forever (static)
fetch('https://api.example.com/static', {
  cache: 'force-cache'
});

// Never cache
fetch('https://api.example.com/realtime', {
  cache: 'no-store'
});
```

**2. Database Query Results Caching**
```typescript
// Use Redis or similar for frequently accessed data
// NOT YET IMPLEMENTED - future enhancement
```

---

## 14. Security Best Practices

### Authentication & Authorization

#### 1. Permission Checks (O(1) with Set)

```typescript
// packages/core/src/kernel/identity/permissions.ts
import { hasPermission } from "@afenda/core";

// ✅ O(1) Set lookup
if (!hasPermission(ctx, "ap.invoice.approve")) {
  return { ok: false, error: "IAM_INSUFFICIENT_PERMISSIONS" };
}

// ❌ Never use array.includes - O(n)
if (!ctx.permissions.includes("ap.invoice.approve")) { /* slow! */ }
```

#### 2. Multi-Tenant Isolation (Row-Level Security)

```typescript
// packages/db/src/client.ts - ADR-0003
import { withOrgContext } from "@afenda/db";

// ALWAYS use withOrgContext for org-scoped queries
const invoices = await withOrgContext(db, {
  orgId: ctx.activeContext.orgId,
  principalId: ctx.principalId,
}, async (tx) => {
  return tx.query.invoice.findMany({
    where: eq(invoice.orgId, ctx.activeContext.orgId)
  });
});

// PostgreSQL GUCs set in transaction:
// - app.org_id
// - app.principal_id
// - app.party_role_id
// - app.role_type
```

#### 3. Audit Logging for All Mutations

```typescript
// packages/core/src/kernel/governance/audit/audit.ts
import { writeAuditLog } from "@afenda/core";

// EVERY state-changing command MUST write audit log
await writeAuditLog(db, ctx, {
  actorPrincipalId: ctx.principalId,
  action: "ap.invoice.approved",
  entityType: "invoice",
  entityId: invoice.id,
  correlationId: ctx.correlationId,
  details: {
    amount: invoice.amount,
    supplierId: invoice.supplierId,
    // NO passwords, tokens, PII
  },
});

// Audit log table is INSERT-ONLY (enforced by DB trigger)
```

#### 4. Sensitive Data Redaction

```typescript
// REDACTED_KEYS enforced in audit.ts:
// - password, token, access_token, secret, api_key
// - creditcard, cardnumber, ssn, taxid
// - authorization, bearer

// Auto-redacted before INSERT
const auditEntry = {
  details: {
    email: "user@example.com", // ✅ OK
    password: "secret123",      // ❌ AUTO-REDACTED
    token: "abc123",            // ❌ AUTO-REDACTED
  }
};
```

### Input Validation

#### 1. Zod Schema Validation (All Layers)

```typescript
// contracts → API → core → db
// Zod schemas are source of truth

// packages/contracts/src/erp/finance/ap/commands.ts
export const CreateInvoiceCommandSchema = z.object({
  idempotencyKey: z.string().uuid(),
  orgId: z.string().uuid(),
  amount: z.bigint().positive(),
  invoiceNumber: z.string().min(1).max(50),
});

// apps/api/src/routes/erp/finance/ap.ts
app.post("/v1/commands/create-invoice", {
  schema: { body: CreateInvoiceCommandSchema }, // Auto-validates
  handler: async (req, reply) => {
    // req.body is type-safe and validated
  }
});
```

#### 2. SQL Injection Prevention

```typescript
// ✅ Drizzle ORM - parameterized queries
const result = await db.select()
  .from(invoice)
  .where(eq(invoice.id, id));

// ❌ NEVER concatenate user input
const result = await db.execute(
  sql`SELECT * FROM invoice WHERE id = ${id}` // ❌ UNSAFE if id is user input
);

// ✅ Use Drizzle's type-safe builders
```

#### 3. XSS Prevention

```typescript
// React automatically escapes JSX content

// ✅ Safe - React escapes
<div>{userInput}</div>

// ❌ Dangerous - bypasses escaping
<div dangerouslySetInnerHTML={{ __html: userInput }} />

// Use DOMPurify if you MUST render HTML
import DOMPurify from "isomorphic-dompurify";
<div dangerouslySetInnerHTML={{ 
  __html: DOMPurify.sanitize(userInput) 
}} />
```

### API Security

#### 1. CORS Configuration

```typescript
// apps/api/src/index.ts
await app.register(cors, {
  origin: env.ALLOWED_ORIGINS.length > 0 
    ? env.ALLOWED_ORIGINS 
    : true,
  credentials: true,
});

// .env
ALLOWED_ORIGINS=https://app.afenda.com,https://staging.afenda.com
```

#### 2. Rate Limiting (Per-Principal)

```typescript
// apps/api/src/index.ts
await app.register(rateLimit, {
  max: 100,
  timeWindow: "1 minute",
  keyGenerator: (req) => req.ctx.principalId || req.ip,
});

// Stricter limits for sensitive endpoints
app.post("/v1/commands/approve-invoice", {
  config: { rateLimit: { max: 30, timeWindow: "1 minute" } },
  handler: async (req, reply) => { /* ... */ }
});
```

#### 3. Request Validation (Fastify + Zod)

```typescript
// Type-safe validation on ALL routes
app.setValidatorCompiler(validatorCompiler);

// Validation errors return 400 SHARED_VALIDATION_ERROR
app.setErrorHandler((error, req, reply) => {
  if (error.validation) {
    reply.code(400).send({
      error: {
        code: "SHARED_VALIDATION_ERROR",
        message: error.message,
        details: error.validation,
      }
    });
  }
});
```

### Secrets Management

#### 1. Environment Variables

```typescript
// NEVER commit secrets to git
// Use .env files (gitignored)

// packages/core/src/shared/env.ts
export const ApiEnvSchema = z.object({
  DATABASE_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(32),
  JWT_SECRET: z.string().min(32),
});

// Validate on startup
const env = validateEnv(ApiEnvSchema);
```

#### 2. Secret Rotation

```bash
# Generate secure secrets
openssl rand -base64 32

# Production secrets in environment/secrets manager
# - AWS Secrets Manager
# - Azure Key Vault
# - Doppler
```

#### 3. Never Log Secrets

```typescript
// packages/core/src/shared/env.ts
export function redactEnv(env: Record<string, unknown>) {
  const redacted = { ...env };
  const sensitiveKeys = [
    "DATABASE_URL", "NEXTAUTH_SECRET", 
    "JWT_SECRET", "API_KEY"
  ];
  
  for (const key of sensitiveKeys) {
    if (redacted[key]) {
      redacted[key] = "[REDACTED]";
    }
  }
  
  return redacted;
}
```

### Database Security

#### 1. Prevent SQL Injection

```typescript
// ✅ Always use Drizzle's type-safe builders
await db.select().from(users).where(eq(users.id, userId));

// ❌ NEVER use raw SQL with user input
await db.execute(sql`SELECT * FROM users WHERE id = '${userId}'`);

// ✅ If raw SQL needed, use parameterized queries
await db.execute(
  sql`SELECT * FROM users WHERE id = ${sql.placeholder('userId')}`,
  { userId }
);
```

#### 2. Row-Level Security (RLS)

```sql
-- Migration example: RLS policy for invoice table
CREATE POLICY invoice_isolation ON invoice
  USING (org_id = current_setting('app.org_id')::uuid);

ALTER TABLE invoice ENABLE ROW LEVEL SECURITY;
```

#### 3. Connection String Security

```bash
# Use connection pooling with SSL
DATABASE_URL=postgresql://user:pass@host:5432/db?sslmode=require

# Rotate credentials regularly
# Use IAM authentication for AWS RDS
```

### OWASP Top 10 Coverage

| Threat | Mitigation Strategy |
|--------|-------------------|
| **A01: Broken Access Control** | - O(1) permission checks via Set<br/>- Multi-tenant RLS policies<br/>- withOrgContext for all queries |
| **A02: Cryptographic Failures** | - 32+ char secrets<br/>- PostgreSQL SSL connections<br/>- Audit log redaction |
| **A03: Injection** | - Drizzle ORM parameterized queries<br/>- Zod validation<br/>- No raw SQL |
| **A04: Insecure Design** | - Schema-is-truth workflow<br/>- Append-only audit logs<br/>- Idempotency keys |
| **A05: Security Misconfiguration** | - Environment validation on startup<br/>- CORS whitelist<br/>- Rate limiting enabled |
| **A06: Vulnerable Components** | - pnpm audit<br/>- Dependabot alerts<br/>- Regular updates |
| **A07: Authentication Failures** | - NextAuth (secure by default)<br/>- Correlation IDs<br/>- Session management |
| **A08: Software/Data Integrity** | - CI gates (18 total)<br/>- Typecheck before deploy<br/>- Migration linting |
| **A09: Logging Failures** | - Structured Pino logging<br/>- Correlation IDs<br/>- Audit log for all mutations |
| **A10: SSRF** | - No user-controlled URLs<br/>- Whitelist external APIs<br/>- Network segmentation |

---

## Quick Checklist for New Features

```
□ Zod schemas in packages/contracts/src/<pillar>/<module>/
□ Drizzle table in packages/db/src/schema/<pillar>/<module>/
□ SQL migration generated and reviewed
□ Service in packages/core/src/<pillar>/<module>/
□ API route in apps/api/src/routes/<pillar>/<module>/
□ Worker handler in apps/worker/src/jobs/<pillar>/<module>/
□ UI in apps/web/src/app/
□ Tests in __vitest_test__/ directories
□ Error codes added to shared/errors.ts
□ Audit actions added to kernel/governance/audit/actions.ts
□ Permissions added to shared/permissions.ts (if needed)
□ OWNERS.md updated
□ pnpm typecheck passes
□ pnpm test passes
□ pnpm check:all passes (all 18 gates)
```

---

## When In Doubt

1. **Check PROJECT.md** for comprehensive architecture
2. **Run the gates** - they enforce the rules: `pnpm check:all`
3. **Look at existing code** in the same pillar/module
4. **Use templates** - `templates/` directory has patterns
5. **Follow schema-is-truth** - always start with Zod, never the other way around

---

**Remember:** We're not building features. We're building **Truth**.

Every line of code should serve verifiability, auditability, and reproducibility.

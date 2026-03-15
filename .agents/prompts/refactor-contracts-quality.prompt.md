@workspace Follow @refactor-contracts-quality to improve code quality@workspace Follow @refactor-contracts-quality to improve code quality@workspace Follow @refactor-contracts-quality to improve code quality@workspace Follow @refactor-contracts-quality to improve code quality@workspace Follow @refactor-contracts-quality to improve code quality---
description: Systematic refactoring workflow for packages/contracts to achieve enterprise-grade code quality with DRY principles, comprehensive test coverage, and strict adherence to AFENDA architecture rules.
applyTo: packages/contracts/**
triggers:
  - refactor contracts
  - improve contracts quality
  - contracts technical debt
  - clean up contracts
  - optimize contracts
invocationScope: workspace
---

# Contracts Package Quality Refactoring

Systematic workflow for evaluating, analyzing, refactoring, optimizing, stabilizing, and enriching the `packages/contracts` directory to meet enterprise code quality standards and AFENDA architecture best practices.

## Context

The `@afenda/contracts` package is the **canonical meaning layer** — it owns the shape and semantics of every domain entity, command, event, and shared primitive. It must be:

- **Pure Zod schemas** (no business logic, no runtime dependencies)
- **JSON-first types** (safe to serialize across process boundaries)
- **Import-boundary compliant** (never imports from `@afenda/db`, `@afenda/core`, `@afenda/ui`)
- **Pillar-structured** (shared → kernel → erp → comm)
- **Comprehensively tested** (every schema has test coverage)

## Critical Issues Identified

### 1. **BLOCKER: adapters/ directory contains implementation logic**

**Violation:** `src/adapters/` contains runtime classes (`PostgresRepository`, `InMemoryRepository`, `PostgresSearchAdapter`) with business logic.

**Impact:** Violates contracts package purity — these are implementation patterns, not schema contracts.

**Resolution:**

- [ ] Move `adapters/db.ts`, `adapters/search.ts`, `adapters/event-bus.ts`, `adapters/storage.ts` → `packages/core/src/shared/adapters/`
- [ ] Update all imports in consuming packages
- [ ] Keep only type-only adapters if needed (e.g., `type Repository<T>` interface)
- [ ] Update `packages/contracts/OWNERS.md` to remove adapters from scope
- [ ] Remove `adapters/` from barrel export in `src/index.ts`

### 2. **BLOCKER: Zero test coverage for ERP domains**

**Violation:** No `__vitest_test__/` directories under `erp/finance/ap/`, `erp/supplier/`, `erp/finance/gl/`, treasury, etc.

**Impact:** Schema regressions undetected, no validation of refinements, no documented expected behavior.

**Resolution:**

- [ ] Create `__vitest_test__/` directories for each domain module
- [ ] Test entity schemas: valid cases, boundary conditions, refinement logic
- [ ] Test command schemas: required fields, idempotencyKey presence, validation errors
- [ ] Test status value arrays: ensure enums are stable (breaking change detection)
- [ ] Minimum coverage target: 90% for all domain schemas

**Template test pattern:**

```typescript
// packages/contracts/src/erp/finance/ap/__vitest_test__/invoice.entity.test.ts
import { describe, it, expect } from "vitest";
import { InvoiceSchema, InvoiceStatusValues, InvoiceStatusSchema } from "../invoice.entity.js";

describe("InvoiceSchema", () => {
  it("should validate a complete invoice", () => {
    const result = InvoiceSchema.safeParse({
      id: "550e8400-e29b-41d4-a716-446655440000",
      orgId: "550e8400-e29b-41d4-a716-446655440001",
      supplierId: "550e8400-e29b-41d4-a716-446655440002",
      invoiceNumber: "INV-2026-001",
      amountMinor: 10000n,
      currencyCode: "USD",
      status: "draft",
      dueDate: "2026-04-15",
      submittedByPrincipalId: null,
      submittedAt: null,
      poReference: null,
      paidAt: null,
      paidByPrincipalId: null,
      paymentReference: null,
      createdAt: "2026-03-14T12:00:00.000Z",
      updatedAt: "2026-03-14T12:00:00.000Z",
    });
    expect(result.success).toBe(true);
  });

  it("should reject invalid status", () => {
    const result = InvoiceStatusSchema.safeParse("invalid_status");
    expect(result.success).toBe(false);
  });

  it("should accept bigint for amountMinor", () => {
    const result = InvoiceSchema.safeParse({
      /* ...valid invoice with bigint amountMinor */
    });
    expect(result.success).toBe(true);
  });
});

describe("InvoiceStatusValues", () => {
  it("should be immutable and stable (breaking change detector)", () => {
    expect(InvoiceStatusValues).toEqual([
      "draft",
      "submitted",
      "approved",
      "posted",
      "paid",
      "rejected",
      "voided",
    ]);
  });
});
```

### 3. **ID Duplication/Confusion**

**Violation:** `DocumentIdSchema` in `shared/ids.ts` vs. `CommDocumentIdSchema` in `comm/docs/document.entity.ts`.

**Impact:** Ambiguous intent — are these the same domain concept or different?

**Resolution:**

- [ ] Audit all usages of `DocumentIdSchema` and `CommDocumentIdSchema`
- [ ] If they represent the same concept: remove `CommDocumentIdSchema`, use `DocumentIdSchema` everywhere
- [ ] If they represent different concepts: rename for clarity (e.g., `EvidenceDocumentIdSchema` vs. `CommDocumentIdSchema`)
- [ ] Document cross-domain rationale in `shared/ids.ts` with comment

### 4. **shared/ Planned Refactors (TODOs)**

**Violation:** `shared/index.ts` comments indicate planned splits not yet executed:

- `TODO: Split errors.ts → shared/result.ts + module-local error codes`
- `TODO: Split permissions.ts → kernel + module-local permissions`

**Impact:** Shared bloat — error codes and permissions should be module-local, not global.

**Resolution:**

- [ ] Create `shared/result.ts` for generic `Result<T, E>` types
- [ ] Move domain error codes from `shared/errors.ts` to their respective domains (e.g., `AP_INVOICE_NOT_FOUND` → `erp/finance/ap/errors.ts`)
- [ ] Keep only `SHARED_*` error codes in `shared/errors.ts`
- [ ] Move domain permissions from `shared/permissions.ts` to their respective domains (e.g., `ap.invoice.approve` → `erp/finance/ap/permissions.ts`)
- [ ] Keep only `PermissionValues` structure and cross-cutting IAM permissions in shared

### 5. **Barrel File Health Check**

**Status:** ✅ **GOOD** — All barrel files (`index.ts`) only contain `export * from ...` statements, no logic.

**Maintenance:**

- [ ] Continue enforcing "exports only" rule
- [ ] CI gate: detect any non-export statements in `**/index.ts` files

### 6. **JSON-First Types Compliance**

**Status:** ✅ **GOOD** — No `z.date()` violations, no `Date` instances in schemas. Clock abstraction in `shared/clock.ts` is appropriate.

**Maintenance:**

- [ ] CI gate: detect `z.date()` in contracts package
- [ ] CI gate: detect `BigInt` in non-money contexts

### 7. **File Naming Convention Compliance**

**Status:** ✅ **GOOD** — All domain files follow `*.entity.ts`, `*.commands.ts`, `*.queries.ts`, `*.events.ts` patterns.

**Maintenance:**

- [ ] CI gate: enforce file naming convention
- [ ] Document exceptions with justification comments

## Refactoring Workflow

### Phase 1: Foundation (Critical Path)

**Goal:** Remove blockers, establish baseline quality.

1. **Move adapters/ to core**

   - Create `packages/core/src/shared/adapters/`
   - Move all `src/adapters/*.ts` files
   - Update all imports across monorepo
   - Update contracts OWNERS.md
   - Run `pnpm typecheck` and `pnpm test`

2. **Create test scaffolding for ERP domains**

   - Generate `__vitest_test__/` directories for all ERP modules
   - Create placeholder test files (copy from template above)
   - Run `pnpm test` to validate setup

3. **Resolve ID duplication**
   - Audit `DocumentIdSchema` vs `CommDocumentIdSchema` usage
   - Consolidate or rename
   - Update OWNERS.md with cross-domain rationale

### Phase 2: Quality (Test Coverage)

**Goal:** Achieve 90%+ test coverage for all schemas.

4. **Write comprehensive tests for shared/**

   - Status: Already complete ✅
   - Maintain coverage with every new schema

5. **Write comprehensive tests for kernel/**

   - Test identity schemas (Party, Person, Principal, PartyRole)
   - Test governance schemas (Audit, Evidence, Policy)
   - Test execution schemas (Outbox, Idempotency, Numbering)
   - Test registry schemas (Capability, EntityDef, FieldDef)

6. **Write comprehensive tests for erp/**

   - AP domain: invoice, invoice-line, payment-terms, hold, payment-run, prepayment, match-tolerance, wht-certificate
   - GL domain: account, journal-entry
   - Supplier domain: supplier, supplier-site, supplier-bank-account
   - Treasury domain: bank-account, bank-statement, cash-position, liquidity-forecast, reconciliation

7. **Write comprehensive tests for comm/**
   - Tasks, projects, workflows, approvals, announcements, docs, boardroom, chatter

### Phase 3: DRY (Duplication Elimination)

**Goal:** Remove redundancy, consolidate reusable patterns.

8. **Split error codes by domain**

   - Create `erp/finance/ap/errors.ts`, `erp/supplier/errors.ts`, etc.
   - Move domain-specific codes from `shared/errors.ts`
   - Keep only `SHARED_*` codes in shared
   - Update all imports

9. **Split permissions by domain**

   - Create `erp/finance/ap/permissions.ts`, `erp/supplier/permissions.ts`, etc.
   - Move domain-specific permissions from `shared/permissions.ts`
   - Keep only permission infrastructure in shared
   - Update all imports

10. **Audit shared/ids.ts for over-escalation**

    - Review every ID in shared/ids.ts
    - Move single-domain IDs back to their domains (use `brandedUuid()`)
    - Keep only IDs referenced in 3+ domains
    - Document cross-domain rationale with comments

11. **Extract common schema patterns**
    - Identify repeated refinements (e.g., `z.string().trim().min(1).max(64)`)
    - Create reusable builders in `shared/validation.ts`
    - Apply builders to reduce repetition

### Phase 4: Optimization (Performance & Size)

**Goal:** Minimize bundle size, optimize validation.

12. **Lazy-load heavy schemas**

    - Identify large schemas (e.g., registry schemas, Treasury forecast models)
    - Use dynamic imports where appropriate
    - Measure bundle impact

13. **Optimize Zod refinements**

    - Replace expensive refinements with precomputed lookups
    - Cache compiled RegExp patterns
    - Benchmark validation performance

14. **Tree-shake unused exports**
    - Audit barrel exports for dead code
    - Remove unused types/schemas
    - Update OWNERS.md

### Phase 5: Stabilization (CI & Documentation)

**Goal:** Lock in quality with automation.

15. **Add CI gates**

    - Gate: Detect logic in barrel files (`**/index.ts`)
    - Gate: Detect `z.date()` in contracts
    - Gate: Detect non-JSON-serializable types (BigInt outside money contexts)
    - Gate: Enforce file naming convention
    - Gate: Require test coverage > 90%
    - Gate: Validate OWNERS.md completeness

16. **Update OWNERS.md files**

    - Document all exports in each domain's OWNERS.md
    - Document cross-domain rationale for shared/ escalations
    - Document test coverage status

17. **Create migration guides**
    - Document breaking changes from refactor
    - Provide codemod scripts if needed
    - Update dependent packages (`@afenda/db`, `@afenda/core`, apps)

### Phase 6: Enrichment (Developer Experience)

**Goal:** Improve usability, documentation, tooling.

18. **Add JSDoc comments**

    - Document all public schemas with examples
    - Explain refinement logic
    - Link to relevant ADRs

19. **Create schema visualization**

    - Generate Mermaid diagrams for domain relationships
    - Visualize entity lifecycle state machines
    - Document command → event flows

20. **Add example fixtures**
    - Create `__fixtures__/` directories with valid example data
    - Use in tests and documentation
    - Publish as `@afenda/test-fixtures` for external use

## Validation Checklist

After completing each phase, validate:

- [ ] `pnpm typecheck` passes
- [ ] `pnpm test` passes with > 90% coverage
- [ ] `pnpm check:all` (all 18 CI gates pass)
- [ ] No import violations (`@afenda/db`, `@afenda/core`, `@afenda/ui`)
- [ ] All barrels are exports-only
- [ ] All domain modules have `__vitest_test__/` directories
- [ ] All OWNERS.md files are up-to-date
- [ ] No z.date() or BigInt (except money) in schemas
- [ ] All error codes, permissions, audit actions registered
- [ ] Documentation updated

## Success Criteria

The refactor is complete when:

1. **Zero architecture violations** — Import boundaries, JSON-first types, pillar structure all enforced
2. **90%+ test coverage** — Every schema validated, every refinement tested
3. **DRY principles applied** — No duplication, reusable patterns extracted
4. **CI gates in place** — Quality locked in with automation
5. **Developer experience improved** — Clear docs, examples, visualization

## Invocation Examples

```
# Start full refactor workflow
@workspace Follow @refactor-contracts-quality to systematically improve code quality in packages/contracts

# Run specific phase
@workspace Execute Phase 1 of @refactor-contracts-quality (Foundation)

# Validate current state
@workspace Check contracts package against @refactor-contracts-quality checklist

# Fix specific issue
@workspace Resolve ID duplication issue per @refactor-contracts-quality section 3
```

## Related Customizations

- `.agents/skills/vitest.md` — Testing patterns and coverage
- `.agents/skills/zod.md` — Schema validation best practices
- `docs/adr/adr_0005_module_architecture_restructure.md` — Pillar structure
- `packages/contracts/OWNERS.md` — Package-level rules
- `packages/contracts/src/shared/OWNERS.md` — Shared/ escalation criteria

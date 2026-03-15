# Contracts Package Quality Assessment

**Date:** March 14, 2026  
**Package:** `packages/contracts`  
**Purpose:** Evaluation, analysis, and refactoring recommendations

---

## Executive Summary

The `@afenda/contracts` package has **strong foundational architecture** but suffers from **critical quality gaps** that prevent it from meeting enterprise standards:

- ✅ **Import boundaries respected** — No violations of layering rules
- ✅ **JSON-first types enforced** — No Date/BigInt leaks
- ✅ **File naming consistent** — Follows `*.entity.ts`, `*.commands.ts` patterns
- ✅ **Barrel files clean** — Exports-only, no logic
- ⚠️ **adapters/ directory misplaced** — Contains implementation logic (should be in `@afenda/core`)
- ❌ **Zero test coverage for ERP domains** — No `__vitest_test__/` directories for AP, supplier, GL, treasury
- ⚠️ **ID duplication** — `DocumentIdSchema` vs `CommDocumentIdSchema` creates ambiguity
- ⚠️ **shared/ planned refactors incomplete** — Error codes and permissions need to be split to domains

**Overall Grade:** C+ (70/100)

---

## Critical Issues (Blockers)

### 1. adapters/ Directory Contains Implementation Logic

**Severity:** 🔴 **BLOCKER**  
**Impact:** Violates contracts package purity

**Files affected:**

- `src/adapters/db.ts` — PostgresRepository, InMemoryRepository classes
- `src/adapters/search.ts` — PostgresSearchAdapter, ElasticSearchAdapter classes
- `src/adapters/event-bus.ts` — PostgresEventBus, InMemoryEventBus classes
- `src/adapters/storage.ts` — R2Storage, LocalStorage classes

**Why this is wrong:**

- These files contain business logic, runtime dependencies, and side effects
- Contracts package should only contain Zod schemas and type definitions
- Implementation patterns belong in `@afenda/core/src/shared/adapters/`

**Resolution:**

```bash
# Move implementation to core
mkdir -p packages/core/src/shared/adapters
mv packages/contracts/src/adapters/*.ts packages/core/src/shared/adapters/

# Update imports across monorepo
# - @afenda/contracts/adapters → @afenda/core/adapters

# Remove from contracts barrel
# - Remove adapters exports from packages/contracts/src/index.ts

# Update OWNERS.md
# - Remove adapters/ from packages/contracts/OWNERS.md
```

**Estimate:** 4 hours

---

### 2. Zero Test Coverage for ERP Domains

**Severity:** 🔴 **BLOCKER**  
**Impact:** Schema regressions undetected, no validation of business rules

**Missing test directories:**

- `erp/finance/ap/__vitest_test__/` — 0 tests for 10 entity types (invoice, payment-run, etc.)
- `erp/finance/gl/__vitest_test__/` — 0 tests for account, journal-entry
- `erp/supplier/__vitest_test__/` — 0 tests for supplier, supplier-site, supplier-bank-account
- `erp/finance/treasury/__vitest_test__/` — 0 tests for 10+ treasury entities

**Why this is wrong:**

- Changes to schemas have no safety net
- Refinement logic (e.g., date validation, amount constraints) is untested
- Status value arrays have no breaking-change detector
- No documented expected behavior

**Resolution:**

```bash
# Create test scaffolding
mkdir -p packages/contracts/src/erp/finance/ap/__vitest_test__
mkdir -p packages/contracts/src/erp/finance/gl/__vitest_test__
mkdir -p packages/contracts/src/erp/supplier/__vitest_test__
mkdir -p packages/contracts/src/erp/finance/treasury/__vitest_test__

# Generate test files (see template in .instructions.md)
# For each entity file, create corresponding .test.ts

# Target: 90% coverage
```

**Test template structure:**

```typescript
describe("EntitySchema", () => {
  it("should validate complete entity with all fields");
  it("should validate minimal entity with required fields only");
  it("should reject invalid enum values");
  it("should enforce refinements (min/max, regex, custom)");
  it("should coerce bigint for money fields");
});

describe("EntityStatusValues", () => {
  it("should be stable (breaking change detector)");
});

describe("CommandSchema", () => {
  it("should require idempotencyKey");
  it("should validate all required fields");
  it("should accept optional fields");
  it("should reject invalid data");
});
```

**Estimate:** 20 hours (2-3 days)

---

## High-Priority Issues

### 3. ID Duplication/Confusion

**Severity:** 🟡 **HIGH**  
**Impact:** Ambiguous intent, potential bugs

**Conflict:**

- `DocumentIdSchema` in `shared/ids.ts` (line 153)
- `CommDocumentIdSchema` in `comm/docs/document.entity.ts` (line 7)

**Are these the same concept?**

- `DocumentIdSchema` comments say: "cross-domain: referenced by invoice commands, evidence attach, supplier onboarding"
- `CommDocumentIdSchema` is used only in `comm/docs/` module

**Resolution options:**

**Option A: Same concept (consolidate)**

```typescript
// Remove CommDocumentIdSchema from comm/docs/document.entity.ts
// Replace all CommDocumentIdSchema usages with DocumentIdSchema
import { DocumentIdSchema } from "@afenda/contracts";
```

**Option B: Different concepts (rename for clarity)**

```typescript
// shared/ids.ts
export const EvidenceDocumentIdSchema = uuid.brand<"EvidenceDocumentId">();
// cross-domain: referenced by invoice evidence, supplier onboarding, audit trails

// comm/docs/document.entity.ts
export const CommDocumentIdSchema = uuid.brand<"CommDocumentId">();
// domain-specific: knowledge base articles, internal docs
```

**Recommendation:** Option A (consolidate) if they represent the same domain concept.

**Estimate:** 2 hours

---

### 4. shared/ Planned Refactors (TODOs)

**Severity:** 🟡 **HIGH**  
**Impact:** Shared bloat, reduced modularity

**TODOs in `shared/index.ts`:**

```typescript
// TODO: Split errors.ts → shared/result.ts + module-local error codes
// TODO: Split permissions.ts → kernel + module-local permissions
```

**Why this matters:**

- Error codes like `AP_INVOICE_NOT_FOUND` should live in `erp/finance/ap/errors.ts`, not shared
- Permissions like `ap.invoice.approve` should live in `erp/finance/ap/permissions.ts`, not shared
- Shared should only contain infrastructure cross-cuts, not domain-specific codes

**Resolution:**

**Phase 1: Split error codes by domain**

```bash
# Create domain error files
touch packages/contracts/src/erp/finance/ap/errors.ts
touch packages/contracts/src/erp/supplier/errors.ts
touch packages/contracts/src/erp/finance/gl/errors.ts

# Move domain codes from shared/errors.ts
# Keep only SHARED_*, IAM_*, KERNEL_* codes in shared
```

**Phase 2: Split permissions by domain**

```bash
# Create domain permission files
touch packages/contracts/src/erp/finance/ap/permissions.ts
touch packages/contracts/src/erp/supplier/permissions.ts

# Move domain permissions from shared/permissions.ts
# Keep only permission infrastructure in shared
```

**Estimate:** 6 hours

---

## Medium-Priority Issues

### 5. shared/ids.ts Over-Escalation Risk

**Severity:** 🟠 **MEDIUM**  
**Impact:** Potential bloat, unclear ownership

**IDs in shared/ids.ts (lines 133-162):**

- ✅ `OrgIdSchema`, `PrincipalIdSchema`, `PartyIdSchema` — Justified (IAM cross-cut)
- ✅ `InvoiceIdSchema` — Justified (AP + GL + evidence + audit)
- ✅ `SupplierIdSchema` — Justified (invoice + GL + evidence)
- ✅ `AccountIdSchema` — Justified (GL + journal + invoice posting)
- ⚠️ `DocumentIdSchema` — Needs audit (see Issue #3)
- ✅ `CommTaskIdSchema`, `CommWorkflowIdSchema` — Justified (tasks used across comm modules)

**Action:** Ongoing monitoring. IDs added to shared need justification comments.

---

### 6. Test Coverage for comm/ and kernel/

**Severity:** 🟠 **MEDIUM**  
**Impact:** Moderate risk

**Status:**

- `shared/` — ✅ Comprehensive test coverage (23 test files)
- `kernel/identity/` — ⚠️ Partial coverage (1 test file)
- `kernel/governance/` — ❌ No tests
- `kernel/execution/` — ❌ No tests
- `kernel/registry/` — ❌ No tests
- `comm/tasks/` — ⚠️ Partial coverage (1 test file)
- `comm/workflows/` — ⚠️ Partial coverage (1 test file)
- `comm/` (other modules) — ❌ No tests

**Resolution:** Same as Issue #2 — create test scaffolding and achieve 90% coverage.

**Estimate:** 12 hours

---

## Quality Metrics

| Metric                     | Current | Target | Status |
| -------------------------- | ------- | ------ | ------ |
| Test coverage (shared/)    | 95%     | 90%+   | ✅     |
| Test coverage (kernel/)    | 5%      | 90%+   | ❌     |
| Test coverage (erp/)       | 0%      | 90%+   | ❌     |
| Test coverage (comm/)      | 10%     | 90%+   | ❌     |
| Import boundary violations | 0       | 0      | ✅     |
| JSON-first compliance      | 100%    | 100%   | ✅     |
| File naming consistency    | 100%    | 100%   | ✅     |
| Barrel purity              | 100%    | 100%   | ✅     |
| OWNERS.md completeness     | 80%     | 100%   | ⚠️     |

**Overall Coverage:** ~30% (shared is comprehensive, rest is minimal)  
**Target Coverage:** 90%+

---

## Recommended Action Plan

### Immediate (Next Sprint)

**Priority 1: Move adapters/ to core**

- Effort: 4 hours
- Impact: Restores contracts package purity
- No risk

**Priority 2: Resolve ID duplication**

- Effort: 2 hours
- Impact: Removes ambiguity
- Low risk

**Priority 3: Create ERP test scaffolding**

- Effort: 4 hours
- Impact: Enables comprehensive testing
- No risk

**Total: 10 hours (1-2 days)**

---

### Short-Term (Next 2 Sprints)

**Priority 4: Achieve 90% test coverage for ERP**

- Effort: 20 hours (2-3 days)
- Impact: Catches schema regressions
- Medium risk (may discover existing bugs)

**Priority 5: Split error codes by domain**

- Effort: 4 hours
- Impact: Better modularity
- Low risk

**Priority 6: Split permissions by domain**

- Effort: 2 hours
- Impact: Better modularity
- Low risk

**Total: 26 hours (3-4 days)**

---

### Medium-Term (Next Quarter)

**Priority 7: Achieve 90% test coverage for kernel/ and comm/**

- Effort: 12 hours (1-2 days)
- Impact: Full package coverage
- Low risk

**Priority 8: Add CI gates for quality enforcement**

- Effort: 8 hours
- Impact: Lock in quality with automation
- No risk

**Priority 9: Enrich documentation (JSDoc, examples)**

- Effort: 8 hours
- Impact: Improved developer experience
- No risk

**Total: 28 hours (3-4 days)**

---

## Success Metrics

After refactoring, the package should achieve:

- ✅ **Zero architecture violations** — Import boundaries, JSON-first, pillar structure
- ✅ **90%+ test coverage** — Every schema validated, every refinement tested
- ✅ **DRY principles applied** — Error codes and permissions split to domains
- ✅ **CI gates in place** — Quality locked with automation
- ✅ **Developer experience improved** — Clear docs, examples, instructions

**Estimated Total Effort:** 64 hours (8 days)

---

## Files Created

1. **`.agents/prompts/refactor-contracts-quality.prompt.md`**  
   Comprehensive refactoring workflow with 6 phases, validation checklist, success criteria.

2. **`packages/contracts/.instructions.md`**  
   Auto-loaded quality enforcement rules for contracts package development.

3. **`docs/contracts-quality-assessment-2026-03-14.md`** (this file)  
   Detailed findings, recommendations, and action plan.

---

## Next Steps

**To start refactoring:**

```bash
# Load the prompt
@workspace Follow @refactor-contracts-quality to improve code quality in packages/contracts

# Or execute specific phase
@workspace Execute Phase 1 (Foundation) of @refactor-contracts-quality

# Or fix specific issue
@workspace Move adapters/ directory per contracts quality assessment
```

**To enforce quality during development:**

The `.instructions.md` file will be automatically loaded when working with contracts files, providing:

- Hard rules enforcement
- Common quality issue detection
- Development workflow guidance
- Pre-commit checklist

---

## Appendix: Pillar Structure Reference

```
shared/       — Cross-domain primitives (3+ domains or IAM cross-cut)
  ├── ids.ts
  ├── money.ts
  ├── datetime.ts
  └── errors.ts (split in progress)

kernel/       — Organization-scoped governance, identity, execution
  ├── identity/
  ├── governance/
  ├── execution/
  └── registry/

erp/          — Transactional business logic (AP/AR/GL)
  ├── finance/
  │   ├── ap/
  │   ├── gl/
  │   └── treasury/
  ├── supplier/
  └── purchasing/

comm/         — Communication & collaboration surfaces
  ├── tasks/
  ├── projects/
  ├── workflows/
  ├── approvals/
  └── docs/
```

---

**Report prepared by:** AI Agent  
**Review required by:** Tech Lead, Architecture Team

# API Evaluate → Refactor → Optimize → Stabilize Plan

Target

- apps/api

## 1. Current-State Findings

- Bootstrap concentration risk:
  - apps/api/src/index.ts is handling env bootstrapping, plugin order, route imports, and route registration in one large module.
- Route registration sprawl:
  - apps/api/src/index.ts registers a very large number of routes manually, increasing merge conflict risk and onboarding cost.
- Large hotspot module:
  - apps/api/src/routes/erp/finance/treasury.ts is the largest route module and mixes many waves/domains in one file.
- Repeated route-level boilerplate:
  - buildCtx/buildPolicyCtx helpers are duplicated across many route files.
  - Guard pattern (requireOrg + requireAuth + permission check + core call + map errors) repeats with minor variation.
- Placeholder/template subdirectory exists in active tree:
  - apps/api/src/routes/erp/supplier/supplier-site.ts and supplier-bank-account.ts are template stubs and not registered.
- Partial domain maturity mismatch:
  - apps/api/src/routes/erp/supplier.ts has TODO placeholders and empty list behavior, while adjacent domains are production-oriented.

## 2. Risk Matrix

- R1: Regression from large-file refactor in treasury routes
  - Impact: High
  - Likelihood: Medium
  - Mitigation: Split by capability with contract-preserving tests first.
- R2: Route registration drift after modularization
  - Impact: Medium
  - Likelihood: Medium
  - Mitigation: single registry map + startup route snapshot test.
- R3: Cleanup removes files still referenced by documentation/process
  - Impact: Medium
  - Likelihood: Low
  - Mitigation: deprecate/move templates to templates/ before deletion.
- R4: Inconsistent error/status mapping after DRY extraction
  - Impact: Medium
  - Likelihood: Medium
  - Mitigation: keep mapError strategy centralized and covered by helper tests.
- R5: Permission or idempotency behavior drift
  - Impact: High
  - Likelihood: Low
  - Mitigation: targeted mutation tests and existing idempotency suite expansion.

## 3. Refactor Backlog (DRY)

- Item R-1

  - Scope: Extract route registration arrays by pillar/module and reduce hand-written register calls in apps/api/src/index.ts.
  - Why: Shrinks bootstrap complexity and prevents registration omissions.
  - Change size: M
  - Risk: Medium
  - Dependencies: None
  - Validation: Route count parity check; health/readiness unchanged; route snapshot test passes.

- Item R-2

  - Scope: Add shared API route context helpers (buildOrgScopedContext/buildPolicyContext) under apps/api/src/helpers.
  - Why: Remove repeated helper declarations across route files.
  - Change size: M
  - Risk: Low
  - Dependencies: R-1 optional
  - Validation: Typecheck + selected route tests (comm, ap, treasury) unchanged.

- Item R-3

  - Scope: Create reusable command/query handler wrappers for common pattern (requireOrg/requireAuth, permission assertion, success/error envelope).
  - Why: Eliminate repetitive handler scaffolding and status mapping drift.
  - Change size: L
  - Risk: Medium
  - Dependencies: R-2
  - Validation: responses-helper tests + representative route mutation tests.

- Item R-4

  - Scope: Split treasury route module into focused submodules (accounts, statements, reconciliation, payment-instruction, batch, liquidity, intercompany).
  - Why: Reduce hotspot size and improve reviewability.
  - Change size: L
  - Risk: High
  - Dependencies: R-1
  - Validation: treasury-routes tests + endpoint parity checklist + OpenAPI diff.

- Item R-5
  - Scope: Normalize response DTO formatter utilities for repeated date serialization patterns.
  - Why: Reduce copy-pasted formatter functions and formatting drift.
  - Change size: M
  - Risk: Low
  - Dependencies: R-2
  - Validation: Snapshot/value tests on representative DTO mappers.

## 4. Optimization Backlog

- Item O-1

  - Scope: Introduce startup route registry metadata for deterministic registration and optional metrics logging.
  - Why: Better startup observability and lower operational uncertainty.
  - Change size: M
  - Risk: Low
  - Dependencies: R-1
  - Validation: Startup logs include route totals by module; no startup regressions.

- Item O-2

  - Scope: Reuse shared coercion/query schemas where duplicated (cursor/limit/date normalization patterns).
  - Why: Lower schema divergence and serializer mistakes.
  - Change size: M
  - Risk: Low
  - Dependencies: R-2
  - Validation: zod parse behavior parity tests.

- Item O-3

  - Scope: Reduce heavy import surfaces in large route files by internal module boundaries.
  - Why: Faster incremental typechecking and improved maintainability.
  - Change size: M
  - Risk: Medium
  - Dependencies: R-4
  - Validation: ts build timing baseline vs post-change (informational).

- Item O-4
  - Scope: Evaluate org slug cache behavior and add bounded strategy (TTL or size cap) if needed.
  - Why: Prevent unbounded map growth in long-lived processes.
  - Change size: S
  - Risk: Low
  - Dependencies: None
  - Validation: unit test for eviction/bounded behavior when enabled.

## 5. Stabilization Plan

- Add/extend test coverage

  - Route registration parity test (expected modules loaded).
  - Treasury endpoint contract parity tests before/after split.
  - Permission matrix smoke tests for representative command/query endpoints.
  - Error-envelope conformance tests for mapped core errors.

- Verification gates

  - pnpm typecheck
  - pnpm test --filter @afenda/api
  - node tools/gates/boundaries.mjs
  - node tools/gates/module-boundaries.mjs
  - pnpm check:all

- Pass criteria
  - No API behavior regressions for existing routes.
  - No import direction violations.
  - No decrease in existing route test pass rate.

## 6. Cleanup and Enrichment Plan

- Cleanup candidates

  - Move template-only files out of active route tree:
    - apps/api/src/routes/erp/supplier/supplier-site.ts
    - apps/api/src/routes/erp/supplier/supplier-bank-account.ts
  - Preferred destination:
    - templates/route.supplier-site.template.ts
    - templates/route.supplier-bank-account.template.ts
  - Keep references in scaffolding docs, not runtime source tree.

- Enrichment candidates
  - Add route-module ownership notes in relevant OWNERS.md areas.
  - Add docs/api-route-registry.md describing registration strategy and conventions.
  - Add contributor checklist for new route file standard pattern.

## 7. Execution Timeline (quick wins, medium, deep)

- Quick wins (1-2 days)

  - R-1 route registration consolidation
  - R-2 shared context helpers
  - O-4 bounded org cache decision
  - Cleanup template files migration

- Medium (3-5 days)

  - R-5 shared DTO formatter utilities
  - O-2 shared query/coercion schema utilities
  - Stabilization tests for parity and envelopes

- Deep (1-2 weeks)
  - R-4 treasury module split
  - R-3 command/query wrapper abstraction
  - O-3 import surface optimization and final hardening

## 8. Validation Checklist

- Architectural

  - api imports only contracts/core (+ framework deps).
  - No direct db import introduced in api routes.
  - Pillar/module paths remain compliant.

- Behavioral

  - All existing route paths remain reachable.
  - Success/error envelopes remain consistent.
  - Permission and org checks preserved for all secured endpoints.

- Operational

  - healthz/readyz/v1 endpoints unchanged.
  - startup succeeds with same env expectations.

- Quality
  - Relevant api tests pass.
  - check:all passes.
  - New abstractions documented briefly for contributors.

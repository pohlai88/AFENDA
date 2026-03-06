## Summary

<!-- One-sentence description of what this PR does. -->

## Changes

<!-- List the concrete changes. Use bullet points. -->

-

## Type

- [ ] Feature (new functionality)
- [ ] Bug fix
- [ ] Refactor (no behavior change)
- [ ] Infra / CI / tooling
- [ ] Documentation

## Pre-merge checklist

> **All boxes must be checked before merging.** If a box doesn't apply, check it and note "N/A".

### Architecture compliance

- [ ] **Schema-is-truth order followed** (contracts → db → core → api → worker → ui → tests)
- [ ] **Import direction law** — no forbidden cross-package imports (`pnpm check:boundaries` passes)
- [ ] **Contract↔DB sync** — Zod schemas match Drizzle columns (`pnpm check:contract-db-sync` passes)
- [ ] **Sync pair registered** — new pgTable has entry in `tools/gates/contract-db-sync.mjs` SYNC_PAIRS
- [ ] **Enum sync pair registered** — new `*StatusValues` has entry in `boundaries.mjs` ENUM_SYNC_PAIRS
- [ ] **OWNERS.md updated** — new/renamed files are listed in the relevant OWNERS.md

### Quality

- [ ] `pnpm typecheck` passes
- [ ] `pnpm test` passes (unit + integration)
- [ ] `pnpm check:all` passes (all CI gates including domain-completeness)
- [ ] New code has tests (unit in core, integration in api)

### Safety

- [ ] No `new Date()` in DB-touching code (use `sql\`now()\``)
- [ ] No hardcoded color values in TSX (use design tokens)
- [ ] No `console.*` in production code (use Pino logger)
- [ ] Truth tables remain append-only (no UPDATE/DELETE on journal_entry, audit_log, etc.)
- [ ] Commands include idempotencyKey handling
- [ ] Mutations produce audit log entries with correlationId

### Documentation

- [ ] Error codes added to `contracts/shared/errors.ts` if new error cases introduced
- [ ] Audit actions added to `contracts/shared/audit.ts` if new auditable events
- [ ] Permissions added to `contracts/shared/permissions.ts` if new access-controlled actions
- [ ] Outbox event types registered and worker handler created
- [ ] API routes documented via Zod type provider (auto-generates OpenAPI)

# OWNERS — `contracts/<pillar>/<module>`

> **Purpose:** <Entity> domain contracts for the <pillar>/<module> module.

## Import Rules

| May import | Must NOT import |
| ---------- | --------------- |
| `@afenda/contracts` (shared primitives) | `@afenda/ui` |
| `zod` | `@afenda/db` |
| | `@afenda/core` |
| | Other monorepo packages |

## Files

| File | Exports | Description |
| ---- | ------- | ----------- |
| `index.ts` | Re-exports from `<entity>.entity`, `<entity>.commands` | Barrel export |
| `<entity>.entity.ts` | `<Entity>Schema`, `<Entity>StatusValues`, `<Entity>Status`, `<Entity>` | Entity type definitions |
| `<entity>.commands.ts` | `Create<Entity>CommandSchema`, `Update<Entity>CommandSchema` | Command schemas |
<!-- Update exports and descriptions to match actual implementations -->

## PR Checklist

- [ ] New `.ts` files appear in the Files table above
- [ ] Import rules respected (run `pnpm check:boundaries`)
- [ ] Error codes added to `contracts/shared/errors.ts` if new failures introduced
- [ ] Audit actions added to `contracts/kernel/governance/audit/actions.ts` if new auditable events
- [ ] Outbox events added to `contracts/kernel/execution/outbox/envelope.ts` if new async events

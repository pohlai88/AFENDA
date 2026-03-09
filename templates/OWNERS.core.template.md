# OWNERS — `core/<pillar>/<module>`

> **Purpose:** <Entity> domain services for the <pillar>/<module> module.

## Import Rules

| May import | Must NOT import |
| ---------- | --------------- |
| `@afenda/contracts` (shared primitives) | `@afenda/ui` |
| `@afenda/db` | `@afenda/api` |
| `drizzle-orm`, `zod` | Direct DB queries (use `db.query.*`) |

## Files

| File | Exports | Description |
| ---- | ------- | ----------- |
| `index.ts` | Re-exports from `<entity>.service`, `<entity>.queries` | Barrel export |
| `<entity>.service.ts` | `create<Entity>`, `update<Entity>`, `<Entity>Error` | Business logic layer |
| `<entity>.queries.ts` | `get<Entity>`, `list<Entity>s` | Read-only query functions |
<!-- Update exports and descriptions to match actual implementations -->

## PR Checklist

- [ ] New `.ts` files appear in the Files table above
- [ ] Import rules respected (run `pnpm check:boundaries`)
- [ ] Tests added in `__vitest_test__/`
- [ ] All commands write audit logs (use `writeAuditLog` from kernel/governance)
- [ ] All async operations emit outbox events (use `emitOutboxEvent` from kernel/execution)

# OWNERS — `<package>/<pillar>/<module>`

> **Purpose:** <Entity> domain contracts/services for the <pillar>/<module> module.

## Import Rules

| May import | Must NOT import |
| ---------- | --------------- |
| `@afenda/contracts` (shared primitives) | `@afenda/ui` |
| `@afenda/db` (if in core package) | Other monorepo packages |
| `drizzle-orm`, `zod` | Direct DB queries (use services) |

## Files

| File | Exports | Description |
| ---- | ------- | ----------- |
| `index.ts` | Re-exports from `<entity>.entity`, `<entity>.commands`, `<entity>.service`, `<entity>.queries` | Barrel export |
| `<entity>.entity.ts` | `<Entity>Schema`, `<Entity>StatusValues`, `<Entity>Status`, `<Entity>` | Entity type definitions |
| `<entity>.commands.ts` | `Create<Entity>CommandSchema`, `Update<Entity>CommandSchema` | Command schemas |
| `<entity>.service.ts` (core only) | `create<Entity>`, `update<Entity>`, `<Entity>Error` | Business logic layer |
| `<entity>.queries.ts` (core only) | `get<Entity>`, `list<Entity>s` | Read-only query functions |
<!-- Update exports and descriptions to match actual implementations -->

## PR Checklist

- [ ] New `.ts` files appear in the Files table above
- [ ] Import rules respected (run `pnpm check:boundaries`)
- [ ] Tests added in `__vitest_test__/`
- [ ] Error codes added to `contracts/shared/errors.ts` if new failures introduced
- [ ] Audit actions added to `contracts/kernel/governance/audit/actions.ts` if new auditable events

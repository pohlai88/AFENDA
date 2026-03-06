# OWNERS — `<package>/<domain>`

> **Purpose:** <One sentence describing what belongs here.>

## Import Rules

| May import | Must NOT import |
| ---------- | --------------- |
| `@afenda/contracts` | `@afenda/ui` |
| `@afenda/db` (if core) | (list forbidden packages) |
| `drizzle-orm` operators | raw SQL |

## Files

| File | Exports | Description |
| ---- | ------- | ----------- |
| `example.ts` | `exampleFunction()` | Brief description |
<!-- Add one row per .ts file in this directory -->

## PR Checklist

- [ ] New `.ts` files appear in the Files table above
- [ ] Import rules respected (run `pnpm check:boundaries`)
- [ ] Tests added in `__vitest_test__/`
- [ ] Error codes added to `contracts/shared/errors.ts` if new failures introduced
- [ ] Audit actions added to `contracts/shared/audit.ts` if new auditable events

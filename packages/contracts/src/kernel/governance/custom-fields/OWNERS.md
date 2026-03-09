# contracts/kernel/governance/custom-fields — OWNERS

> **Package-wide rules are inherited from `packages/contracts/OWNERS.md`.**
> This file covers only what is specific to this directory.

## Purpose

Type contracts and vocabulary for the `kernel/governance/custom-fields` module.
Defines entity schemas, command schemas, query response schemas, and vocabulary arrays.

---

## Import Rules

- Zero dependencies on `@afenda/core`, `@afenda/db`, or any `apps/` package.
- Zod is permitted (contracts layer).
- `custom-field-entity-types.ts` must stay Zod-free (pure `as const` — safe for DB import).

---

## Files

| File | Key exports | Notes |
|------|-------------|-------|
| `custom-field-entity-types.ts` | `CustomFieldEntityTypeValues`, `CustomFieldDataTypeValues` | Pure vocab; no Zod |
| `custom-field.entity.ts` | `CustomFieldDefSchema`, `CustomFieldValueSchema`, `ApiKeySchema`, `CustomFieldOptionSchema` | DB mirror types |
| `custom-field.commands.ts` | `CreateCustomFieldDefCommandSchema`, `UpdateCustomFieldDefCommandSchema`, `UpsertCustomFieldValuesCommandSchema` | Write command schemas |
| `custom-field.query.ts` | `CustomFieldDefResponseSchema`, `CustomFieldValuesResponseSchema`, `CustomFieldsQueryParamsSchema` | Read response schemas |
| `index.ts` | All of the above | Barrel |

---

## Key Invariants

1. `api_key` is **immutable after creation** — treat as schema identifier. Do not allow updates.
2. `entity_type` is drawn from `CustomFieldEntityTypeValues` — add here first before using in DB.
3. `options_json` shape is `CustomFieldOption[]` — `value` inside each option is also immutable.
4. `required: true` is **prospective only** — no retroactive backfill on historical records.
5. Definition lifecycle and value lifecycle are separate — never mix in the same transaction.

---

## PR Checklist

When adding a new entity type to `CustomFieldEntityTypeValues`:
- [ ] Add to `CustomFieldEntityTypeValues` array in `custom-field-entity-types.ts`
- [ ] Add corresponding entity service integration (read/write merge) before using in production
- [ ] Update OWNERS.md Files table if a new file is created

# core/kernel/governance/custom-fields — OWNERS

> **Package-wide rules are inherited from `packages/core/OWNERS.md`.**
> This file covers only what is specific to this directory.

## Purpose

Service and query layer for the `kernel/governance/custom-fields` module.

Two distinct responsibilities with a **hard boundary** between them:

1. **Definition management** — admin surface for creating/updating/deactivating field definitions.
   Writes to `custom_field_def` only. Audited as governance events.

2. **Value operations** — entity-domain surface for upserting field values.
   Writes to `custom_field_value` only. Called from entity route handlers.

---

## Import Rules

- Imports `@afenda/contracts` (types + Zod schemas) and `@afenda/db` (table refs).
- Never imports `@afenda/ui` or anything from `apps/`.
- The definition service must **never** write to `custom_field_value`.
- Entity route handlers may call `upsertCustomFieldValues` and `getCustomFieldValues`.
  They must NOT call definition mutation functions.

---

## Files

| File | Key exports | Notes |
|------|-------------|-------|
| `custom-fields.queries.ts` | `getCustomFieldDefs`, `getCustomFieldDefById`, `getCustomFieldValues`, `getCustomFieldDefsByApiKeys` | Read-only queries |
| `custom-fields.service.ts` | `createCustomFieldDef`, `updateCustomFieldDef`, `deleteCustomFieldDef`, `upsertCustomFieldValues`, `CustomFieldError` | Write operations |
| `index.ts` | All of the above | Barrel |

---

## Key Invariants

1. `api_key` changes must be rejected with `CFG_CUSTOM_FIELD_KEY_IMMUTABLE`.
2. `entity_type` changes must be rejected (immutable after creation).
3. Delete with existing values = soft-deactivate (set `active = false`), not hard delete.
4. `required` validation is prospective — do not apply to historical records.
5. All writes (both definition and value) produce an audit log row in the same transaction.

---

## PR Checklist

- [ ] New definition mutations must call `writeAuditLog` inside the same transaction
- [ ] New entity type support requires updating `CustomFieldEntityTypeValues` in contracts first
- [ ] `upsertCustomFieldValues` stays in this module; entity services import and call it
- [ ] OWNERS.md Files table updated if new files added

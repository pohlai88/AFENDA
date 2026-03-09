# core/kernel/governance/settings — OWNERS

> **Package-wide rules are inherited from `packages/core/OWNERS.md`.**
> This file covers only what is specific to this directory.

## Purpose

Service layer for org-scoped configuration settings. Implements:
- Per-key metadata registry (defaults, categories, secret flags)
- Per-key value validation (Zod schemas)
- Atomic upsert with audit trail
- Effective-value reads (default + org override merged)

---

## Import Rules

- Imports `@afenda/contracts` (types + Zod schemas) and `@afenda/db` (table refs).
- Never imports `@afenda/ui` or anything from `apps/`.
- `settings.value-schemas.ts` imports Zod directly — do NOT use contract schemas here
  (separation of concerns: contracts define wire shape, core defines validation).

---

## Files

| File | Key exports | Notes |
|------|-------------|-------|
| `settings.registry.ts` | `SETTING_REGISTRY`, `SettingDefinition`, `SettingCategory` | Per-key metadata; read at query time |
| `settings.value-schemas.ts` | `SETTING_VALUE_SCHEMAS` | Per-key Zod map; read at write time |
| `settings.queries.ts` | `getEffectiveSettings`, `getSettingsRaw` | `getSettingsRaw` is internal only |
| `settings.service.ts` | `upsertSettings`, `SettingsError` | Atomic validation + upsert + audit |
| `index.ts` | Barrel re-export | |
| `__vitest_test__/settings.service.test.ts` | Unit tests | Mocks DB |

---

## Registry Synchronization — Mandatory Checklist

Every new key added to `SettingKeyValues` requires a same-PR update to all four:

| Location | Required change |
|------|----------------|
| `packages/contracts/.../setting-keys.ts` | Add to `SettingKeyValues` |
| `packages/contracts/.../settings.commands.ts` | Add variant to `SettingUpdate` union |
| `settings.registry.ts` | Add entry to `SETTING_REGISTRY` |
| `settings.value-schemas.ts` | Add entry to `SETTING_VALUE_SCHEMAS` |

Compile-time assertions in both registry files catch missing entries at build time.

---

## PR Checklist

- [ ] Compile-time assertions still pass (no new TypeScript errors)
- [ ] New key added to all four files above
- [ ] Unit test covers new key's default value and at least one validation case
- [ ] No `new Date()` — use `sql\`now()\`` in service layer

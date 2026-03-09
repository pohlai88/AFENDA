# contracts/kernel/governance/settings — OWNERS

> **Package-wide rules are inherited from `packages/contracts/OWNERS.md`.**
> This file covers only what is specific to this directory.

## Purpose

Shared type contracts for the `kernel/governance/settings` module.
Consumed by `@afenda/db` (key vocabulary), `@afenda/core` (registry, service),
`apps/api` (route schemas), and `apps/web` (API client types).

---

## Import Rules

- **No imports from other `@afenda/*` packages** except shared primitives
  (`ids.ts`, `datetime.ts`, `execution/outbox/envelope.ts`,
  `execution/idempotency/request-key.ts`).
- `setting-keys.ts` is **Zod-free** — safe to import in `@afenda/db`.
- All files export only types + schemas — no runtime logic.

---

## Files

| File | Key exports | Notes |
|------|-------------|-------|
| `setting-keys.ts` | `SettingKeyValues`, `SettingKey` | `as const` array, Zod-free |
| `settings.entity.ts` | `OrgSettingSchema`, `OrgSetting` | Mirrors `org_setting` DB table |
| `settings.commands.ts` | `UpdateSettingsCommandSchema`, `UpdateSettingsCommand`, `SettingUpdate` | PATCH body + discriminated union |
| `settings.query.ts` | `SettingsQueryParamsSchema`, `SettingValueResponseSchema`, `SettingsResponseSchema`, `SettingsSliceResponseSchema` | GET params + response shapes |
| `index.ts` | Barrel re-export of all above | |

---

## PR Checklist

When adding a new setting key:
- [ ] Add to `SettingKeyValues` in `setting-keys.ts`
- [ ] Add variant to `SettingUpdate` union in `settings.commands.ts`
- [ ] Update `SettingsResponseSchema` explicit object if Phase 1 keys grow
- [ ] Add to `SETTING_REGISTRY` in `packages/core` (separate PR step)
- [ ] Add to `SETTING_VALUE_SCHEMAS` in `packages/core` (separate PR step)

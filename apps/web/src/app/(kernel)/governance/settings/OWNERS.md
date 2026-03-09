# web/(kernel)/governance/settings — OWNERS

## Purpose

General Settings page group. Phase 1 implements the `General` tab (units + email)
with a schema-driven form. Later tabs (Email, Discuss, Contacts, etc.) follow
the same RSC + client-component pattern.

---

## Import Rules

- `page.tsx` is an RSC — calls `fetchSettings()` and hydrates the Client Component.
- `GeneralSettingsClient.tsx` is `"use client"` — owns form dirty state and Save/Discard.
- `settings-ui-config.ts` contains display-only config (labels, control types).
  It does NOT contain validation logic (which lives in `@afenda/core`).
- Never import `SETTING_REGISTRY` or `SETTING_VALUE_SCHEMAS` from `@afenda/core`
  in any web file — import boundary violation.

---

## Files

| File | Purpose |
|------|---------|
| `layout.tsx` | Settings sidebar nav (General / Email / Discuss / …) |
| `page.tsx` | General Settings RSC — fetches initial data |
| `GeneralSettingsClient.tsx` | Interactive form with Save/Discard bar |
| `settings-ui-config.ts` | `SETTINGS_FIELD_UI` display config per key |

---

## PR Checklist

When adding a new settings tab:
- [ ] New `page.tsx` added under appropriate sub-route (`emails/`, `discuss/`, etc.)
- [ ] Corresponding entry added to `SETTINGS_NAV` in `layout.tsx`
- [ ] `SETTINGS_FIELD_UI` entries added for all new keys
- [ ] No hardcoded color values in `.tsx` files (token-compliance gate)

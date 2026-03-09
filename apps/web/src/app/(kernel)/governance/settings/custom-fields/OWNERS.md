# web/(kernel)/governance/settings/custom-fields — OWNERS

> **Package-wide rules are inherited from `apps/web/OWNERS.md`.**
> This file covers only what is specific to this directory.

## Purpose

Settings UI entry point for the `kernel/governance/custom-fields` module.

This page group is the **settings entry point** for custom fields management.
The implementation module (`kernel/governance/custom-fields`) is a sibling of
`kernel/governance/settings`, NOT a child. They are distinct modules.

---

## Import Rules

- Imports `@afenda/contracts` (types only — vocabulary, schemas).
- Imports `@/lib/api-client` for data fetching.
- Never imports `@afenda/core` or `@afenda/db`.
- Server components (page.tsx) fetch data via API client.
- Client components (`CustomFieldsClient.tsx`) manage interactive state.

---

## Files

| File | Contents | Notes |
|------|----------|-------|
| `page.tsx` | RSC page — fetches initial definitions | Uses `fetchCustomFieldDefs` |
| `CustomFieldsClient.tsx` | `"use client"` — create/update/deactivate/delete field definitions | Phase 3: capture and display only |
| `OWNERS.md` | This file | |

---

## Phase 3 Scope Limit

Phase 3 custom fields support **capture and display only**. The following are
explicitly out of scope in this UI:

- Search/filter list pages by custom field value (Phase 4)
- CSV export column inclusion (Phase 4)
- Report column customisation (Phase 4+)
- PDF template inclusion (Phase 5+)
- Role-based field visibility (Phase 4+)

---

## PR Checklist

- [ ] New UI features do not import from `@afenda/core` or `@afenda/db`
- [ ] Server components use `fetchCustomFieldDefs` from `@/lib/api-client`
- [ ] Client components use `useTransition` for non-blocking mutations
- [ ] Phase scope limits documented when adding capabilities

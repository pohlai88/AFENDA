# web/(kernel)/governance — OWNERS

## Purpose

Next.js route group for governance pages: audit trail, compliance evidence,
and system settings. Placed under `(kernel)/governance/` per ADR-0005 §5.6.

Not to be confused with `(kernel)/admin/` which is strictly observability
(insights, traces). Governance is actor-facing config and compliance.

---

## Import Rules

- Page components import `@afenda/contracts` and `@afenda/ui` only.
- Never import `@afenda/core` or `@afenda/db` — all data via `lib/api-client.ts`.
- Server Components (`page.tsx`) call `fetchXxx()` functions.
- Client Components (`*Client.tsx`) own interactive state.

---

## Files

| File | Purpose |
|------|---------|
| `layout.tsx` | Top bar with governance navigation shell |
| `settings/` | General settings sub-group |

---

## PR Checklist

- [ ] New governance sub-routes placed under `(kernel)/governance/`
- [ ] Page component is an RSC (no `"use client"` at top level)
- [ ] Interactive form logic extracted to a `*Client.tsx` component

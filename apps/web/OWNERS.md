# apps/web — OWNERS

## Purpose

Next.js 16 App Router frontend application.
All App Router pages are organized under `src/app/` using route groups.

## Import Rules

| May import          | Must NOT import     |
| ------------------- | ------------------- |
| `@afenda/contracts` | `@afenda/db`        |
| `@afenda/ui`        | `@afenda/core`      |
| `react`, `next`     | `drizzle-orm`, `pg` |
| `tailwindcss`       |                     |

## File Inventory

### App root

| File | Description |
|---|---|
| `src/app/layout.tsx` | Root layout — font loading, `TooltipProvider`, globals.css |
| `src/app/page.tsx` | Dashboard home page |
| `src/app/global-error.tsx` | Next.js global error boundary |
| `src/app/globals.css` | Tailwind v4 engine + `@afenda/ui/styles.css` import |

### `(kernel)/` route group

| File | Description |
|---|---|
| `(kernel)/admin/layout.tsx` | Admin shell layout |
| `(kernel)/admin/page.tsx` | Admin dashboard |
| `(kernel)/admin/insights/page.tsx` | OTel Insight Factory dashboard |
| `(kernel)/admin/insights/internal-insights.ts` | Shared OTel insight response generator |
| `(kernel)/admin/traces/page.tsx` | Jaeger trace viewer |
| `(kernel)/auth/signin/page.tsx` | Sign-in page (Neon Auth migration target) |
| `(public)/auth/signout/page.tsx` | Sign-out transition page |
| `(public)/auth/reset-password/status/page.tsx` | Reset-password outcome status page |
| `(kernel)/governance/` | ← directory scaffolded, no pages yet (Sprint 3) |

### `(erp)/` route group

| File | Description |
|---|---|
| `(erp)/finance/layout.tsx` | Finance section layout |
| `(erp)/finance/ap/invoices/page.tsx` | Invoice list |
| `(erp)/finance/ap/invoices/InvoiceListClient.tsx` | Client component for invoice list |
| `(erp)/finance/ap/invoices/[id]/page.tsx` | Invoice detail |
| `(erp)/finance/ap/invoices/[id]/InvoiceDetailClient.tsx` | Client component for invoice detail |
| `(erp)/finance/gl/` | ← directory scaffolded, no pages yet (Sprint 3) |
| `(erp)/finance/reporting/` | ← stub directory (future) |
| `(erp)/finance/treasury/` | ← stub directory (future) |
| `(erp)/suppliers/` | ← directory scaffolded, no pages yet (Sprint 3) |
| `(erp)/crm/ hr/ inventory/ project/ purchasing/ sales/` | ← stub directories (non-Day-1 scope) |

### `(comm)/` route group

| Directory | Status |
|---|---|
| `(comm)/chatter/` | ← stub directory (Sprint 5+) |
| `(comm)/inbox/` | ← stub directory (Sprint 5+) |
| `(comm)/notifications/` | ← stub directory (Sprint 5+) |

### API routes (Next.js route handlers)

| File | Description |
|---|---|
| `api/auth/[...path]/route.ts` | Neon Auth route handler (sign-in, sign-up, OAuth callback, session, etc.) |
| `api/internal/insights/route.ts` | Proxied OTel insights endpoint |

### Lib

| File | Description |
|---|---|
| `auth.ts` | Auth shim during Neon Auth migration |
| `src/lib/api-client.ts` | Typed fetch wrapper for `apps/api` |
| `src/lib/utils.ts` | Miscellaneous utility functions |

### E2E tests

| File | Description |
|---|---|
| `e2e/smoke.spec.ts` | Playwright smoke test — page loads, no 500s |

## Belongs Here

- Next.js pages, layouts, and route groups
- Client components and React hooks
- Server Components (data fetching via API, not direct DB)
- Tailwind CSS styling
- Public assets

## Does NOT Belong Here

- Direct database access (→ call `apps/api` instead)
- Business logic (→ `@afenda/core`)
- Shared components (→ `@afenda/ui`)
- Background jobs (→ `apps/worker`)

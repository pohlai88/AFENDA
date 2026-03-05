# apps/web — OWNERS

## Purpose

Next.js 16 App Router frontend application.

## Import Rules

| May import          | Must NOT import     |
| ------------------- | ------------------- |
| `@afenda/contracts` | `@afenda/db`        |
| `@afenda/ui`        | `@afenda/core`      |
| `react`, `next`     | `drizzle-orm`, `pg` |
| `tailwindcss`       |                     |

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

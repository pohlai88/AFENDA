# @afenda/ui — OWNERS

## Purpose
Shared React UI components (design system) for the web application.

## Import Rules
| May import            | Must NOT import      |
|-----------------------|----------------------|
| `@afenda/contracts`   | `@afenda/db`         |
| `react`, `react-dom`  | `@afenda/core`       |
| `tailwindcss`         | `drizzle-orm`, `pg`  |
| `shadcn/ui` components|                      |

## Belongs Here
- Reusable React components (buttons, forms, tables, dialogs)
- Design tokens and theme configuration
- Shared layout components

## Does NOT Belong Here
- Business logic (→ `@afenda/core`)
- DB access (→ `@afenda/db`)
- Page-level components (→ `apps/web`)
- API route handlers (→ `apps/api`)

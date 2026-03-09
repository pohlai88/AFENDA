# @afenda/ui — OWNERS

## Purpose

Shared React UI components (design system) for the web application.
Built on **shadcn/ui** + **Tailwind CSS v4**.

## Import Rules

| May import             | Must NOT import     |
| ---------------------- | ------------------- |
| `@afenda/contracts`    | `@afenda/db`        |
| `react`, `react-dom`   | `@afenda/core`      |
| `tailwindcss`          | `drizzle-orm`, `pg` |
| `shadcn/ui` components |                     |

## Directory Layout

| Directory / File        | Purpose                                                                    |
| ----------------------- | -------------------------------------------------------------------------- |
| `src/components/`       | shadcn/ui component primitives (Button, Badge, Card, Dialog, Table, …)    |
| `src/field-kit/`        | Metadata-driven widget matrix — maps `FieldType` to cell/form renderers   |
| `src/meta/`             | Code-first entity metadata registry (zero React imports, server-safe)     |
| `src/generated/`        | Auto-generated components driven by entity metadata (GeneratedList, etc.) |
| `src/lib/utils.ts`      | `cn()` utility (clsx + tailwind-merge)                                    |
| `src/money.ts`          | `formatMoney()` — locale-aware minor-unit display                         |
| `src/index.ts`          | Root barrel                                                                |
| `src/styles/`           | 9-pillar design system CSS (published as `@afenda/ui/styles.css`). See note below. |

> **Note — styles path:** The package `exports` map exposes
> `"./styles.css": "./src/styles/index.css"`. This is the design system
> CSS consumed by `apps/web/src/app/globals.css` via `@import "@afenda/ui/styles.css"`.

## Belongs Here

- Reusable React components (buttons, forms, tables, dialogs)
- Design tokens and theme configuration (9-pillar CSS system)
- Shared layout components
- Metadata-driven form + list renderers
- Entity metadata registry

## Does NOT Belong Here

- Business logic (→ `@afenda/core`)
- DB access (→ `@afenda/db`)
- Page-level components (→ `apps/web`)
- API route handlers (→ `apps/api`)

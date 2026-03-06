# UI Primitives / Components

Domain: `packages/ui/src/components/`

## Purpose

Lightweight styled component primitives (Table, Badge, Button) that follow
the shadcn/ui API surface. These will be replaced by actual shadcn/ui
components when Phase 0 (shadcn init) runs.

## Boundary

- Imports from: `react`, `react-dom` only
- Imported by: `packages/ui/src/field-kit/`, `packages/ui/src/generated/`

## Upgrade path

When shadcn/ui is installed (`npx shadcn@latest add <component>`), the generated
files land here and replace the lightweight stubs. The API surface is designed
to be compatible, so consumers should not need changes.

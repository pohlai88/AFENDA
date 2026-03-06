# UI Meta Registry

Domain: `packages/ui/src/meta/`

## Purpose

Code-first entity metadata registry (pure TypeScript — **zero React imports**).
Defines entity structures, field definitions, view layouts, flow state machines,
and action definitions that drive the generated UI components.

## Boundary

- Imports from: `@afenda/contracts` only
- Imported by: `packages/ui` (field-kit, generated components), `apps/web`
- **Must NOT import**: `react`, `react-dom`, any UI framework

## Key constraint

This directory **must remain server-importable**. The API could consume these
definitions for server-side validation, query profiles, or export logic without
pulling React/shadcn into the bundle. The `META_NO_REACT` CI gate enforces this.

## Key files

| File | Purpose |
|---|---|
| `types.ts` | `EntityRegistration` interface |
| `registry.ts` | Map-based registry: `getEntity()`, `getView()`, `getFlow()`, `getActions()` |
| `overlay.ts` | `applyOverlays()` — additive view patch resolution |
| `entities/*.ts` | Entity definitions (one per entity) |

## Adding a new entity

1. Create `entities/<domain>.<entity-key>.ts`
2. Export an `EntityRegistration` object with all required fields
3. Import and register in `registry.ts`
4. Run `node tools/gates/ui-meta.mjs` to validate referential integrity

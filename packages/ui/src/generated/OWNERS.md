# Generated Components

Domain: `packages/ui/src/generated/`

## Purpose

Metadata-driven React components that consume entity registry definitions
and capability results to render UI automatically. These are the main
render targets of the UI autogen system.

## Boundary

- Imports from: `@afenda/contracts`, `packages/ui/src/meta/`, `packages/ui/src/field-kit/`, `packages/ui/src/components/`
- Imported by: `apps/web` (page components)

## Key files

| File | Purpose |
|---|---|
| `GeneratedList.tsx` | Metadata-driven data table with sort, pagination, row actions |
| `GeneratedForm.tsx` | Tabbed form layout driven by ViewDef + capability gating |
| `FlowStepper.tsx` | Horizontal flow state machine indicator with transition buttons |
| `ActionLauncher.tsx` | Single action button gated by capabilities |

## Non-negotiable rules

1. **Never make permission decisions** — capabilities arrive as props.
2. **Never import `@afenda/core`** — boundary law: UI → contracts only.
3. **Never hardcode entity-specific logic** — all behavior comes from metadata.
4. **Missing cap = safe default** — unknown fields are hidden, unknown actions are disabled.

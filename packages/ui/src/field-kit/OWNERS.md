# Field Kit Matrix

Domain: `packages/ui/src/field-kit/`

## Purpose

Widget matrix mapping each `FieldType` to its cell renderer, form widget,
filter operations, and export adapter. Provides the runtime bridge between
metadata field types and React rendering components.

## Boundary

- Imports from: `@afenda/contracts`, `@afenda/ui` (components, money formatter)
- Imported by: `packages/ui/src/generated/` (GeneratedList, GeneratedForm)

## Key files

| File | Purpose |
|---|---|
| `types.ts` | `FieldKit<T>` interface, `CellRendererProps`, `FormWidgetProps` |
| `registry.ts` | `getFieldKit(fieldType)` — O(1) lookup, throws if unregistered |
| `kits/*.tsx` | One module per FieldType (12 total) |

## Adding a new field type

1. Add the type to `FieldTypeValues` in `@afenda/contracts/meta/field-type.ts`
2. Create `kits/<type>.tsx` implementing `FieldKit<T>`
3. Register in `registry.ts`
4. Run `node tools/gates/ui-meta.mjs` to verify completeness

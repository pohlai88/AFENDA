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
| `index.ts` | Barrel — re-exports registry, types, document kit factory |
| `kits/*.tsx` | One module per FieldType (14 total) |

## FieldType → Kit mapping

| FieldType | Kit file | Notes |
|---|---|---|
| `string` | `kits/string.tsx` | Base text; empty → undefined |
| `int` | `kits/int.tsx` | Integer; safe empty handling |
| `decimal` | `kits/decimal.tsx` | Generic decimal (non-money) |
| `money` | `kits/money.tsx` | BigInt minor units; currency from record |
| `date` | `kits/date.tsx` | YYYY-MM-DD date-only |
| `datetime` | `kits/datetime.tsx` | UTC ISO instant |
| `enum` | `kits/enum.tsx` | validation.enumValues; EMPTY_VALUE sentinel |
| `relation` | `kits/relation.tsx` | validation.options; strict select-only |
| `json` | `kits/json.tsx` | Raw text; no parse-on-keystroke |
| `bool` | `kits/bool.tsx` | Non-nullable boolean |
| `nullableBool` | `kits/nullable-bool.tsx` | Tri-state Yes/No/Not set |
| `document` | `kits/document.tsx` | DocumentRef; createDocumentKit factory |
| `percent` | `kits/percent.tsx` | Whole percent; type="text" |

## Adding a new field type

1. Add the type to `FieldTypeValues` in `@afenda/contracts/src/kernel/registry/field-type.ts`
2. Create `kits/<type>.tsx` implementing `FieldKit<T>`
3. Register in `registry.ts`
4. Run `node tools/gates/ui-meta.mjs` to verify completeness

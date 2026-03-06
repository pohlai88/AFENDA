# contracts/meta — UI Autogen Meta Type System

## Purpose

Zod schemas defining the **transport shape** of entity/field/view/action/overlay/flow/capability metadata for the UI autogen system.

## Rules

1. **Transport only** — no React, no Tailwind, no icon imports, no CSS references.
2. Renderer values are **semantic string enums** (`"money"`, `"badge"`, `"date"`) — never component names.
3. Adding a schema field is safe. Removing or renaming is a **BREAKING CHANGE**.
4. `FieldTypeValues` is `as const` — used by `@afenda/db` for pgEnum.
5. Consumers import from `@afenda/contracts`, never from deep paths.

## Files

| File              | Key Exports                                                                                                      | Notes                                      |
|-------------------|------------------------------------------------------------------------------------------------------------------|--------------------------------------------|
| `field-type.ts`   | `FieldTypeValues`, `FieldTypeSchema`, `FieldType`                                                                | 12 field types; pgEnum source of truth     |
| `entity-def.ts`   | `EntityDefSchema`, `EntityDef`                                                                                   | Domain-scoped entity metadata              |
| `field-def.ts`    | `FieldDefSchema`, `FieldDef`                                                                                     | Per-field metadata + validation hints      |
| `view-def.ts`     | `ViewDefSchema`, `ListViewDefSchema`, `FormViewDefSchema`, `KanbanViewDefSchema`, `ColumnDef`, `QueryProfile`    | Discriminated union by viewType            |
| `action-def.ts`   | `ActionDefSchema`, `ActionDef`                                                                                   | Launchable UI actions                      |
| `overlay-def.ts`  | `OverlayDefSchema`, `OverlayDef`, `OverlayPatchOpSchema`                                                        | Additive view modifications with priority  |
| `flow-def.ts`     | `FlowDefSchema`, `FlowDef`, `FlowTransitionSchema`                                                              | State machine for entity lifecycle         |
| `capability.ts`   | `CapabilityResultSchema`, `CapabilityResult`, `FieldCap`, `ActionCap`                                            | Record-based O(1) permission lookup        |
| `index.ts`         | Barrel re-export                                                                                                 | Re-exports all meta schemas                |

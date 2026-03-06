/**
 * EntityRegistration — the full metadata bundle for a registered entity.
 *
 * This is the type that entity definition files export. The registry
 * collects these and makes them queryable at runtime.
 *
 * RULES:
 *   1. ZERO React imports — this module is pure TS.
 *   2. Imports from `@afenda/contracts` only (boundary law).
 */
import type {
  EntityDef,
  FieldDefInput,
  ViewDefInput,
  ActionDef,
  FlowDefInput,
  OverlayDef,
} from "@afenda/contracts";

/**
 * Uses *Input* variants for schemas with `.default()` fields so that
 * entity definition objects don't need to repeat every default value.
 */
export interface EntityRegistration {
  entityDef: EntityDef;
  fieldDefs: readonly FieldDefInput[];
  views: Record<string, ViewDefInput>;
  actions: readonly ActionDef[];
  flowDef?: FlowDefInput;
  /** Code-defined overlays for this entity (DB-driven overlays deferred to Phase 2). */
  overlays?: readonly OverlayDef[];
}

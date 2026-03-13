/**
 * Entity Registry — queryable map of all registered entity metadata.
 *
 * RULES:
 *   1. ZERO React imports — pure TS.
 *   2. Imports from `@afenda/contracts` only (boundary law).
 *   3. Entity registrations are imported directly — code-first, not DB.
 */
import type {
  EntityDef,
  FieldDefInput,
  ViewDefInput,
  ViewDef,
  ActionDef,
  FlowDefInput,
  OverlayDef,
} from "@afenda/contracts";
import type { EntityRegistration } from "./types";
import { applyOverlays, type OverlayContext } from "./overlay";
import { financeApInvoice } from "./entities/finance.ap-invoice";
import { supplierSupplier } from "./entities/supplier";
import { glAccount } from "./entities/gl.account";
import { glJournalEntry } from "./entities/gl.journal-entry";
import { commWorkflow } from "./entities/comm.workflow";

// ── Registry ──────────────────────────────────────────────────────────────────

const registry = new Map<string, EntityRegistration>([
  [financeApInvoice.entityDef.entityKey, financeApInvoice],
  [supplierSupplier.entityDef.entityKey, supplierSupplier],
  [glAccount.entityDef.entityKey, glAccount],
  [glJournalEntry.entityDef.entityKey, glJournalEntry],
  [commWorkflow.entityDef.entityKey, commWorkflow],
]);

// ── Public API ────────────────────────────────────────────────────────────────

/** Get the full registration for an entity, or throw if unknown. */
export function getEntityRegistration(entityKey: string): EntityRegistration {
  const reg = registry.get(entityKey);
  if (!reg) {
    throw new Error(`[meta-registry] Unknown entity: "${entityKey}"`);
  }
  return reg;
}

/** Get the EntityDef + field list. */
export function getEntity(entityKey: string): {
  entityDef: EntityDef;
  fieldDefs: readonly FieldDefInput[];
} {
  const reg = getEntityRegistration(entityKey);
  return { entityDef: reg.entityDef, fieldDefs: reg.fieldDefs };
}

/** Get a specific view with overlays applied. */
export function getView(
  entityKey: string,
  viewKey = "default",
  overlayCtx?: OverlayContext,
): ViewDefInput {
  const reg = getEntityRegistration(entityKey);
  const view = reg.views[viewKey];
  if (!view) {
    throw new Error(`[meta-registry] Unknown view "${viewKey}" on entity "${entityKey}"`);
  }

  // Apply code-defined overlays if present
  const overlays = reg.overlays;
  if (overlays && overlays.length > 0) {
    if (process.env.NODE_ENV !== "production") {
      console.debug("[meta-registry] getView: applying overlays", {
        entityKey,
        viewKey,
        overlayCount: overlays.length,
        ctx: overlayCtx,
      });
    }
    // ViewDefInput is compatible with ViewDef for overlay application
    return applyOverlays(view as ViewDef, overlays, overlayCtx) as ViewDefInput;
  }

  if (process.env.NODE_ENV !== "production") {
    console.debug("[meta-registry] getView: resolved", {
      entityKey,
      viewKey,
      viewType: view.viewType,
    });
  }

  return view;
}

/** Get the flow definition, or undefined if the entity has no flow. */
export function getFlow(entityKey: string): FlowDefInput | undefined {
  return getEntityRegistration(entityKey).flowDef;
}

/** Get all actions for an entity. */
export function getActions(entityKey: string): readonly ActionDef[] {
  return getEntityRegistration(entityKey).actions;
}

/** List all registered entity keys. */
export function listEntityKeys(): string[] {
  return [...registry.keys()];
}

/** Register a new entity (used by tests / dynamic registration). */
export function registerEntity(reg: EntityRegistration): void {
  registry.set(reg.entityDef.entityKey, reg);
}

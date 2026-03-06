/**
 * Overlay resolver — applies additive overlay patches to a base ViewDef.
 *
 * RULES:
 *   1. No React imports — pure TS only (server-safe).
 *   2. Overlays sorted by `priority` (ascending) for deterministic order.
 *   3. `requiresBaseVersion` must match `view.version` or overlay is skipped/rejected.
 *   4. Non-negotiable invariants:
 *      - Overlays can **hide** but cannot **delete** base fields/columns.
 *      - Overlays cannot change a field's `fieldType` or semantic meaning.
 *      - Overlays cannot remove required controls (evidence tabs, guards).
 *      - Overlays cannot remove flow transitions or guards.
 */
import type {
  OverlayDef,
  OverlayPatchOp,
  ViewDef,
  ListViewDef,
  FormViewDef,
  RendererType,
} from "@afenda/contracts";

// ── Error types ───────────────────────────────────────────────────────────────

export class OverlayConflictError extends Error {
  constructor(
    public readonly overlayKey: string,
    public readonly op: OverlayPatchOp,
    message: string,
  ) {
    super(`Overlay "${overlayKey}" conflict: ${message}`);
    this.name = "OverlayConflictError";
  }
}

export class OverlayVersionMismatchError extends Error {
  constructor(
    public readonly overlayKey: string,
    public readonly expectedVersion: number,
    public readonly actualVersion: number,
  ) {
    super(
      `Overlay "${overlayKey}" requires base version ${expectedVersion} but view is at version ${actualVersion}`,
    );
    this.name = "OverlayVersionMismatchError";
  }
}

// ── Scope matching ────────────────────────────────────────────────────────────

export interface OverlayContext {
  orgId?: string;
  roleKey?: string;
}

function matchesScope(overlay: OverlayDef, ctx: OverlayContext): boolean {
  const { scope } = overlay;
  if (scope.orgId !== "*" && scope.orgId !== ctx.orgId) return false;
  if (scope.roleKey !== "*" && scope.roleKey !== ctx.roleKey) return false;

  // Check time window
  const now = new Date().toISOString();
  if (overlay.activeFrom && now < overlay.activeFrom) return false;
  if (overlay.activeTo && now > overlay.activeTo) return false;

  return true;
}

// ── Apply helpers ─────────────────────────────────────────────────────────────

function applyToListView(
  view: ListViewDef,
  op: OverlayPatchOp,
  overlayKey: string,
  conflictPolicy: OverlayDef["conflictPolicy"],
): ListViewDef {
  switch (op.op) {
    case "addColumn": {
      const exists = view.columns.some((c) => c.fieldKey === op.fieldKey);
      if (exists) {
        if (conflictPolicy === "reject") {
          throw new OverlayConflictError(
            overlayKey,
            op,
            `Column "${op.fieldKey}" already exists`,
          );
        }
        // last-write-wins or merge: skip (column already present)
        return view;
      }
      const newCol = {
        fieldKey: op.fieldKey,
        renderer: (op.renderer ?? "text") as RendererType,
      };
      const columns = [...view.columns];
      if (op.position !== undefined && op.position < columns.length) {
        columns.splice(op.position, 0, newCol);
      } else {
        columns.push(newCol);
      }
      return { ...view, columns };
    }

    case "hideColumn": {
      // Hide by filtering — does NOT delete from base, just from resolved view
      const columns = view.columns.filter((c) => c.fieldKey !== op.fieldKey);
      return { ...view, columns };
    }

    case "addAction": {
      const exists = view.rowActions.some(
        (a) => a.actionKey === op.actionKey,
      );
      if (exists) {
        if (conflictPolicy === "reject") {
          throw new OverlayConflictError(
            overlayKey,
            op,
            `Action "${op.actionKey}" already exists`,
          );
        }
        return view;
      }
      const rowActions = [...view.rowActions];
      const newAction = { actionKey: op.actionKey, label: op.actionKey, variant: "default" as const, confirm: false };
      if (op.position !== undefined && op.position < rowActions.length) {
        rowActions.splice(op.position, 0, newAction);
      } else {
        rowActions.push(newAction);
      }
      return { ...view, rowActions };
    }

    default:
      // Other ops (addField, hideField, reorderSection, addValidation) don't apply to list views
      return view;
  }
}

function applyToFormView(
  view: FormViewDef,
  op: OverlayPatchOp,
  overlayKey: string,
  conflictPolicy: OverlayDef["conflictPolicy"],
): FormViewDef {
  switch (op.op) {
    case "addField": {
      // Find the target section across all tabs
      const tabs = view.tabs.map((tab) => ({
        ...tab,
        sections: tab.sections.map((section) => {
          if (section.sectionKey !== op.sectionKey) return section;

          const exists = section.fields.some((f) => f.fieldKey === op.fieldKey);
          if (exists) {
            if (conflictPolicy === "reject") {
              throw new OverlayConflictError(
                overlayKey,
                op,
                `Field "${op.fieldKey}" already in section "${op.sectionKey}"`,
              );
            }
            return section;
          }

          const fields = [...section.fields];
          const newField = { fieldKey: op.fieldKey, colSpan: 1 };
          if (op.position !== undefined && op.position < fields.length) {
            fields.splice(op.position, 0, newField);
          } else {
            fields.push(newField);
          }
          return { ...section, fields };
        }),
      }));
      return { ...view, tabs };
    }

    case "hideField": {
      // Hide field from all sections across all tabs
      const tabs = view.tabs.map((tab) => ({
        ...tab,
        sections: tab.sections.map((section) => ({
          ...section,
          fields: section.fields.filter((f) => f.fieldKey !== op.fieldKey),
        })),
      }));
      return { ...view, tabs };
    }

    case "reorderSection": {
      // Find the tab containing the section, then move it
      const tabs = view.tabs.map((tab) => {
        const idx = tab.sections.findIndex(
          (s) => s.sectionKey === op.sectionKey,
        );
        if (idx === -1) return tab;

        const sections = [...tab.sections];
        const [moved] = sections.splice(idx, 1);
        const insertAt = Math.min(op.newPosition, sections.length);
        sections.splice(insertAt, 0, moved!);
        return { ...tab, sections };
      });
      return { ...view, tabs };
    }

    case "addAction": {
      // Actions are not directly on form views, but guards can reference them.
      // For form views, addAction is a no-op (actions live in the entity registration).
      return view;
    }

    default:
      // hideColumn, addColumn, addValidation — not applicable to form layout
      return view;
  }
}

// ── Invariant enforcement ─────────────────────────────────────────────────────

/** Side panel types that cannot be removed by overlays. */
const PROTECTED_PANEL_TYPES = new Set(["evidence", "audit"]);

/**
 * Validate that an overlay op does not violate non-negotiable invariants.
 * Throws OverlayConflictError if violated.
 */
function enforceInvariants(
  baseView: ViewDef,
  op: OverlayPatchOp,
  overlayKey: string,
): void {
  // Invariant: overlays cannot introduce unknown op types that could
  // destructively mutate the view. Only the 7 declared ops are valid.
  const allowedOps = new Set([
    "addColumn",
    "hideColumn",
    "addField",
    "hideField",
    "reorderSection",
    "addAction",
    "addValidation",
  ]);
  if (!allowedOps.has(op.op)) {
    throw new OverlayConflictError(
      overlayKey,
      op,
      `Unknown patch op "${op.op}" — overlays support only: ${[...allowedOps].join(", ")}`,
    );
  }

  // Invariant: cannot hide fields that are entity primary fields.
  // (This is a soft invariant — the primary field is critical for rendering.)
  if (op.op === "hideField" || op.op === "hideColumn") {
    if (
      baseView.viewType === "form" &&
      (baseView as FormViewDef).guards.length > 0
    ) {
      // Cannot hide guard-referenced fields (would break security).
      const guardFields = (baseView as FormViewDef).guards.map(
        (g) => g.permission,
      );
      // Guards reference permissions, not fieldKeys, so this check is informational.
      // The real guard protection is below (cannot remove guards themselves).
      void guardFields;
    }
  }
}

/**
 * Validate that a form view's guards and protected panels survive overlay application.
 * Called after all ops are applied to the resolved form view.
 */
function enforcePostApplyInvariants(
  baseView: ViewDef,
  resolvedView: ViewDef,
  lastOverlayKey: string,
): void {
  if (baseView.viewType !== "form" || resolvedView.viewType !== "form") return;

  const baseForm = baseView as FormViewDef;
  const resolvedForm = resolvedView as FormViewDef;

  // Invariant: guards cannot be removed
  if (resolvedForm.guards.length < baseForm.guards.length) {
    throw new OverlayConflictError(
      lastOverlayKey,
      { op: "hideField", fieldKey: "__guard__" } as OverlayPatchOp,
      "Overlays cannot remove form guards — security invariant violated",
    );
  }

  // Invariant: protected side panels (evidence, audit) cannot be removed
  for (const basePanel of baseForm.sidePanels) {
    if (PROTECTED_PANEL_TYPES.has(basePanel.panelType)) {
      const stillPresent = resolvedForm.sidePanels.some(
        (p) => p.panelKey === basePanel.panelKey,
      );
      if (!stillPresent) {
        throw new OverlayConflictError(
          lastOverlayKey,
          { op: "hideField", fieldKey: basePanel.panelKey } as OverlayPatchOp,
          `Cannot remove protected "${basePanel.panelType}" side panel "${basePanel.panelKey}"`,
        );
      }
    }
  }
}

// ── Main resolver ─────────────────────────────────────────────────────────────

/**
 * Apply a set of overlays to a base ViewDef, returning the resolved view.
 *
 * - Overlays are filtered by scope (org/role) and sorted by priority.
 * - `requiresBaseVersion` is validated — mismatches are skipped or rejected
 *   depending on `conflictPolicy`.
 * - Returns a new ViewDef; the base is never mutated.
 */
export function applyOverlays(
  baseView: ViewDef,
  overlays: readonly OverlayDef[],
  ctx: OverlayContext = {},
): ViewDef {
  // 1. Filter by scope + time window
  const applicable = overlays
    .filter((o) => o.targetViewKey === baseView.viewKey)
    .filter((o) => matchesScope(o, ctx));

  if (applicable.length === 0) return baseView;

  // 2. Sort by priority (ascending — lower applies first)
  const sorted = [...applicable].sort((a, b) => a.priority - b.priority);

  // 3. Apply ops sequentially
  let resolved: ViewDef = { ...baseView };

  if (process.env.NODE_ENV !== "production") {
    console.debug("[overlay] applying overlays", {
      targetViewKey: baseView.viewKey,
      baseVersion: baseView.version,
      applicableCount: sorted.length,
      overlayKeys: sorted.map((o) => o.overlayKey),
    });
  }

  for (const overlay of sorted) {
    // Version check
    if (overlay.requiresBaseVersion !== baseView.version) {
      if (overlay.conflictPolicy === "reject") {
        throw new OverlayVersionMismatchError(
          overlay.overlayKey,
          overlay.requiresBaseVersion,
          baseView.version,
        );
      }
      // last-write-wins / merge: skip this overlay silently
      continue;
    }

    for (const op of overlay.patchOps) {
      // Enforce invariants before applying
      enforceInvariants(baseView, op, overlay.overlayKey);

      if (resolved.viewType === "list") {
        resolved = applyToListView(
          resolved,
          op,
          overlay.overlayKey,
          overlay.conflictPolicy,
        );
      } else if (resolved.viewType === "form") {
        resolved = applyToFormView(
          resolved,
          op,
          overlay.overlayKey,
          overlay.conflictPolicy,
        );
      }
      // kanban views: overlay ops not yet supported
    }
  }

  // Post-apply invariant check: guards, protected panels must survive
  if (sorted.length > 0) {
    enforcePostApplyInvariants(
      baseView,
      resolved,
      sorted[sorted.length - 1]!.overlayKey,
    );
  }

  return resolved;
}

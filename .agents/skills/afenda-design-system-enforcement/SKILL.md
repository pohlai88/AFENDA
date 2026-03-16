---
name: afenda-design-system-enforcement
description: Enforces correct use of AFENDA design tokens, the L0–L4 premium elevation architecture, semantic lanes, and generous spatial rhythm. Use when editing styles, themes, layouts, or visual states.
category: ui
priority: high
---

# AFENDA Design System Enforcement

Use this skill to keep UI work aligned with the AFENDA premium token system. The core philosophy is **comfort and clarity through true layered depth and generous spacing**—avoiding cramped layouts, border fatigue, and visual noise.

## When to invoke

Invoke this skill when the request involves:
- Adding or modifying colors, spacing, radii, shadows, or motion.
- Adjusting layout density, padding, or spatial rhythm.
- Editing theme files or Tailwind theme mappings.
- Building or restyling UI components in web or ui packages.
- Fixing hardcoded color violations or contrast issues.
- Introducing new semantic or status tokens.

## Source of truth

Treat these files as canonical token sources:
- `packages/ui/src/styles/_tokens-light.css`
- `packages/ui/src/styles/_tokens-dark.css`

**Full utilization demos (Premium Architecture):**
- `packages/ui/advanced-token-system.html` — The primary reference for combining premium spacing (`--space-*`), luxury feel, physical nesting, and the L0→L4 architecture.

Follow project-wide architecture guidance from:
- `AGENTS.md`
- `.github/copilot-instructions.md`

## 1. Mandatory Surface Architecture (L0–L4)

When working in dark mode, depth is created by subtle shifts in lightness, not just borders. ALWAYS select surfaces through the 4-layer architecture:

- **L0 Atmosphere (`--surface-l0`, `--background`):** The deepest recess of the app shell. Used for outer window backgrounds and gutters.
- **L1 Operating Plane (`--surface-l1`, `--surface-100` to `250`):** The primary working canvas. Dashboards, main data grids, and forms live here.
- **L2 Elevated Content (`--surface-l2`, `--card`):** Standard content containers, KPI cards, and segmented data blocks. Creates logical grouping inside L1.
- **L3 Floating Context (`--surface-l3`, `--popover`, `--sheet`):** Transient UI like dropdowns, tooltips, and command palettes. Must cast `--shadow-popover`.
- **L4 Critical Overlays (`--surface-l4`, `--modal`):** Blocking dialogs. Must use `--shadow-modal` and be backed by the `--scrim` token to push L0–L3 into the background.

### Forbidden Layer Mistakes
* **Do not flatten depth:** Do not put L2 cards directly on an L0 background if an L1 operating plane is structurally required.
* **Do not jump layers:** Do not use L4 values for normal cards, or place modal surfaces on L2.
* **Do not fake depth:** Do not replace layer separation with stronger borders or glowing shadows. Rely on the physical nesting of surface tokens.

## 2. Premium Spacing & Rhythm

Comfortable, luxurious UI requires negative space. Use the established spatial scale to give the eye room to rest.

* `--space-section` (5rem): Use between major page regions or totally distinct conceptual blocks.
* `--space-block` (2.5rem): Use between related but distinct groupings (e.g., separating a header from a data grid).
* `--space-card` (2rem): Use for internal padding of premium elevated components.
* `--space-inline` (1.5rem): Use for standard component gaps and grid column separation.
* `--space-tight` (0.75rem): Use for tight component locking (e.g., an icon next to text).

**Rule:** Do not hardcode `rem` or `px` values for layout padding/margins if a `--space-*` token is semantically appropriate.

## 3. Strict Semantic Lanes

Do not mix interaction intents. Map visuals to the correct lane before choosing tokens:

* **Brand / Truth Lane (`--primary`):** Used for marketing-aligned components, primary SaaS submission buttons, and core branding elements.
* **Operator Lane (`--interactive`):** Used for heavy day-to-day workflow: data grid interactions, filters, inline edits, links, and shell navigation.
* **Institutional Lane (`--premium`):** Used for governance, audit logs, compliance, finalized reporting, and high-trust executive actions.
* **Neutral Lane (`--secondary`, `--muted`):** Structural UI that should not draw attention.

### Dataviz & Status Constraints
* **Global Status:** `--success`, `--warning`, `--destructive`. Only use soft backgrounds (`--*-soft` or `color-mix`) for dense grids to prevent eye strain.
* **Dataviz (`--chart-*`):** STRICTLY reserved for charts, comparisons, and series. **Never** use chart tokens for workflow statuses, badges, or buttons.

## 4. Auth Ecosystem Profile

When working on auth routes/components (`apps/web/src/app/auth`), use this fixed mapping:

* Auth shell background: L0 to L1 transition.
* Auth panels (`EmailAuthPanel`, etc.): L2.
* Inline status/feedback: semantic overlays (`--success-soft`, `--destructive-soft`).
* No L4 usage in standard auth pages unless a true blocking modal is introduced.

Use shared surface primitives from `apps/web/src/app/auth/_components/surface-styles.ts`.

## Workflow & Quality Gates

### Step 1: Assign the Depth Layer
Before picking colors, assign the component to L0, L1, L2, L3, or L4. Verify that neighboring components are at the same or adjacent layers.

### Step 2: Establish Rhythm
Apply the correct `--space-*` tokens for padding and gaps. Ensure the layout is not cramped.

### Step 3: Check Lane Semantics
Decide if the action is Brand, Operator, or Institutional. Apply the corresponding token family.

### Step 4: Validate
1.  Search for hardcoded color regressions (`#hex`, `rgb()`, `oklch()`) in edited files.
2.  Confirm no forbidden layer jumps.
3.  Confirm interaction/focus states still use tokenized ring/overlay values.
4.  Run relevant checks (`pnpm typecheck`, `pnpm check:all`).

For auth changes, run the dedicated check:
```bash
node tools/gates/auth-design-system.mjs

Completion Checklist
[ ] No hardcoded colors or raw layout measurements introduced.

[ ] Every edited surface maps to the correct L0–L4 layer and physical nesting is logical.

[ ] Spacing tokens (--space-*) are used to maintain premium rhythm.

[ ] Tokens are chosen from the correct semantic lane (Brand vs Operator vs Institutional).

[ ] Dataviz tokens are not bleeding into workflow statuses.

[ ] Modals (L4) properly utilize --scrim to obscure lower layers.
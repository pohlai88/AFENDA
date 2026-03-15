---
name: afenda-design-system-enforcement
description: Enforces correct use of AFENDA design tokens, dark/light theme parity, and shadcn-based UI styling. Use when editing styles, themes, components, or visual states.
category: ui
priority: high
---

# AFENDA Design System Enforcement

Use this skill to keep UI work aligned with the AFENDA token system and avoid visual drift.

## When to invoke

Invoke this skill when the request involves:

- adding or modifying colors, spacing, radii, shadows, or motion
- editing theme files or Tailwind theme mappings
- building or restyling UI components in web or ui packages
- fixing hardcoded color violations
- introducing new semantic or status tokens

## Source of truth

Treat these files as canonical token sources:

- `packages/ui/src/styles/_tokens-light.css`
- `packages/ui/src/styles/_tokens-dark.css`

Follow project-wide architecture guidance from:

- `AGENTS.md`
- `.github/copilot-instructions.md`

Auth-specific enforcement references:

- `docs/auth/auth-ui-layer-matrix.md`
- `tools/gates/auth-design-system.mjs`

## Mandatory dark surface contract (L0-L4)

When working in dark mode, ALWAYS select surfaces through the 4-layer architecture in `packages/ui/src/styles/_tokens-dark.css`:

- L0 atmosphere/background recesses: `--background`, `--surface-0`, `--surface-25` to `--surface-75`
- L1 operating surfaces: `--surface-100` to `--surface-250`
- L2 elevated content: `--surface-275` to `--surface-350`
- L3 floating context: `--surface-375` to `--surface-425`
- L4 modal/critical overlays: `--surface-450` to `--surface-500`

Use this default component mapping unless an existing pattern in the same feature says otherwise:

- App/page background shell: L0
- Main working regions, forms, data-grid containers: L1
- Cards and raised panels: L2
- Popovers, dropdowns, non-blocking floating UI: L3
- Modals, dialogs, blocking overlays, critical stacks: L4

Prefer semantic aliases when available (`--card`, `--popover`, `--modal`, `--sheet`, `--drawer`, `--tooltip`) because they already sit on the intended layer.

### Forbidden layer mistakes

- Do not place modal/dialog surfaces on L2 or L3.
- Do not use L4 values for normal cards or page sections.
- Do not jump multiple layers for decorative contrast only.
- Do not create one-off `oklch(...)` surfaces when a layer token exists.
- Do not replace layer separation with stronger borders/shadows alone.

### Layer progression rule

Within one view, depth should progress gradually:

- Base page starts at L0/L1
- Content elevation moves to L2
- Temporary floating UI uses L3
- Blocking/critical context uses L4

If a component appears visually out of place, fix layer selection first, then borders/shadows.

## Auth ecosystem profile (required for `apps/web/src/app/auth`)

When working on auth routes/components, use this fixed mapping:

- auth shell background: L0 to L1 transition
- auth panels (`EmailAuthPanel`, `ForgotPasswordPanel`, etc.): L2
- inline status/feedback: semantic overlays (`--success-soft`, `--destructive-soft`, `--overlay-interactive`)
- no L4 usage in standard auth pages unless a true blocking modal is introduced

Use shared surface primitives from `apps/web/src/app/auth/_components/surface-styles.ts`.

### Auth hard rules

- No raw color literals in auth TSX (`#hex`, `rgb()`, `hsl()`, `oklch()`).
- Card-based auth panels must apply `authCardSurfaceStyle`.
- If a card intentionally diverges, mark with `auth-surface-exempt` and rationale.
- Do not use chart/viz tokens in auth UI.

## Workflow

### Step 1: Classify the request

Choose one path before editing:

1. **Token consumption**: component/page should use existing tokens only.
2. **Token extension**: new semantic need requires adding token(s).
3. **Token correction**: existing token usage is inconsistent or inaccessible.

If path is unclear, prefer token consumption and only extend when there is no suitable existing token.

### Step 2: Choose the depth layer first (dark mode)

Before picking brand/status colors, assign the component to L0/L1/L2/L3/L4:

1. Identify component role: base, operating, elevated, floating, or blocking.
2. Select the nearest layer token (or semantic alias tied to that layer).
3. Verify neighboring components are at same or adjacent layers.
4. Only after depth is correct, apply lane semantics (`--primary*`, `--interactive*`, `--status-*`, etc.).

### Step 3: Check lane and semantics

Map visuals to the correct lane before choosing tokens:

- brand/truth: `--primary*`
- operator interaction: `--interactive*`
- governance/premium: `--premium*`
- global status: `--success*`, `--warning*`, `--info*`, `--destructive*`
- ERP lifecycle/domain states: `--status-*`, `--recon-*`, `--compliance-*`, etc.
- dataviz-only palette: `--chart-*`, `--viz-*` (never for workflow badges/buttons)

### Step 4: Edit with parity discipline

If introducing or changing tokens:

1. Update the right token file section(s) using existing naming patterns.
2. Keep dark/light parity unless intentionally one-sided for mode-specific behavior.
3. Preserve the surface/elevation architecture (L0-L4) and avoid ad-hoc layer values.
4. Keep aliases synced when needed (`--text-*`, semantic variants, soft/bg/foreground triplets).
5. Do not nest `@theme` inside `.dark`.

### Step 5: Apply tokens in UI correctly

When styling components:

- use semantic utilities mapped from tokens (`bg-background`, `text-foreground`, etc.)
- avoid raw hex/rgb/hsl literals in components
- avoid ad-hoc inline styles for colors/shadows when tokens exist
- use shadcn components from `@afenda/ui` rather than raw form primitives

### Step 6: Validate quality gates

Before finishing:

1. Search for hardcoded color regressions in edited files.
2. Confirm layer fit (L0-L4) for each edited surface.
3. Confirm no forbidden layer jumps (example: L1 straight to L4 for non-modal UI).
4. Confirm semantic fit (status vs chart vs lane usage).
5. Confirm focus/interactive states still use tokenized ring/overlay values.
6. Confirm disabled, hover, active, and selected states remain token-driven.
7. Run relevant checks when available (`pnpm typecheck`, `pnpm check:all` for larger changes).

For auth changes, run the dedicated check:

```bash
node tools/gates/auth-design-system.mjs
```

Recommended quick scans:

```bash
rg -n "#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})|rgba?\(|hsla?\(|oklch\(" apps/web/src/app/auth
rg -n "<Card" apps/web/src/app/auth/_components
```

## Completion checklist

- [ ] No hardcoded colors introduced.
- [ ] Every edited surface is mapped to the correct L0-L4 layer.
- [ ] No non-modal component uses L4 surfaces.
- [ ] Tokens chosen from correct semantic lane.
- [ ] Dark/light behavior remains coherent.
- [ ] Surface depth model preserved.
- [ ] Interaction and focus states remain accessible and tokenized.
- [ ] UI components follow shadcn + AFENDA conventions.

## Common mistakes to avoid

- using `--chart-*` tokens for status chips, banners, or workflow actions
- creating new `--status-*` tokens when an equivalent already exists
- assigning modal/dialog UI to L2/L3 instead of L4
- flattening depth by putting cards/popovers/modals on one shared surface value
- adding only dark token values without validating light mode counterpart
- introducing one-off shadows/radii instead of token values
- bypassing semantic tokens with direct color literals

## Related skills

- `@tailwind-v4-shadcn`
- `@shadcn-ui`
- `@accessibility`
- `@ui-design-system`

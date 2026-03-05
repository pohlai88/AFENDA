---
package: "@afenda/design-system"
root_dir: "packages/design-system"
type: library
layer: ui-foundation
composite: false
entrypoints: ["src/styles/index.css"]
public_api: null
exports_map:
  "./styles": "./src/styles/index.css"
  "./styles/*": "./src/styles/*"
dependency_kinds:
  allowed_runtime: []
  allowed_dev: ["tailwindcss"]
  allowed_peer: ["tailwindcss"]
enforced_structure:
  required_files: ["package.json"]
  required_directories: ["src/styles"]
boundary_rules:
  allowed_import_prefixes: []
  forbidden_imports: []
  allow_imports_by_path: {}
  forbid_cross_layer_imports: []
---

# @afenda/design-system — Architecture

## Purpose

Shared CSS design system for the Afenda ERP platform. Provides all design
tokens, density profiles, custom Tailwind v4 variants, theme engine mappings,
base styles, utilities, accessibility overrides and print safety in a
**7-Pillar modular architecture** inspired by ITCSS / Figma design system
best practices.

## 7-Pillar Architecture

```
src/styles/
  index.css               ← Entry point — orchestrates import order
  _variants.css           ← §1  Custom Tailwind v4 variants
  _tokens-light.css       ← §2  :root light-mode design tokens (OKLCH)
  _tokens-dark.css        ← §3  .dark mode token overrides
  _density.css            ← §4  Density profiles + high-contrast
  _theme.css              ← §5  @theme inline engine (Figma token interface)
  _base.css               ← §6  Base layer (focus, selection, scrollbars)
  _utilities.css          ← §7  Utility layer (tnum, flash, perf-grid, layout)
  _accessibility.css      ← §8+§9 Motion safety + forced colors
  _print.css              ← §10 Print safety for blotters/reports
```

## Import Order Contract

The `index.css` entry **must** import pillars in this exact order:

1. `@import 'tailwindcss'` — Tailwind v4 engine
2. **Variants** — Must come before any styles that reference them
3. **Tokens (light)** — `:root` variables at top level (v4 requirement)
4. **Tokens (dark)** — `.dark` overrides
5. **Density** — Overrides density tokens per profile
6. **Theme** — `@theme inline` maps all tokens to Tailwind utilities
7. **Base** — `@layer base` global styles
8. **Utilities** — `@layer utilities` domain-specific utilities
9. **Accessibility** — Motion safety + forced colors
10. **Print** — Print media query

## Key Rules

- **OKLCH color space** — perceptually uniform for 12h fatigue resistance
- `:root` tokens are NEVER inside `@layer base` (Tailwind v4 strips them)
- `.dark` overrides are DIRECT on `.dark` selector (never `@theme` nested)
- `@theme inline` MUST map every `:root` + `.dark` token (no dangling tokens)
- Density tokens cascade automatically — components just consume `var(--spacing-row-h)` etc.
- All custom utilities use `@layer utilities` (never bare scope)

## Consuming

```css
/* apps/web/src/app/globals.css */
@import '@afenda/design-system/styles';
```

Or selectively import individual pillars if building a custom entry.

## Token Completeness Audit

Run `tools/audit/` to verify all three sets (`:root`, `.dark`, `@theme inline`)
stay in sync. Every token must appear in all three. Machine-enforced, not vibes.

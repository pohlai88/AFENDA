# Brand Usage CI Gate

## Overview

The **brand-usage** gate enforces unified AFENDA brand component usage across the codebase. It prevents regression to fragmented inline brand rendering after the migration to the `AfendaLogo` component system.

## Location

`tools/gates/brand-usage.mjs`

## Purpose

The AFENDA brand identity has a locked design system:
- **AfendaMark** — Core SVG icon (● ● ○) with specific geometry
- **AfendaLogo** — Unified lock-up (icon + brand name + tagline) with proportional anchoring (1:2:0.5 ratio)

This gate ensures all brand rendering goes through these components rather than inline fragments.

## Rules

### 1. `DIRECT_AFENDAMARK` — Restricted AfendaMark imports

Only three files may import `AfendaMark` directly:
- `AfendaMark.tsx` — defines the component
- `AfendaLogo.tsx` — composes it into the unified lock-up
- `Hero.tsx` — approved standalone 64px animated usage

All other files must use `<AfendaLogo>` instead.

**Before (violation):**
```tsx
import { AfendaMark } from "./AfendaMark";
// ...
<AfendaMark size={20} />
<span>AFENDA</span>
```

**After (compliant):**
```tsx
import { AfendaLogo } from "./AfendaLogo";
// ...
<AfendaLogo size="sm" showTagline={false} />
```

### 2. `INLINE_BRAND_TEXT` — No inline brand name rendering

The brand name "AFENDA" must not be rendered inline in JSX elements like `<span>AFENDA</span>`. Use `<AfendaLogo>` which renders it with correct font weight, tracking (-0.03em), and proportional sizing.

**Allowed exceptions:**
- `aria-label="AFENDA"`, `alt="AFENDA"` — accessibility attributes
- `applicationName: "AFENDA"` — metadata/config objects
- `<em>AFENDA</em>` — prose/paragraph content
- Comments

### 3. `INLINE_TAGLINE` — No inline tagline rendering

The tagline "Where numbers become canon" has specific typography (mono, uppercase, 0.2em tracking). It must be rendered via `<AfendaLogo showTagline />`, not inline `<p>` or `<span>` elements.

**Allowed exceptions:**
- `AfendaLogo.tsx` — defines the tagline rendering
- `Hero.tsx` — uses a stylized gradient version
- Comments

### 4. `WRONG_SVG_GEOMETRY` — Correct icon geometry

Any inline SVG brand marks must use the locked geometry:
- **Dot 1** (cx=5, cy=12): `r=2`, `fill=currentColor`
- **Dot 2** (cx=12, cy=12): `r=2`, `fill=currentColor`
- **Ring** (cx=19, cy=12): `r=2.5`, `stroke-width=1.5`, `fill=none`

This catches copy-paste drift (e.g., ring with `r=1.5` instead of `r=2.5`).

## Exemptions

### Automatic exemptions
- `AfendaMark.tsx`, `AfendaLogo.tsx`, `Hero.tsx` — approved direct consumers
- Test files (`__vitest_test__/`, `*.test.*`, `e2e/`)
- Layout/metadata files (`layout.tsx`, `global-error.tsx`)
- Config and type definition files
- Non-TSX files (brand rendering is JSX only)

### Manual exemption marker

Add a comment within 10 lines above the violation:

```tsx
{/* brand-exempt: standalone icon for [reason] */}
<AfendaMark size={20} />
```

Supported formats:
- `/* brand-exempt */`
- `// brand-exempt`
- `<!-- brand-exempt -->`

## Usage

```bash
# Run standalone
node tools/gates/brand-usage.mjs

# Run as part of all gates
pnpm check:all
```

### Output (pass)
```
✅ BRAND USAGE passed — 0 violations
   42 .tsx files scanned in 0.03s
```

### Output (fail)
```
❌ BRAND USAGE FAILED — 2 violations

── DIRECT_AFENDAMARK (1) ──────────────────────────────────
   WHY:  AfendaMark is the raw SVG icon. All brand rendering should go through AfendaLogo.
   DOCS: docs/ci-gates/brand-usage.md

  apps/web/src/app/(public)/(marketing)/SomeComponent.tsx:5
    error:  Direct AfendaMark import — use <AfendaLogo> instead
    fix:    Replace AfendaMark with AfendaLogo

── INLINE_BRAND_TEXT (1) ──────────────────────────────────
  ...
```

## Integration

Registered in `tools/run-gates.mjs` under Phase 1: Static Correctness, after `shadcn-enforcement` gate.

## Brand Component Hierarchy

```
AfendaMark        ← Core SVG icon (● ● ○). DO NOT use directly.
  └── AfendaLogo  ← Unified lock-up. USE THIS everywhere.
        ├── size="sm"   — Nav, footer, loading screens
        ├── size="md"   — Auth headers, default
        └── size="lg"   — Marketing hero areas
```

## Exit Codes

- `0` — No violations found
- `1` — Violations detected (CI fails)

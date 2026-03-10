# Token Compliance Auto-Fix Guide

**Last Updated:** March 10, 2026  
**Tool:** `tools/gates/token-compliance-autofix.mjs`

## Overview

Automated tool for fixing the 177 token-compliance violations by mapping hardcoded Tailwind palette colors to AFENDA design system tokens.

## Quick Start

```bash
# 1. Preview what would be fixed (recommended first step)
node tools/gates/token-compliance-autofix.mjs --dry-run

# 2. Apply safe fixes automatically
node tools/gates/token-compliance-autofix.mjs

# 3. Handle contextual cases interactively
node tools/gates/token-compliance-autofix.mjs --interactive

# 4. Generate manual review queue for complex cases
node tools/gates/token-compliance-autofix.mjs --generate-review

# 5. Verify compliance
node tools/gates/token-compliance.mjs
pnpm typecheck
```

## Fix Tiers

### Tier 1: Safe Auto-Fix (60-70% coverage)

**Automatically applied** without user intervention:

#### Dark Prefix Removal (89 violations)
Strips all `dark:` variant prefixes — design tokens auto-switch via `:root` / `.dark` selectors.

```tsx
// BEFORE
className="bg-card dark:bg-gray-900 text-foreground dark:text-white"

// AFTER (dark: removed)
className="bg-card text-foreground"
```

#### Status Color Mappings (High Confidence)

| Hardcoded | Semantic Token | Use Case |
|-----------|---------------|----------|
| `text-green-600`, `bg-green-600` | `text-success`, `bg-success` | Success states, operational indicators |
| `text-red-600`, `bg-red-600` | `text-destructive`, `bg-destructive` | Errors, destructive actions |
| `text-yellow-600`, `text-amber-600` | `text-warning` | Warnings, caution states |
| `text-gray-900`, `text-black` | `text-foreground` | Primary text |
| `text-gray-600` | `text-foreground-secondary` | Secondary text |
| `bg-gray-50`, `bg-gray-100` | `bg-surface-50`, `bg-surface-100` | Surface layers |
| `border-gray-200`, `border-gray-300` | `border-border`, `border-border-strong` | Standard borders |

#### Inline Hex Conversion (7 violations)

```tsx
// BEFORE
style={{ color: "#000000", backgroundColor: "#ffffff" }}

// AFTER
style={{ color: "var(--foreground)", backgroundColor: "var(--background)" }}
```

### Tier 2: Contextual Mappings (20-30% coverage)

**Requires `--interactive` flag** for semantic choices:

#### Ambiguous Blue Colors

`text-blue-600` / `bg-blue-600` could be:
- **`text-info` / `bg-info`** → Informational content, status indicators, info banners
- **`text-primary` / `bg-primary`** → Brand emphasis, primary CTAs, brand surfaces
- **`text-accent` / `bg-accent`** → Subtle highlights, secondary emphasis

**Decision Guide:**
- Is it showing system status/information? → `info`
- Is it a primary brand element/CTA? → `primary`
- Is it a subtle highlight/decoration? → `accent`

#### Ambiguous Purple/Indigo Colors

`text-purple-600` / `text-indigo-600` could be:
- **`text-primary`** → Brand color (if purple/indigo is your brand)
- **`text-accent`** → Accent highlights, special states
- **`text-info`** → Informational indicators

### Tier 3: Manual Review (5-10% coverage)

**Use `--generate-review` flag** to create a markdown checklist for complex cases:

```bash
node tools/gates/token-compliance-autofix.mjs --generate-review
# Creates: token-compliance-manual-review.md
```

Review file format:
```markdown
## 1. apps/web/src/app/(public)/status/page.tsx:238

```tsx
//   236   <div className="text-center">
//   237     <Shield
// ► 238       className="h-12 w-12 mx-auto mb-3 text-green-600"
//   239       aria-hidden="true"
//   240     />
```

**Current:** `text-green-600`

**Options:**
- `text-success` — success/operational states, status indicators
- `text-primary` — brand color, primary emphasis

**Decision:** `text-_______`
```

## Semantic Mapping Decision Tree

### When to use each token:

#### **Status Semantics**
- ✅ **`success`** — Operational, completed, positive states (green)
- ⚠️ **`warning`** — Caution, needs attention (yellow/amber)
- ℹ️ **`info`** — Informational, neutral status (blue)
- ❌ **`destructive`** — Errors, delete actions, critical (red)

#### **Brand Semantics**
- 🎨 **`primary`** — Primary brand color, main CTAs, emphasis
- 🔹 **`accent`** — Secondary brand color, accents, highlights
- 📄 **`foreground-secondary`** — De-emphasized text content
- 🔇 **`muted-foreground`** — Very subtle text, placeholders

#### **Surface Semantics**
- 🏢 **`background`** — Page background (white in light, dark in dark)
- 📄 **`card`** — Card surfaces, elevated content
- 🪟 **`popover`** — Popover/dropdown backgrounds
- 📊 **`surface-{50-400}`** — Tiered surface elevation
- 🔲 **`input`** — Input field backgrounds

#### **Border Semantics**
- ➖ **`border`** — Standard borders (default)
- 🔹 **`border-subtle`** — Very light borders
- ➖ **`border-strong`** — Emphasized borders

## Common Patterns

### Pattern 1: Status Indicators

```tsx
// BEFORE
<CheckCircle className="text-green-600" />
<AlertCircle className="text-yellow-600" />
<XCircle className="text-red-600" />
<Info className="text-blue-600" />

// AFTER
<CheckCircle className="text-success" />
<AlertCircle className="text-warning" />
<XCircle className="text-destructive" />
<Info className="text-info" />
```

### Pattern 2: Info Callouts

```tsx
// BEFORE
<div className="border-l-4 border-blue-600 bg-blue-50 p-4 dark:bg-blue-950">
  <Info className="text-blue-600" />
  <h3 className="text-blue-900 dark:text-blue-100">Notice</h3>
  <p className="text-blue-800 dark:text-blue-200">Content...</p>
</div>

// AFTER
<div className="border-l-4 border-info bg-accent p-4">
  <Info className="text-info" />
  <h3 className="font-semibold">Notice</h3>
  <p className="text-foreground-secondary">Content...</p>
</div>
```

### Pattern 3: Brand Elements

```tsx
// BEFORE (marketing page)
<h1 className="text-4xl font-bold text-indigo-600">AFENDA</h1>
<Button className="bg-purple-600 text-white">Get Started</Button>

// AFTER
<h1 className="text-4xl font-bold text-primary">AFENDA</h1>
<Button variant="default">Get Started</Button>
// Note: Button "default" variant uses primary automatically
```

## Usage Examples

### Example 1: Dry Run First

```bash
$ node tools/gates/token-compliance-autofix.mjs --dry-run

╔════════════════════════════════════════════════════════════════════════════╗
║     TOKEN COMPLIANCE AUTO-FIX                                              ║
╚════════════════════════════════════════════════════════════════════════════╝

Mode: DRY RUN
Interactive: NO
Generate Review: NO

Scanning 148 component files...

📄 Processing: apps/web/src/app/(public)/status/page.tsx
  ✓ Removed 4 dark: prefix(es)
  ✓ text-green-600 → text-success (2x)
  ✓ text-blue-600 → text-info (1x)
  ℹ Found 3 contextual case(s) - use --interactive or --generate-review

═══════════════════════════════════════════════════════════════════════════
SUMMARY
═══════════════════════════════════════════════════════════════════════════
Files scanned:       148
Files modified:      12
Manual review cases: 15

⚠ DRY RUN - No files were modified
Remove --dry-run to apply fixes
```

### Example 2: Apply Safe Fixes

```bash
$ node tools/gates/token-compliance-autofix.mjs

# Automatically fixes ~60-70% of violations
# Files are modified in place
```

### Example 3: Interactive Mode

```bash
$ node tools/gates/token-compliance-autofix.mjs --interactive

═══════════════════════════════════════════════════════════════════════════
📍 apps/web/src/app/(public)/status/page.tsx:301
───────────────────────────────────────────────────────────────────────────
  299 │               <div>
  300 │                 <Activity className="h-6 w-6 mb-2" />
► 301 │                 <p className="text-3xl font-bold text-blue-600">42ms</p>
  302 │                 <p className="text-sm text-muted-foreground">Avg Response</p>
  303 │               </div>
───────────────────────────────────────────────────────────────────────────
Current: text-blue-600

Choose replacement:
  [1] text-info                  - informational content, status indicators
  [2] text-primary               - brand emphasis, primary CTAs
  [3] text-accent                - subtle highlights, secondary emphasis
  [s] Skip this occurrence
  [a] Skip all text-blue-600 (add to manual review)

Your choice: 1
✓ Replaced with text-info
```

### Example 4: Generate Manual Review

```bash
$ node tools/gates/token-compliance-autofix.mjs --generate-review

# Creates: token-compliance-manual-review.md
# Review each case and apply manually
```

## Verification Workflow

```bash
# 1. Run auto-fix with dry run
node tools/gates/token-compliance-autofix.mjs --dry-run

# 2. Apply safe fixes
node tools/gates/token-compliance-autofix.mjs

# 3. Check remaining violations
node tools/gates/token-compliance.mjs

# 4. Handle contextual cases
node tools/gates/token-compliance-autofix.mjs --interactive

# 5. Generate review for remaining
node tools/gates/token-compliance-autofix.mjs --generate-review

# 6. Verify all gates pass
pnpm check:all

# 7. Type check
pnpm typecheck

# 8. Visual testing
pnpm dev
# Check pages in light + dark mode
```

## ESLint Auto-Fix Enhancement

After running the tool, remaining `dark:` prefixes can be caught by ESLint:

```bash
# ESLint will flag remaining violations
pnpm lint

# Future: ESLint auto-fix for dark: prefixes
# (fixer implementation planned)
```

## Common Issues

### Issue 1: "Too many contextual cases"

**Solution:** Use `--interactive` mode or batch-generate review queue:

```bash
node tools/gates/token-compliance-autofix.mjs --generate-review
# Review the markdown file and apply manually
```

### Issue 2: "Broke dark mode"

**Cause:** Removed `dark:` prefix but light-mode token doesn't auto-switch.

**Solution:** Check if you're using a design system token:

```tsx
// ❌ Won't work - hardcoded light color
className="bg-gray-50"  // No dark mode equivalent

// ✅ Works - DS token auto-switches
className="bg-surface-50"  // Defined in _tokens-light.css + _tokens-dark.css
```

### Issue 3: "Wrong semantic meaning"

**Cause:** Auto-mapper guessed wrong context.

**Solution:** Review and override:

```tsx
// Auto-mapped to text-info (informational)
className="text-info"

// But it's actually a brand CTA → change to primary
className="text-primary"
```

## Design System Token Reference

See full token palette:
- Light mode: `packages/ui/src/styles/_tokens-light.css`
- Dark mode: `packages/ui/src/styles/_tokens-dark.css`
- Theme mapping: `packages/ui/src/styles/_theme.css`

Available semantic tokens:
```css
/* Status */
--success, --warning, --info, --destructive

/* Brand */
--primary, --accent, --secondary, --muted

/* Surface */
--background, --foreground, --card, --popover
--surface-50 through --surface-400

/* Borders */
--border, --border-subtle, --border-strong

/* Interaction */
--ring, --selection, --overlay-hover, --overlay-active
```

## Related Documentation

- Gate documentation: `docs/ci-gates/token-compliance.md`
- Design system: `packages/ui/ARCHITECTURE_afenda-design-system.md`
- AGENTS.md: Token compliance section
- ESLint rule: `tools/eslint/no-hardcoded-colors.mjs`

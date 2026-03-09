# Marketing Page Architecture — CSS Isolation Guide

**Last Updated:** March 8, 2026  
**Status:** ✅ Active

---

## Overview

The AFENDA marketing pages (`/` and `(public)/(marketing)/*`) use a **separate dark-terminal aesthetic** independent from the main ERP design system. This document explains how CSS isolation is maintained to prevent conflicts.

---

## Architecture

### File Structure

```
apps/web/src/app/
├── layout.tsx                          # Root layout (applies to all pages)
├── globals.css                         # Global styles + Tailwind v4
├── page.tsx                            # Marketing homepage (/)
└── (public)/(marketing)/
    ├── layout.tsx                      # ✅ Marketing layout (ISOLATION LAYER)
    ├── _landing-ui.tsx                 # Custom marketing components (shadcn-exempt)
    ├── Hero.tsx                        # Marketing sections
    ├── Features.tsx
    ├── LandingNav.tsx
    └── ...other marketing components
```

### Isolation Strategy

#### 1. **Dedicated Layout** ([marketing]/layout.tsx)

The marketing layout wraps all marketing pages with:
- `data-marketing-theme` attribute for CSS scoping
- Dark background (`bg-[#0B0D12]`)
- CSS variable overrides to replace design system tokens
- Independent selection colors

```tsx
// apps/web/src/app/(public)/(marketing)/layout.tsx
<div
  data-marketing-theme
  className="min-h-screen bg-[#0B0D12] text-slate-50"
  style={{
    "--background": "#0B0D12",
    "--foreground": "#f8fafc",
    --selection": "rgba(20, 184, 166, 0.3)",
    "--selection-foreground": "#99f6e4",
  }}
>
  {children}
</div>
```

#### 2. **Scoped CSS Reset** (globals.css)

Marketing-specific styles override design system defaults:

```css
/* apps/web/src/app/globals.css */

[data-marketing-theme] {
  font-feature-settings: normal;  /* Re-enable ligatures for marketing copy */
  letter-spacing: normal;
}

[data-marketing-theme] * {
  border-color: initial;          /* Reset design system borders */
  scrollbar-width: auto;
  scrollbar-color: initial;
}
```

#### 3. **Custom Component Library** (_landing-ui.tsx)

Marketing pages use **separate components** from the main app:

| Marketing Component | ERP Component | Why Separate? |
|-------------------|--------------|---------------|
| `<Button>` from `_landing-ui` | `<Button>` from `@afenda/ui` | Different color scheme (emerald glow vs. design tokens) |
| `<Card>` from `_landing-ui` | `<Card>` from `@afenda/ui` | Dark terminal aesthetic vs. light/dark theme |
| `<Badge>` from `_landing-ui` | `<Badge>` from `@afenda/ui` | Marketing branding vs. functional status |

All marketing components are marked with `/* shadcn-exempt */` to bypass CI enforcement.

---

## Design System vs. Marketing Styles

### What's Different?

| Aspect | ERP Design System | Marketing Pages |
|--------|------------------|-----------------|
| **Color Palette** | OKLCH tokens (light + dark modes) | Fixed dark terminal (#0B0D12, emerald accents) |
| **Typography** | Tabular nums, no ligatures | Natural text, ligatures enabled |
| **Component Library** | shadcn/ui from `@afenda/ui` | Custom `_landing-ui.tsx` |
| **Theme System** | CSS variables + `.dark` class | Inline styles + data attribute |
| **Focus Model** | Inset outline (WCAG 2.4.7) | Browser default |
| **Scrollbars** | Custom terminal-style | Browser native |

### What's Shared?

- Tailwind CSS v4 utility generation
- Font families (`--font-sans`, `--font-mono` from root layout)
- Next.js App Router conventions
- Build pipeline (Turbopack, TypeScript, PostCSS)

---

## Rules for Marketing Page Development

### ✅ **DO**

1. **Import components from `_landing-ui.tsx`**
   ```tsx
   import { Button, Card, Badge } from "./_landing-ui";
   ```

2. **Use marketing-specific colors** (Bloomberg/Linear dark theme)
   ```tsx
   <div className="bg-[#0B0D12] text-emerald-300">
   ```

3. **Mark raw HTML with `shadcn-exempt`**
   ```tsx
   {/* shadcn-exempt: Marketing page custom layout */}
   <button className="custom-styles">Click me</button>
   ```

4. **Test in isolation** (visit `/` directly, not via app navigation)

5. **Use Framer Motion** for animations (already imported in Hero.tsx)

### ❌ **DON'T**

1. **Import from `@afenda/ui`** (except types)
   ```tsx
   ❌ import { Button } from "@afenda/ui";
   ✅ import { Button } from "./_landing-ui";
   ```

2. **Reference design system CSS variables** (they're overridden)
   ```tsx
   ❌ className="bg-background text-foreground"
   ✅ className="bg-[#0B0D12] text-slate-50"
   ```

3. **Add styles to root `layout.tsx`** (affects entire app)

4. **Use `.dark` class** (marketing is always dark)

5. **Modify `packages/ui/` for marketing needs** (keep systems separate)

---

## Common Conflicts & Solutions

### Issue 1: Font Ligatures Disabled

**Problem:** Marketing copy looks robotic without ligatures (fi, fl).

**Solution:** Already fixed via `[data-marketing-theme] { font-feature-settings: normal; }`

### Issue 2: Selection Color from Design System

**Problem:** Selection uses design system token instead of teal glow.

**Solution:** CSS variable override in marketing layout:
```tsx
style={{ "--selection": "rgba(20, 184, 166, 0.3)" }}
```

### Issue 3: Scrollbar Styles Conflict

**Problem:** Marketing pages inherit terminal-style 10px scrollbars.

**Solution:** Reset via `[data-marketing-theme] * { scrollbar-width: auto; }`

### Issue 4: Button Styles Overridden

**Problem:** Marketing buttons lose emerald glow after CSS changes.

**Solution:** Use `_landing-ui.tsx` Button component, not `@afenda/ui`.

---

## Testing Checklist

Before deploying marketing page changes:

- [ ] Direct navigation to `/` shows correct dark theme
- [ ] Buttons have emerald glow (not design system colors)
- [ ] Text has natural ligatures (fi, fl combine)
- [ ] Selection color is teal (`#14b8a6`), not ERP blue
- [ ] Scrollbars use browser native style (not custom terminal)
- [ ] No layout shift when navigating FROM `/` TO `/auth` (different layouts)
- [ ] `pnpm check:all` passes (shadcn-exempt markers work)
- [ ] Build completes: `pnpm --filter @afenda/web build`

---

## Future Considerations

### If Adding More Marketing Pages

Create them under `(public)/(marketing)/`:

```
(public)/(marketing)/
├── layout.tsx          # ← Shared marketing layout
├── page.tsx            # ← Homepage
├── about/
│   └── page.tsx        # ← /about
├── pricing/
│   └── page.tsx        # ← /pricing
└── _landing-ui.tsx     # ← Shared marketing components
```

All will inherit the `data-marketing-theme` isolation.

### If Migrating to Design System

When the ERP design system supports a dark terminal theme:

1. Create a `variant="marketing"` prop for `@afenda/ui` components
2. Move marketing colors to design system token files
3. Remove `_landing-ui.tsx` and the `[data-marketing-theme]` scope
4. Update CI gates to remove `shadcn-exempt` markers

---

## Related Files

| File | Purpose |
|------|---------|
| `apps/web/src/app/globals.css` | Global styles + marketing isolation rules |
| `apps/web/src/app/(public)/(marketing)/layout.tsx` | Marketing layout wrapper |
| `apps/web/src/app/(public)/(marketing)/_landing-ui.tsx` | Marketing component library |
| `packages/ui/src/styles/index.css` | ERP design system entry point |
| `docs/ci-gates/shadcn-enforcement.md` | CI gate exemption rules |

---

## Support

For questions about marketing page styles:

1. Check this document first
2. Review `_landing-ui.tsx` for component patterns
3. Test in browser DevTools with `[data-marketing-theme]` selector
4. Consult `AGENTS.md` section 6 (UI Components)

**Remember:** Marketing pages are **intentionally separate** from the ERP design system. Don't force convergence — embrace the separation.

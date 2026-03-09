# Hero.tsx CSS Consistency Audit

**Date:** March 8, 2026  
**File:** `apps/web/src/app/(public)/(marketing)/Hero.tsx`

## Critical Issues

### 1. **Mixed Import Sources** ❌
**Current:**
```tsx
import { Button, Badge } from "@afenda/ui";
```

**Problem:** All other marketing components use `_landing-ui.tsx`:
```tsx
// Features.tsx, LedgerArchitecture.tsx
import { Badge } from "./_landing-ui";
```

**Impact:** Hero.tsx imports ERP design system components instead of marketing's standalone dark-theme system.

---

### 2. **Inconsistent Color System** ❌

**Hero.tsx mixes 3 color systems:**

#### A. Design Tokens (from @afenda/ui)
```tsx
text-foreground          // Good
text-primary             // Good
text-muted-foreground    // Good
border-border            // Good
bg-card/50              // Good
```

#### B. Hardcoded Tailwind Colors (inconsistent)
```tsx
from-slate-700 via-cyan-500/50 to-teal-400  // 3D gradient
bg-teal-300                                  // Data packets
bg-slate-900/80                              // Data Lake
border-slate-700/50                          // Borders
text-slate-300                               // Labels
text-cyan-400                                // Forensic Filter
border-teal-400/50                           // Truth Engine
```

#### C. Hex Colors (raw values)
```tsx
bg-[#050505]/95          // Label backgrounds
bg-[#061B24]/90          // Forensic Filter layer
bg-[#02211C]/90          // Truth Engine layer
fill="#334155"           // SVG nodes
```

**Other Marketing Components Pattern:**
```tsx
// Features.tsx, LedgerArchitecture.tsx - Consistent hardcoded colors
border-teal-400/60
bg-teal-500/10
text-teal-300
border-slate-700/50
bg-slate-900/60
```

---

### 3. **Inline Styles vs Tailwind** ⚠️

**Hero.tsx uses inline `style={{ }}` extensively:**

```tsx
// ❌ Current
style={{ boxShadow: 'inset 0 0 60px rgba(0,0,0,0.8)' }}
style={{ boxShadow: 'inset 0 0 40px rgba(6,182,212,0.1)' }}
style={{ boxShadow: '0 0 40px rgba(45,212,191,0.15), inset 0 0 30px rgba(45,212,191,0.1)' }}
style={{ transform: 'rotateX(-90deg) translateZ(0px)' }}
style={{ transformOrigin: "160px 160px" }}
```

**Other components use Tailwind or CSS classes:**
```tsx
// ✅ Features.tsx, LedgerArchitecture.tsx
className="shadow-[0_0_30px_rgba(20,184,166,0.15)]"
className="[transform:translateZ(80px)]"
```

---

### 4. **Background Color Conflicts** ❌

**Hero.tsx section background:**
```tsx
bg-[#050505]  // Hex color
```

**globals.css expects:**
```css
/* Design system uses semantic tokens */
background-color: var(--background);
```

**Other marketing components:**
```tsx
// Consistent with Hero but still hardcoded
bg-[#050505]/95  // Features.tsx labels
bg-slate-900/60  // LedgerArchitecture.tsx blocks
```

---

### 5. **Border Token Inconsistency** ⚠️

**Hero.tsx mixes:**
```tsx
border-primary/30        // ✅ Design token
border-border            // ✅ Design token
border-slate-700         // ❌ Hardcoded
border-teal-500/40       // ❌ Hardcoded
border-cyan-500/30       // ❌ Hardcoded
border-slate-800         // ❌ Hardcoded
```

**Should be:**
```tsx
border-border            // Primary borders
border-border/50         // Subtle borders
border-primary/30        // Accent borders
```

---

### 6. **Text Color Token Violations** ❌

**Hero.tsx mixes:**
```tsx
// ✅ Semantic tokens
text-foreground
text-primary
text-muted-foreground

// ❌ Hardcoded colors
text-slate-300
text-slate-500
text-teal-300
text-teal-400
text-cyan-400
```

**Marketing components pattern:**
```tsx
// Features.tsx - Consistently hardcoded
text-teal-300
text-teal-400
text-slate-600
text-emerald-400
```

---

### 7. **Missing Design System Utilities** ℹ️

**globals.css provides custom animation classes:**
```css
.afenda-artwork-top { animation: afenda-float-top 8s ease-in-out infinite; }
.afenda-orbit-node { animation: afenda-node-float 9.8s ease-in-out infinite; }
```

**Hero.tsx doesn't use them** - uses Framer Motion inline animations instead.

---

## Recommendations

### Option A: **Align with Marketing Components** (Recommended)

**Pattern:** Match Features.tsx and LedgerArchitecture.tsx

1. Import from `_landing-ui.tsx`:
   ```tsx
   import { Button, Badge } from "./_landing-ui";
   ```

2. Use hardcoded colors consistently:
   ```tsx
   // Core palette for marketing 3D visualizations
   teal-*    // Primary accent (Truth Engine, seals)
   slate-*   // Structure (borders, backgrounds)
   cyan-*    // Secondary accent (scanning, data flow)
   indigo-*  // Tertiary accent (optional)
   ```

3. Convert inline styles to Tailwind:
   ```tsx
   // Before
   style={{ boxShadow: 'inset 0 0 60px rgba(0,0,0,0.8)' }}
   
   // After
   className="shadow-[inset_0_0_60px_rgba(0,0,0,0.8)]"
   ```

4. Keep hex colors in specific 3D layer backgrounds (they're part of the visual identity):
   ```tsx
   bg-[#050505]  // Deep black for labels
   bg-[#061B24]  // Cyan-tinted layer
   bg-[#02211C]  // Teal-tinted layer
   ```

### Option B: **Full Design Token Migration** (Not Recommended for Marketing)

Convert all colors to semantic tokens - but this would **break visual consistency** with other marketing 3D diagrams.

---

## Summary

**Root Cause:** Hero.tsx was partially refactored to use `@afenda/ui` design tokens, but the marketing directory intentionally uses a **standalone dark-theme system** (`_landing-ui.tsx`) with hardcoded colors for visual consistency across 3D diagrams.

**Solution:** Revert Hero.tsx to match the marketing pattern:
- Import from `_landing-ui.tsx`
- Use hardcoded teal/slate/cyan colors
- Convert inline styles to Tailwind shadow utilities
- Maintain hex colors for 3D layer backgrounds

This maintains consistency with Features.tsx, LedgerArchitecture.tsx, and the marketing visual identity.

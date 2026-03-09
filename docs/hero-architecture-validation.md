# Hero Architecture Validation & Overflow Fix

**Date:** March 9, 2026  
**Component:** `apps/web/src/app/(public)/(marketing)/Hero.tsx`  
**Issue:** Truth engine layer overflow at top of diagram

---

## Architecture Overview

The Hero component displays a 3-layer architecture diagram representing AFENDA's system:

```
┌─────────────────────────────────────┐
│  03 // TRUTH_ENGINE                 │  ← Append-only financial memory
│  (Hexagons + Core + Orbitals)       │
├─────────────────────────────────────┤
│  02 // CONTROL_LAYER                │  ← Policy enforcement & lineage
│  (Scanning radar + Policy/Lineage)  │
├─────────────────────────────────────┤
│  01 // SOURCE_SYSTEMS               │  ← Raw data ingest
│  (AP, AR, BANK, PAY, OPS, etc.)     │
└─────────────────────────────────────┘
```

---

## Problem Identified

### Visual Overflow
The truth engine layer was positioned too close to the top of the SVG viewBox, causing visual clipping when combined with container padding.

### Original Layout (SVG viewBox: 0 0 800 560)

| Layer | Y Position | Height | Gap from Previous |
|-------|-----------|--------|-------------------|
| **Top margin** | 0 | - | - |
| Truth Engine (03) | y=58 | 122px | 58px from top ⚠️ |
| *gap* | - | - | 45px |
| Control Layer (02) | y=225 | 118px | - |
| *gap* | - | - | 45px |
| Source Systems (01) | y=388 | 118px | - |
| **Bottom margin** | - | - | 54px |

**Issues:**
- Truth engine had only 58px top margin (10.4% of 560px viewBox)
- Container padding (`lg:pt-14` = 56px) was insufficient
- Asymmetric spacing created visual imbalance

---

## Solution Implemented

### 1. Rebalanced Layer Positions

| Layer | Old Y | New Y | Change |
|-------|-------|-------|--------|
| Truth Engine (03) | y=58 | **y=74** | +16px ✓ |
| Control Layer (02) | y=225 | **y=238** | +13px ✓ |
| Source Systems (01) | y=388 | **y=398** | +10px ✓ |

### 2. Updated Center Points

```typescript
// Before
const CORE_Y = 140;      // Truth engine core
const SCAN_CY = 285;     // Control layer scan circle

// After
const CORE_Y = 156;      // +16px
const SCAN_CY = 298;     // +13px
```

### 3. Increased Container Padding

```tsx
// Before
className="... sm:pt-18 lg:pt-14 lg:pb-8 ..."

// After
className="... sm:pt-20 lg:pt-20 lg:pb-10 ..."
```

### New Balanced Layout

| Layer | Y Position | Height | Gap |
|-------|-----------|--------|-----|
| **Top margin** | 0 | - | **74px** ✓ |
| Truth Engine (03) | y=74 | 122px | - |
| *gap* | - | - | **42px** |
| Control Layer (02) | y=238 | 118px | - |
| *gap* | - | - | **42px** |
| Source Systems (01) | y=398 | 118px | - |
| **Bottom margin** | - | - | **44px** |

**Benefits:**
- Increased top margin: 58px → 74px (+27%)
- Uniform layer gaps: 42-44px (was 45-45-54px)
- Container padding increased: 56px → 80px (+43%)
- No visual clipping on any screen size

---

## Technical Details

### Files Modified
- `apps/web/src/app/(public)/(marketing)/Hero.tsx`

### Changes Summary
1. ✅ CORE_Y: 140 → 156 (+16px)
2. ✅ SCAN_CY: 285 → 298 (+13px)
3. ✅ Truth Engine rect: y=58 → y=74
4. ✅ Truth Engine label: y=82 → y=98
5. ✅ Control Layer rect: y=225 → y=238
6. ✅ Control Layer label: y=248 → y=261
7. ✅ Control Layer clipPath: y=225 → y=238
8. ✅ Source Systems rect: y=388 → y=398
9. ✅ Source Systems label: y=412 → y=422
10. ✅ Source Systems nodes: y=448 → y=458
11. ✅ Connector lines updated for new positions
12. ✅ Container padding: `lg:pt-14 lg:pb-8` → `lg:pt-20 lg:pb-10`
13. ✅ Container padding: `sm:pt-18` → `sm:pt-20`

### Validation
- ✅ TypeScript typecheck: Passed
- ✅ Layer spacing: Balanced
- ✅ No overflow: Confirmed
- ✅ Interactive hover states: Preserved
- ✅ Responsive layout: Mobile/tablet/desktop all functional

---

## Architecture Principles Validated

✅ **3-Layer Separation:** Source → Control → Truth flow is clear  
✅ **Visual Hierarchy:** Truth engine prominently positioned at top  
✅ **Accessibility:** ARIA labels and role="img" maintained  
✅ **Responsiveness:** Works across mobile (aspect-[5/4]) to desktop (aspect-[16/10])  
✅ **Reduced Motion:** Respects `prefers-reduced-motion` user preference  
✅ **Interactive Cards:** Layer console cards activate on hover/click  

---

## Recommendation

**Status:** ✅ **RESOLVED**

The 3-layer architecture is now properly balanced with:
- Adequate top margin preventing overflow
- Uniform spacing between layers
- Sufficient container padding for all screen sizes
- Maintained visual hierarchy and interactivity

No further adjustments needed unless design requirements change.

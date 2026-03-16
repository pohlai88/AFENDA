# Marketing Animation Guide

## Overview

AFENDA marketing pages now include smooth, performant animations powered by Framer Motion (motion/react). This guide explains how to use the animated components.

## Quick Start

All animated components are available in `_components/marketing-info-animated.tsx`:

```tsx
import {
  AnimatedCard,
  AnimatedBadge,
  AnimatedL1,
  AnimatedGrid,
  AnimatedGridItem,
  AnimatedFadeIn,
  AnimatedSection,
} from "./_components/marketing-info-animated";
```

## Page Transitions

**Automatic** — All marketing pages get smooth fade-in transitions via `template.tsx`:

- Fade in from opacity 0 → 1
- Slide up 20px → 0
- 0.4s duration with easeOut
- No code changes needed

## Components

### AnimatedCard

Hover effect: scale 1.0 → 1.02 with spring physics.

```tsx
// Before
<MarketingInfoCard tone="raised">
  <MarketingInfoCardHeader>
    <MarketingInfoCardTitle>Title</MarketingInfoCardTitle>
  </MarketingInfoCardHeader>
  <MarketingInfoCardBody>
    <p className="mi-card-copy">Content</p>
  </MarketingInfoCardBody>
</MarketingInfoCard>

// After
<AnimatedCard tone="raised">
  <MarketingInfoCardHeader>
    <MarketingInfoCardTitle>Title</MarketingInfoCardTitle>
  </MarketingInfoCardHeader>
  <MarketingInfoCardBody>
    <p className="mi-card-copy">Content</p>
  </MarketingInfoCardBody>
</AnimatedCard>
```

### AnimatedBadge

Micro-interaction: scale 1.0 → 1.05 on hover, 0.98 on tap.

```tsx
// Before
<MarketingInfoBadge tone="primary">NexusCanon governance</MarketingInfoBadge>

// After
<AnimatedBadge tone="primary">NexusCanon governance</AnimatedBadge>
```

**Available tones:** `primary` | `premium` (no `interactive` tone exists)

### AnimatedL1

Fade-in when scrolled into view. Wraps L1 surfaces.

```tsx
// Before
<MarketingInfoL1>
  {/* content */}
</MarketingInfoL1>

// After
<AnimatedL1>
  {/* content */}
</AnimatedL1>
```

### AnimatedGrid + AnimatedGridItem

Staggered children animation (0.08s delay between items).

```tsx
// Before
<MarketingInfoL1>
  <MarketingInfoGrid columns={2}>
    {items.map((item) => (
      <MarketingInfoCard asChild key={item.id}>
        <li>{/* content */}</li>
      </MarketingInfoCard>
    ))}
  </MarketingInfoGrid>
</MarketingInfoL1>

// After
<AnimatedL1>
  <AnimatedGrid columns={2}>
    {items.map((item) => (
      <AnimatedGridItem key={item.id}>
        <AnimatedCard>
          {/* content */}
        </AnimatedCard>
      </AnimatedGridItem>
    ))}
  </AnimatedGrid>
</AnimatedL1>
```

**Important:** Remove `asChild` prop when using animated components. AnimatedCard/AnimatedGrid handle the wrapper internally.

### AnimatedSection

Fade-in when scrolled into view. Use for heavy sections.

```tsx
<AnimatedSection>
  <MarketingInfoSectionHeader>
    <MarketingInfoSectionTitle>Title</MarketingInfoSectionTitle>
  </MarketingInfoSectionHeader>
  {/* section content */}
</AnimatedSection>
```

### AnimatedFadeIn

Generic fade-in wrapper for any content.

```tsx
<AnimatedFadeIn>
  <div className="mi-prose">
    <p>This content fades in when scrolled into view.</p>
  </div>
</AnimatedFadeIn>
```

## Animation Physics

All animations use **spring physics** for natural motion:

- **Cards:** `stiffness: 400, damping: 25` — Responsive hover
- **Badges:** `stiffness: 500, damping: 20` — Snappy micro-interaction
- **Grid items:** `stiffness: 300, damping: 24` — Smooth stagger

## Performance

✅ **GPU-accelerated properties only** — scale, opacity, y (transform)  
✅ **Viewport detection** — animations trigger when scrolled into view  
✅ **Once: true** — scroll-triggered animations only play once  
✅ **No layout thrash** — no width/height/margin animations

## Example: Full Page Pattern

```tsx
import { AnimatedCard, AnimatedBadge, AnimatedL1, AnimatedGrid, AnimatedGridItem } from "./_components/marketing-info-animated";

export default function MyPage() {
  return (
    <MarketingInfoShell>
      <MarketingInfoHeader>
        <MarketingInfoKicker>Legal — Last Updated March 16, 2026</MarketingInfoKicker>
        <MarketingInfoTitle>Page Title</MarketingInfoTitle>
        <MarketingInfoDescription>Description text</MarketingInfoDescription>
        <div className="mi-meta">
          <AnimatedBadge tone="primary">Badge 1</AnimatedBadge>
          <AnimatedBadge tone="premium">Badge 2</AnimatedBadge>
        </div>
      </MarketingInfoHeader>

      <MarketingInfoContent>
        <MarketingInfoSection>
          <MarketingInfoSectionHeader>
            <MarketingInfoSectionTitle>Section Title</MarketingInfoSectionTitle>
          </MarketingInfoSectionHeader>

          <AnimatedL1>
            <AnimatedGrid columns={2}>
              {items.map((item) => (
                <AnimatedGridItem key={item.id}>
                  <AnimatedCard tone="raised">
                    <MarketingInfoCardHeader>
                      <MarketingInfoCardTitle>{item.title}</MarketingInfoCardTitle>
                    </MarketingInfoCardHeader>
                    <MarketingInfoCardBody>
                      <p className="mi-card-copy">{item.description}</p>
                    </MarketingInfoCardBody>
                  </AnimatedCard>
                </AnimatedGridItem>
              ))}
            </AnimatedGrid>
          </AnimatedL1>
        </MarketingInfoSection>
      </MarketingInfoContent>
    </MarketingInfoShell>
  );
}
```

## Migration Checklist

When adding animations to an existing marketing page:

1. ✅ Import animated components from `marketing-info-animated.tsx`
2. ✅ Replace `MarketingInfoCard` → `AnimatedCard`
3. ✅ Replace `MarketingInfoBadge` → `AnimatedBadge`
4. ✅ Replace `MarketingInfoL1` → `AnimatedL1`
5. ✅ Replace `MarketingInfoGrid` → `AnimatedGrid`
6. ✅ Wrap grid children with `AnimatedGridItem`
7. ✅ Remove `asChild` props (not needed with animated components)
8. ✅ Change badge tone from `"interactive"` to `"primary"` or `"premium"`
9. ✅ Test hover states and scroll-triggered animations
10. ✅ Validate with `get_errors` tool

## Files

- **Components:** `apps/web/src/app/(public)/(marketing)/_components/marketing-info-animated.tsx`
- **Page transitions:** `apps/web/src/app/(public)/(marketing)/template.tsx`
- **Example usage:** `apps/web/src/app/(public)/(marketing)/page.tsx` (Home page)

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14.1+
- Edge 90+

All browsers with CSS transform and opacity support.

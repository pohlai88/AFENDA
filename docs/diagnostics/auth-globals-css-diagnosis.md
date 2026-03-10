# Auth globals.css Diagnosis

**Date:** 2026-03-09  
**Issue:** Auth pages appear to use shadcn/next-auth default styles instead of globals.css design system tokens.

**Last MCP diagnosis:** 2026-03-09 — Next.js DevTools MCP initialized, Next.js docs consulted.

---

## ROOT CAUSE (verified via build output analysis)

**The design system tokens from `@afenda/ui/styles.css` are NOT present in the compiled CSS output.**

### Evidence

1. **Build output comparison:**
   - **Auth** (`/auth/signup`): loads `014e1da70f2f5487.css` (fonts) + `77e84bb389973078.css` (main)
   - **Root** (`/`): loads same two + `68d953351889de88.css` (marketing.css only)

2. **Main chunk `77e84bb389973078.css` contains:**
   - Tailwind default `@layer theme` with `:root` (Inter font, Tailwind color palette)
   - NO `--background: oklch(1 0 0)` or `--foreground: oklch(0.145 0 0)` from our design system
   - NO `--surface-50`, `--surface-100`, or other tokens from `_tokens-light.css`

3. **Grep of build output:**
   - `oklch(1 0 0)` (our light background) → **0 matches**
   - `surface-50`, `surface-100` → **0 matches**

4. **Why root page looks correct:** Root page loads `marketing.css` (68d953351889de88.css), which defines `[data-marketing]{--background:var(--mk-bg);--foreground:var(--mk-text);...}`. So the root page gets its tokens from marketing.css, not from globals.css.

5. **Why auth looks wrong:** Auth has no `[data-marketing]`, so it relies on `:root` from our design system. But those tokens never made it into the build. Auth falls back to Tailwind defaults or undefined `var(--background)`.

### Conclusion

**Tailwind v4 / PostCSS / Next.js build pipeline is not including our `@afenda/ui/styles.css` token definitions in the output.** The `@import "@afenda/ui/styles.css"` in globals.css is either being stripped, merged incorrectly, or processed in a way that drops our `:root` and `.dark` rules.

---

## Layout Hierarchy (verified)

```
app/layout.tsx (ROOT)
├── import "./globals.css"  ← applies to ALL routes
├── ThemeProvider
│   └── SessionProvider
│       └── ShellLayoutWrapper
│           └── children
│
└── For /auth/signin:
    app/(auth)/auth/layout.tsx
    └── AuthShell
        └── SignInTabs (page)
```

- Auth lives at `(auth)/auth/` — **same level as `(public)`**, not nested inside it.
- Auth is **not** under `(public)/(marketing)/` — it does **not** get `marketing.css` or `[data-marketing]`.
- Root layout is the only parent of auth; it imports `globals.css`, so auth inherits it.

---

## Likely Cause 1: shadcn/tailwind.css Override — RULED OUT

**Verified:** `shadcn/tailwind.css` contains only:
- Accordion keyframes
- Custom variants (data-open, data-closed, etc.)
- `no-scrollbar` utility

It does **not** define `:root` or `.dark` or any theme variables. It is not overriding our design system.

---

## Likely Cause 2: Tailwind @source Path

**Current @source in globals.css:**

```css
@source "../**/*.{ts,tsx,js,jsx,mdx}";
@source "../../../../packages/ui/src/**/*.{ts,tsx,js,jsx,mdx}";
```

- `globals.css` lives at `apps/web/src/app/globals.css`.
- `../` resolves to `apps/web/src/`.
- `../**/*` should include `app/(auth)/auth/**`.

If Tailwind resolves `@source` relative to a different base (e.g. project root or PostCSS cwd), auth files might be excluded and utilities like `bg-background`, `text-foreground` would not be generated for auth components.

**Fix (superseded):** Auth was moved to `(auth)/auth/` — same level as `(public)` — so it receives `globals.css` directly from the root layout without any `(public)` route group in the hierarchy.

---

## Likely Cause 3: Next.js CSS Resolution Order

There is a known Next.js issue ([#64921](https://github.com/vercel/next.js/issues/64921)) where CSS load order can differ between dev and production, causing global styles to override or be overridden unexpectedly.

**Mitigation:** Use CSS layers so design system styles have a defined place in the cascade:

```css
@layer design-system {
  /* Import design system here, or wrap @afenda/ui in a layer */
}
```

---

## NextAuth

NextAuth is **not** the source of auth UI styles. The app uses custom sign-in pages (`/auth/signin`, `SignInTabs`). NextAuth only handles redirects and session logic; it does not render or style the auth UI.

---

## Recommended Fixes

### Fix 1: Split Tailwind into separate file (IMPLEMENTED — Next.js #72761)

**Root cause (from [vercel/next.js#72761](https://github.com/vercel/next.js/issues/72761)):** When `@import "tailwindcss"` is in the same file as other `@import`s, Tailwind replaces it with actual CSS. That pushes subsequent `@import`s down, creating invalid CSS (all `@import` must be at top). The build pipeline then strips or misprocesses the design system import.

**Solution:** Create `tailwind.css` containing only `@import "tailwindcss"` and `@source` directives. In `globals.css`, use `@import "./tailwind.css"` first, then design system, then shadcn. All `@import`s stay at top; PostCSS resolves them in order.

**Files:**
- `apps/web/src/app/tailwind.css` — Tailwind engine + @source
- `apps/web/src/app/globals.css` — imports tailwind.css, design system, shadcn

### Fix 2: experimental.cssChunking: "strict" (IMPLEMENTED)

Next.js docs: *"You may consider using 'strict' if you run into unexpected CSS behavior."* When `b.css` depends on `a.css`, `true` (default) may merge files in wrong order. `strict` loads CSS in correct import order.

**Config:** `next.config.ts` → `experimental: { cssChunking: "strict" }`

### Fix 3a: Design tokens override (IMPLEMENTED — VERIFIED, fallback)

**Root cause (log evidence):** `@import "@afenda/ui/styles.css"` resolves in PostCSS, but Next.js 16 Turbopack chunking does not reliably include `:root`/`.dark` tokens in auth route CSS chunks. Runtime logs showed `primaryValue: "#111116"` (shadcn default) instead of design system oklch.

**Solution:** Separate `design-tokens-override.css` with `:root` and `.dark` tokens, imported in `layout.tsx` after `globals.css`. This loads as a separate chunk and overrides Tailwind/shadcn defaults. Post-fix verification (2026-03-09): `primaryValue: "lab(29.8038% 27.2421 -70.4828)"`, `bgValue: "lab(100% 0 0)"` — design system tokens applied.

### Fix 3b: experimental.inlineCss (IMPLEMENTED — test without override)

**Next.js docs:** `inlineCss: true` inlines all CSS in `<head>` instead of `<link>` tags, eliminating chunk-load order issues. Production only.

**Config:** `next.config.ts` → `experimental: { inlineCss: true }`

**Verification:** Run `pnpm build && pnpm start`, then visit `/auth/signup` and `/auth/signin`. If design tokens appear correctly, the override can be removed. If not, restore `import "./design-tokens-override.css"` in layout.tsx.

### Fix 4: Disable Turbopack for build (if needed)

Known Turbopack CSS regression ([#79500](https://github.com/vercel/next.js/discussions/79500)). Try `$env:TURBOPACK=0; pnpm build` (PowerShell) or `TURBOPACK=0 pnpm build` (bash).

### Fix 5: Verify PostCSS pipeline

Add a unique token to the design system, rebuild, and grep the output to confirm it appears. **Note:** Stop dev server before `pnpm build` (lock conflict).

---

## MCP Diagnosis (2026-03-09)

**Tools used:** Next.js DevTools MCP (`init`, `nextjs_index`, `nextjs_call`, `nextjs_docs`)

**Findings:**
- Dev server on port 3000: no runtime errors in browser session
- Next.js docs: CSS ordering differs between dev and production; always verify with `next build`
- `experimental.cssChunking: 'strict'` recommended for predictable import order when dependencies exist between CSS files
- GitHub #72761: Tailwind replacing `@import "tailwindcss"` pushes other `@import`s down → invalid CSS → design system stripped

**Verification steps:**
1. Stop dev server (build lock)
2. `cd apps/web; pnpm build`
3. Grep build output: `rg "oklch(1 0 0)" apps/web/.next/static/` — should find design system tokens

---

## Superseded / Previous Actions

1. **Inspect `shadcn/tailwind.css`**  
   Check whether it defines `:root` or `.dark` variables. If yes, adjust import order or override those variables after our design system.

2. **Auth restructure (done)**  
   Auth was moved from `(public)/auth/` to `(auth)/auth/` — same level as `(public)`. Auth now has a clean layout hierarchy: root layout → auth layout, with no `(public)` route group.

3. **Re-import globals.css in auth layout (safeguard)**  
   Add `import "../../globals.css"` in `app/(auth)/auth/layout.tsx` if needed. (Note: This may cause duplicate CSS; use only if needed.)

4. **Verify in production**  
   Build and run `pnpm build && pnpm start`, then compare auth styling to dev. If they differ, the Next.js CSS ordering bug may be involved.

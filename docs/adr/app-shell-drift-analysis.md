# App-Shell Plan vs Codebase — Drift, Gaps & Optimization Analysis

> **Purpose:** Compare `docs/adr/app-shell.md` against the actual implementation to identify drift, gaps, and enterprise-quality improvements.  
> **Date:** March 7, 2026

---

## Executive Summary

| Category | Count | Severity |
|----------|-------|----------|
| **Drift** (plan ≠ implementation) | 12 | High |
| **Gaps** (planned, not built) | 15 | High |
| **Optimization** (consistency/quality) | 10 | Medium |

The shell foundation (RootShell, GlobalTopBar, LeftModuleRail, DomainBurger) and registries are implemented. Phases 3–7 (CrudSapRail, workspace patterns, function bars, CommandPalette, ContextualSidecar) are **not implemented**. Layout consistency across route groups is broken.

---

## 0. SHADCN MCP AUDIT & EVALUATION

**MCP Status:** ✅ Initialized. `npx shadcn@latest mcp` via `.cursor/mcp.json`. Registry: `@shadcn`.

### Registry Audit (user-shadcn MCP)

| Tool | Result |
|------|--------|
| `get_project_registries` | `@shadcn` configured (packages/ui/components.json) |
| `list_items_in_registries` | 403 items (ui, blocks, styles) |
| `get_audit_checklist` | Imports, dependencies, lint, TypeScript, Playwright |

### Shell → shadcn Registry Alignment

| Shell Component | shadcn Primitive | Registry Status | Notes |
|-----------------|------------------|-----------------|-------|
| RootShell | sidebar | ✅ ui | SidebarProvider, SidebarInset |
| LeftModuleRail | sidebar | ✅ ui | Matches **sidebar-07** (collapses to icons) |
| CrudSapRail (planned) | sidebar, sheet | ✅ ui | **sidebar-14** = right sidebar; **sidebar-15** = left+right |
| DomainBurger | command | ✅ ui | CommandDialog (cmdk) |
| GlobalTopBar | button, badge, dropdown-menu, avatar | ✅ ui | All present |
| ContextualSidecar (planned) | sheet | ✅ ui | Slide-out panel |

### shadcn Blocks of Interest

- **sidebar-07** — "A sidebar that collapses to icons" → LeftModuleRail pattern ✓
- **sidebar-14** — "A sidebar on the right" → CrudSapRail reference
- **sidebar-15** — "A left and right sidebar" → Four-zone layout reference
- **sidebar-16** — "A sidebar with a sticky site header" → GlobalTopBar + rail
- **dashboard-01** — "Dashboard with sidebar, charts and data table" → AnalyticsWorkspace reference

### MCP Audit Checklist (Post-Addon)

- [ ] Imports correct (named vs default)
- [ ] Dependencies installed
- [ ] Lint / TypeScript clean
- [ ] Playwright coverage for shell flows

### Strategy Commentary: Add-on vs Rebuild

**Recommendation: Add-on.** The shell uses shadcn primitives correctly. No rebuild needed.

| Aspect | Add-on Rationale |
|--------|------------------|
| **Primitives** | sidebar, command, sheet, button, etc. already in place; app-shell plan mapping is accurate |
| **Blocks** | sidebar-07 validates LeftModuleRail; sidebar-14/15 provide CrudSapRail patterns |
| **Registry** | 403 items available; no missing components for planned shell |
| **Risk** | Rebuild would touch working code; add-on preserves existing behavior |

---

## 1. DRIFT — Plan vs Implementation Mismatches

### 1.1 Shell Layout Inconsistency (Critical) ✅ FIXED

**Plan:** Unified four-zone shell for all modules. "Finance module as gold-standard reference."

**Reality:** ~~(kernel) used custom layouts~~ **Fixed:** `(kernel)/governance/layout.tsx` and `(kernel)/admin/layout.tsx` now use `RootShell`.

---

### 1.2 DomainBurger — Missing Recent & Pinned Sections ✅ FIXED

**Plan:** "DomainBurgerPopover with search, recent, pinned" (Phase 2).

**Reality:** ~~DomainBurger shows only domain-grouped surfaces. No Recent or Pinned sections.~~ **Fixed:** Added Pinned and Recent CommandGroup sections; pin/unpin via Button with PinIcon/PinOffIcon.

---

### 1.3 DomainBurger — Hardcoded Icon Map (Inconsistent with Registry) ✅ FIXED

**Plan:** Registry-driven; "no hardcoded ID-to-icon maps" (dynamic-icon.tsx).

**Reality:** ~~DomainBurger uses `DOMAIN_ICONS`~~ **Fixed:** Replaced with `RegistryIcon` from `dynamic-icon.tsx`; domain icons now resolve from registry.

---

### 1.4 Invoice List Page — Placeholder, Not Wired ✅ FIXED

**Plan:** "Invoice list/detail → new shell (reference implementation)" (Phase 8).

**Reality:** ~~`page.tsx` renders placeholder~~ **Fixed:** Page fetches invoices + capabilities server-side, renders `InvoiceListClient`.

---

### 1.5 InvoiceListClient — Raw HTML in Error State ✅ FIXED

**Plan:** "All components use shadcn/ui — NO raw HTML elements" (AGENTS.md, shadcn-enforcement gate).

**Reality:** ~~Raw `<button>`~~ **Fixed:** Replaced with `<Button variant="outline" size="sm">Retry</Button>`.

---

### 1.6 Route / Module Href Mismatches

**Plan:** Surface `href` must match Next.js routes. Module `href` maps to route groups.

**Reality:**
- Module `analytics` has `href: "/analytics"` but surfaces like `insights.factory` use `href: "/admin/insights"`
- Module `platform` has `href: "/admin"` — overlaps with Analytics surfaces under `/admin`
- No `/analytics` route group exists; Analytics surfaces live under `(kernel)/admin`

**Fix:** Align surface registry hrefs with actual routes, or add `(erp)/analytics` route group.

---

### 1.7 Root Layout — No RootShell Wrapper

**Plan:** RootShell wraps the app for unified shell.

**Reality:** Root `layout.tsx` does not wrap children in RootShell. RootShell is used only in:
- `page.tsx` (homepage) — **duplicated** RootShell inside page
- `(erp)/layout.tsx` — RootShell wraps (erp) routes only

**Impact:** Homepage and (erp) both use RootShell, but (kernel) routes do not. Inconsistent.

**Fix:** Either move RootShell to root layout (and remove from page + erp layout), or keep current structure but document that (kernel) intentionally uses alternate layouts for auth/settings.

---

### 1.8 Function Bar Registry — Capability Check Missing

**Plan:** "Capabilities integration: actions filtered by `actionCaps`."

**Reality:** `function-bar-registry.ts` defines `capability: "ap.invoice.approve"` etc., but `getFunctionBarActions` does **not** filter by capabilities. It only filters by `workspaceType` and `selectionCount`.

**Fix:** Add `capabilities: CapabilityResult` parameter to `getFunctionBarActions` and filter out actions where `capability` is set and `!capabilities.actionCaps[action.capability]?.allowed`.

---

### 1.9 CI Gate — ui-shell.mjs Does Not Exist

**Plan:** Phase 10 — "ui-shell.mjs enforces: no custom layouts, all registries complete."

**Reality:** `tools/gates/ui-shell.mjs` does not exist. `tools/run-gates.mjs` runs 18 gates; none are ui-shell.

**Fix:** Implement `ui-shell.mjs` to:
- Detect layouts that don't use RootShell where expected
- Verify all registries export required shapes
- Fail if workspace pages don't use workspace patterns

---

### 1.10 Domain Registry — Icon "Search" vs Lucide

**Reality:** Domain `audit` uses `icon: "Search"`. Lucide has `Search`. `RegistryIcon`/`lucide-react/dynamic` expects kebab-case `search`. Should resolve correctly. No drift.

---

### 1.11 Governance Settings — Surface href Mismatch ✅ FIXED

**Plan:** Surface `href` must match Next.js routes.

**Reality:** ~~`settings.general` pointed to non-existent `/governance/settings/general`~~ **Fixed:** href changed to `"/governance/settings"`.

---

### 1.12 Component Inventory Doc vs Code

**Doc says:** `/finance/ap/invoices` uses "GeneratedList, InvoiceListClient".

**Reality:** Page uses placeholder; InvoiceListClient is not rendered. Doc is ahead of implementation.

---

## 2. GAPS — Planned but Not Implemented

### 2.1 CrudSapRail (Phase 3) ✅ IMPLEMENTED

**Status:** Implemented. `packages/ui/src/shell/rail/CrudSapRail.tsx` — right rail with Create/Read/Update/Delete/Search/Audit/Predict actions. Collapsed/expanded modes. Wired into RootShell.

---

### 2.2 Workspace Patterns (Phase 4)

**Status:** Partial.

| Pattern | Status |
|---------|--------|
| OperationalListWorkspace | ✅ Implemented — wraps list + ListFunctionBar, sets workspaceType |
| RecordWorkspace | Not implemented |
| SplitWorkspace | Not implemented |
| AnalyticsWorkspace | Not implemented |

**Current:** Invoice list uses OperationalListWorkspace. Record/Split/Analytics pending.

---

### 2.3 Function Bars (Phase 5)

**Status:** Partial.

| Component | Status |
|-----------|--------|
| ListFunctionBar | ✅ Implemented — Export dropdown, Print, Templates, bulk actions (when selection > 0) |
| RecordFunctionBar | Not implemented |
| Export handlers (CSV/Excel/PDF) | Placeholder (toast "coming soon"); UI wired |
| Print handler | Placeholder (toast "coming soon"); UI wired |
| Bulk action handlers | Placeholder (toast "coming soon"); clears selection |

---

### 2.4 Professional List (Phase 6)

**Status:** Partial.

| Feature | Status |
|---------|--------|
| Row selection (multi) | ✅ Implemented — GeneratedList selectionMode="multi", checkbox column |
| ColumnManager | Not implemented |
| FilterBuilder | Not implemented |
| QuickFilters | Not implemented |
| Keyboard nav | Partial (GeneratedList may have some) |

---

### 2.5 Command Palette (Phase 7) ✅ IMPLEMENTED

**Status:** Cmd+K / Ctrl+K opens DomainBurger (RootShell useEffect). When no module selected, shows "Select a module from the left rail" prompt.

---

### 2.6 ContextualSidecar (Phase 7)

**Status:** Store has `detailSidecarOpen`, `setDetailSidecarOpen`. No Sheet-based sidecar component. Pending.

---

### 2.7 Export Handlers

**Status:** No CSV, Excel, or PDF export. No print-optimized view.

---

### 2.8 Bulk Action Handlers

**Status:** No batch API, no idempotency, no progress indicator, no partial-failure handling.

---

### 2.9 Verification Checklist — All Unchecked

Plan's "After Phase 5" and "After Phase 10" checklists are entirely unchecked. No verification automation.

---

## 3. OPTIMIZATION — Consistency & Enterprise Quality

### 3.1 Unify Shell Layout Strategy

**Issue:** RootShell in (erp) layout vs custom layouts in (kernel) creates two UX modes.

**Recommendation:** Document and enforce:
- **Shell routes:** (erp)/*, optionally (kernel)/governance/settings/* — use RootShell
- **Non-shell routes:** (kernel)/auth/*, (kernel)/admin/* (if admin is ops-only) — minimal layout
- Or: Use RootShell everywhere and hide rail items for unauthenticated / admin-only routes.

---

### 3.2 Capabilities Integration in Registries

**Issue:** Function bar and CRUD-SAP registries define `capability` but resolvers don't receive or use `CapabilityResult`.

**Recommendation:** Add `resolveActions(ctx: { capabilities: CapabilityResult; ... })` pattern. All action resolution receives capabilities and filters server-side and client-side.

---

### 3.3 Sync Active Module from URL

**Issue:** `activeModuleId` is set only by rail click. On direct navigation to `/finance/ap/invoices`, the store may have `activeModuleId: null` or stale.

**Recommendation:** Sync `activeModuleId` / `activeDomainId` / `activeSurfaceId` from pathname (e.g. in layout or provider). Use `usePathname()` to derive module from `/finance/*` → `finance`.

---

### 3.4 GlobalTopBar — Hardcoded User

**Issue:** `GlobalTopBar` shows "User" and "user@example.com" — no auth integration.

**Recommendation:** Integrate with NextAuth session. Show real user name/email or "Sign in" when unauthenticated. (Done — NextAuth wired.)

---

### 3.5 DomainBurger — Cmd+K Shortcut

**Plan:** CommandPalette (Cmd+K). DomainBurger opens on "Domains" button click.

**Recommendation:** Add Cmd+K (or Cmd+Shift+D) to open DomainBurger for keyboard users.

---

### 3.6 Error Boundaries for Shell

**Issue:** No error boundary around shell. A crash in LeftModuleRail could take down the whole app.

**Recommendation:** Wrap RootShell children in error boundary. Show fallback UI for shell zone failures.

---

### 3.7 Accessibility — Shell Landmarks

**Issue:** Plan requires "keyboard nav, ARIA labels, screen reader". Shell structure should have `role="banner"`, `role="navigation"`, `role="main"`, etc.

**Recommendation:** Audit RootShell, GlobalTopBar, LeftModuleRail for ARIA landmarks and keyboard focus management.

---

### 3.8 Performance — 1000-Row List

**Plan:** "Performance: 1000-row list < 1s."

**Recommendation:** Add virtualization (e.g. TanStack Virtual) to GeneratedList for large datasets. Verify with load test.

---

### 3.9 Mobile — Drawer Nav

**Issue:** Sidebar uses Sheet on mobile (shadcn Sidebar does this). Plan says "drawer nav, responsive function bars."

**Recommendation:** Verify mobile behavior. Ensure function bars (when built) collapse or stack on small screens.

---

### 3.10 Toast for Bulk Actions

**Plan:** "toast.error(\`${results.failed.length} failed to approve\`)".

**Reality:** ToastNotification (Sonner) is in root layout. Ensure bulk action handlers use it for success/error feedback.

---

## 4. Summary Matrix

| Area | Plan | Implementation | Drift | Gap |
|------|------|----------------|-------|-----|
| RootShell | ✓ | ✓ (erp only) | Layout split | — |
| GlobalTopBar | ✓ | ✓ | — | Auth wiring |
| LeftModuleRail | ✓ | ✓ | — | — |
| DomainBurger | ✓ search, recent, pinned | ✓ search only | Recent/pinned missing | — |
| DomainBurger icons | Registry-driven | Hardcoded map | Icon fallbacks | — |
| CrudSapRail | ✓ | ✗ | — | Full gap |
| Workspace patterns | 4 types | 0 | — | Full gap |
| ListFunctionBar | ✓ | ✗ | — | Full gap |
| RecordFunctionBar | ✓ | ✗ | — | Full gap |
| Export/Print/Bulk | ✓ | ✗ | — | Full gap |
| CommandPalette | ✓ | ✗ | — | Full gap |
| ContextualSidecar | ✓ | ✗ | — | Full gap |
| Finance migration | ✓ | Partial (client exists, page placeholder) | Page not wired | — |
| Governance migration | ✓ | Custom layout | Not in shell | — |
| CI gate ui-shell | ✓ | ✗ | — | Full gap |
| Capabilities in resolvers | ✓ | ✗ | — | Gap |

---

## 5. Recommended Priority Order

1. **P0 — Layout consistency:** Migrate (kernel)/governance and (kernel)/admin to RootShell, or document intentional split.
2. **P0 — Wire InvoiceListClient:** Use it in invoices page; fix raw `<button>` to Button.
3. **P1 — DomainBurger:** Add Recent/Pinned sections; switch to RegistryIcon for domain icons.
4. **P1 — Sync module from URL:** Derive activeModuleId from pathname.
5. **P2 — ListFunctionBar:** Implement; connect to function-bar-registry.
6. **P2 — CrudSapRail:** Implement right rail.
7. **P2 — OperationalListWorkspace:** Wrap list pages.
8. **P3 — Export/Print/Bulk handlers:** Implement per spec.
9. **P3 — CommandPalette (Cmd+K):** Global command overlay.
10. **P3 — ui-shell CI gate:** Enforce no custom layouts, registry completeness.

---

**Next step:** Use this analysis to update `app-shell.md` with a "Current State" section and reprioritize the roadmap, or create tickets for each P0/P1/P2 item.

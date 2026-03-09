# App-Shell Remaining Work — Plan vs Codebase

> **Purpose:** Identify remaining work by comparing `docs/adr/app-shell.md` against the current implementation.  
> **Last Updated:** March 7, 2026  
> **Source:** Codebase inspection + drift analysis

---

## Executive Summary

| Category | Count | Status |
|----------|-------|--------|
| **Implemented** | 33 | ✅ Done |
| **Partial / Placeholder** | 1 | 🔶 Needs completion |
| **Not Implemented** | 1 | ❌ Gap |
| **Drift / Fixes** | 6 | ✅ All fixed |

The shell foundation (Phases 0–6) and core workspace patterns are complete. Export (CSV/Excel/PDF), print (dedicated routes), bulk actions (batch API), SplitWorkspace, AnalyticsWorkspace, ColumnManager, FilterBuilder, QuickFilters, and keyboard nav are implemented. Remaining work: **GlobalTopBar Sign in/Log out wiring** and **Finance dashboard migration**.

---

## 1. IMPLEMENTED ✅

| Component | Location | Notes |
|-----------|----------|-------|
| **RootShell** | `packages/ui/src/shell/root/RootShell.tsx` | Four-zone layout, Cmd+K wired |
| **GlobalTopBar** | `packages/ui/src/shell/global/GlobalTopBar.tsx` | Brand, Domains button, user menu |
| **LeftModuleRail** | `packages/ui/src/shell/navigation/LeftModuleRail.tsx` | Collapsible (sidebar-07): icon-only ↔ expanded with labels; SidebarRail toggle |
| **DomainBurger** | `packages/ui/src/shell/navigation/DomainBurger.tsx` | Search, Pinned, Recent, RegistryIcon |
| **CrudSapRail** | `packages/ui/src/shell/rail/CrudSapRail.tsx` | Right rail, collapsed/peek/expanded |
| **OperationalListWorkspace** | `packages/ui/src/shell/workspace/OperationalListWorkspace.tsx` | List + ListFunctionBar |
| **ListFunctionBar** | `packages/ui/src/shell/workspace/ListFunctionBar.tsx` | Export, Print, Templates, bulk; capabilities filter |
| **RecordWorkspace** | `packages/ui/src/shell/workspace/RecordWorkspace.tsx` | Record + RecordFunctionBar |
| **RecordFunctionBar** | `packages/ui/src/shell/workspace/RecordFunctionBar.tsx` | Breadcrumb, actions |
| **ContextualSidecar** | `packages/ui/src/shell/sidecar/ContextualSidecar.tsx` | Sheet, Details/Audit/Related tabs |
| **Command Palette (Cmd+K)** | RootShell `useEffect` | Opens DomainBurger |
| **Invoice list** | `(erp)/finance/ap/invoices/` | OperationalListWorkspace, GeneratedList |
| **Invoice detail** | `(erp)/finance/ap/invoices/[id]/` | RecordWorkspace, sidecar content |
| **Registries** | `packages/ui/src/shell/registry/` | module, domain, surface, crud-sap, function-bar |
| **ShellLayoutWrapper** | `apps/web/src/components/ShellLayoutWrapper.tsx` | Root layout; wraps non-auth routes with RootShell |
| **SyncModuleFromUrl** | `apps/web/src/components/SyncModuleFromUrl.tsx` | activeModuleId from pathname |
| **Export CSV** | `apps/web/src/lib/export-utils.ts` | Metadata-driven, FieldKit exportAdapter, respects view columns |
| **Export Excel** | `apps/web/src/lib/export-utils.ts` | ExcelJS, frozen header, auto-width |
| **Export PDF** | `apps/web/src/lib/export-utils.ts` | React-PDF (primary), Puppeteer API (fallback), HTML print (last resort) |
| **Print** | `apps/web/src/app/globals.css` | `@media print` hides sidebar/nav; `window.print()` |
| **Bulk actions** | `BulkActionConfirmDialog.tsx` | AlertDialog confirm, Progress during execution, partial-failure toast |
| **Bulk batch API** | `POST /v1/invoices/bulk-approve` etc. | Single round-trip, idempotency per batch, `{ ok, failed, failedIds }` |
| **Print-optimized routes** | `/finance/ap/invoices/print`, `[id]/print` | Dedicated routes, A4 @page, no shell chrome, auto-print on load |
| **RecordFunctionBar handlers** | `InvoiceDetailPageClient.tsx` | Print, Export (CSV/Excel/PDF), Duplicate, Share wired |
| **SplitWorkspace** | `packages/ui/src/shell/workspace/SplitWorkspace.tsx` | Master-detail, ResizablePanelGroup |
| **AnalyticsWorkspace** | `packages/ui/src/shell/workspace/AnalyticsWorkspace.tsx` | Dashboards, KPI cards, tabs |
| **ColumnManager** | `packages/ui/src/shell/workspace/ColumnManager.tsx` | Column visibility popover, localStorage persist |
| **FilterBuilder** | `packages/ui/src/shell/workspace/FilterBuilder.tsx` | Advanced filter popover |
| **QuickFilters** | `packages/ui/src/shell/workspace/QuickFilters.tsx` | Preset filter chips |
| **Keyboard nav** | `GeneratedList.tsx` | Arrow keys, Enter, aria-activedescendant |
| **Invoice split view** | `(erp)/finance/ap/invoices/split/` | SplitWorkspace scaffold |
| **Aging / Dashboards** | `(erp)/finance/ap/aging`, `dashboards/` | AnalyticsWorkspace scaffold |
| **ui-shell CI gate** | `tools/gates/ui-shell.mjs` | RootShell, ShellLayoutWrapper, surface hrefs, domain/module consistency |
| **ShellZoneErrorBoundary** | `packages/ui/src/shell/ShellZoneErrorBoundary.tsx` | Main content wrapped; fallback UI on zone crash |
| **ARIA landmarks** | GlobalTopBar, LeftModuleRail, main, CrudSapRail, DomainBurger, ContextualSidecar | role="banner", "navigation", "main", "complementary"; aria-label |
| **GlobalTopBar auth** | `ShellAuthContext`, `useAuth` | NextAuth wired — user name/avatar from useSession; Sign in/Log out not wired |

---

## 2. PARTIAL / PLACEHOLDER 🔶

| Item | Current State | Plan Spec | Gap |
|------|---------------|-----------|-----|
| **GlobalTopBar auth** | User name/avatar from useSession; Log out menu item present but no `signOut()`; "Sign in" text when unauthenticated but no navigation | Sign in → `/auth/signin`; Log out → `signOut()` | Wire Sign in/Log out actions |

---

## 3. NOT IMPLEMENTED ❌

| Item | Plan Phase | Effort |
|------|------------|--------|
| **Finance dashboard migration** | Phase 8 | — |

**Finance dashboard:** `(erp)/finance/dashboards/page.tsx` uses AnalyticsWorkspace scaffold with static KPI cards ("—") and placeholder "Wire to Chart component (recharts)". `(erp)/finance/ap/aging/page.tsx` uses static aging buckets. Both need real data.

---

## 4. DRIFT / FIXES ✅ (All Resolved)

### 4.1 Root Layout — RootShell Wrapper ✅

**Fix applied:** `ShellLayoutWrapper` in root `layout.tsx` wraps all non-auth routes with RootShell. Auth routes (`/auth/*`) render minimal layout.

### 4.2 Route / Surface href Mismatches ✅

**Fix applied:** Placeholder pages for all surface routes:
- `/finance/ap/payments`, `/finance/ap/aging`
- `/finance/gl/journals`, `/finance/gl/accounts`, `/finance/gl/trial-balance`
- `/finance/ar/invoices`, `/finance/tax/calculations`, `/finance/dashboards`
- `/governance/audit/logs`, `/governance/evidence/documents`, `/governance/policy/sod`
- `/analytics/overview`

### 4.3 Module href vs Route Groups ✅

**Fix applied:** Module-to-path mapping: finance → `/finance`, governance → `/governance`, analytics → `/analytics`, platform → `/admin`.

### 4.4 InvoiceListClient Row Action href ✅

**Reality:** href `/finance/ap/invoices/${id}` is correct; route exists via `(erp)/finance/...`.

### 4.5 getFunctionBarActions — Capabilities ✅

**Reality:** `ListFunctionBar` filters by capabilities at render time. No drift.

### 4.6 Auth Routes — Shell or Not ✅

**Decision:** Auth pages (`/auth/*`) use minimal layout (no RootShell). Documented.

---

## 5. VERIFICATION CHECKLIST (from app-shell.md)

### After Phase 5 (Function Bars)

| Item | Status |
|------|--------|
| Export CSV: respects column visibility, applies filters | ✅ |
| Export Excel: formatted with frozen headers, auto-width | ✅ |
| Export PDF: branded header, page breaks, footer | ✅ (React-PDF + fallbacks) |
| Print: opens formatted layout, removes chrome | ✅ |
| Bulk approve: batch API call with idempotency | ✅ |
| Bulk actions: progress indicator, handles partial failures | ✅ |
| Function bar visibility: conditional on selection state | ✅ |
| Capabilities integration: actions filtered by actionCaps | ✅ |

### After Phase 10 (Complete)

| Item | Status |
|------|--------|
| `pnpm typecheck` — all packages clean | ✅ |
| CI gate: ui-shell passes | ✅ `tools/gates/ui-shell.mjs` |
| Finance module: list/detail/dashboard migrated | 🔶 List + detail done; dashboard placeholder |
| Admin/Governance: settings/audit/custom-fields migrated | ✅ Settings + Audit logs + Evidence documents wired end-to-end |
| Performance: 1000-row list < 1s | ✅ Implemented — see §5.1 |
| Accessibility: keyboard nav, ARIA labels, screen reader | ✅ Keyboard nav + ARIA landmarks done |
| Mobile: drawer nav, responsive function bars | ❓ Sidebar uses Sheet on mobile; function bars not verified |

### 5.1 Performance: 1000-row list < 1s — Implemented ✅

**Status:** Implemented (March 2026).

| Change | Implementation |
|--------|----------------|
| **CURSOR_LIMIT_MAX** | Raised to 1000 (`packages/contracts/src/shared/pagination.ts`) |
| **Page size selector** | InvoiceListClient: 20, 50, 100, 1000 options |
| **GeneratedList** | `@tanstack/react-virtual` when `data.length > 50` (configurable via `virtualizationThreshold`) |
| **Print page** | `PRINT_LIMIT = 1000` |
| **Dependencies** | `@tanstack/react-virtual@3.13.20` in pnpm catalog + `packages/ui` |

**Behaviour:**
- Lists default to 20 rows; user can select 50, 100, or 1000 via toolbar.
- When data exceeds 50 rows, GeneratedList uses virtualization (scroll container `max-height: 70vh`, overscan 10).
- Print route fetches up to 1000 rows; API accepts `limit` up to 1000.

---

## 6. RECOMMENDED PRIORITY ORDER

### P0 — Critical ✅ (Done)

1. ~~Route/registry alignment~~ — Placeholder pages added.
2. ~~Layout strategy~~ — ShellLayoutWrapper at root.

### P1 — High

3. ~~**Bulk batch API**~~ — ✅ Done.
4. **GlobalTopBar auth** — Wire Sign in (→ `/auth/signin`) and Log out (→ `signOut()`).

### P2 — Medium

5. ~~**SplitWorkspace**~~ — ✅ Done.
6. ~~**AnalyticsWorkspace**~~ — ✅ Done.
7. ~~**ColumnManager**~~ — ✅ Done.
8. ~~**FilterBuilder / QuickFilters**~~ — ✅ Done.

### P3 — Lower

9. ~~**ui-shell CI gate**~~ — ✅ Done (`tools/gates/ui-shell.mjs`).
10. ~~**Print-optimized view**~~ — ✅ Done (`/finance/ap/invoices/print`, `[id]/print`).
11. ~~**Error boundary**~~ — ✅ Done (ShellZoneErrorBoundary).
12. ~~**Accessibility audit**~~ — ✅ Done (ARIA landmarks).
13. **Finance dashboard migration** — Replace placeholder with real dashboard.

---

## 7. EFFORT ESTIMATE (Remaining)

| Phase | Remaining Days |
|-------|----------------|
| Phase 4 (SplitWorkspace, AnalyticsWorkspace) | 0 ✅ |
| Phase 5 (Bulk batch API) | 0 ✅ |
| Phase 6 (ColumnManager, FilterBuilder, QuickFilters, keyboard nav) | 0 ✅ |
| Phase 10 (a11y; CI gate done) | 0 ✅ |
| GlobalTopBar Sign in/Log out wiring | 0.5 |
| Finance dashboard migration | 2–3 |
| **Total** | **~3 days** |

---

## 8. PLAN vs CODEBASE ALIGNMENT

| Plan (app-shell.md) | Codebase | Aligned |
|---------------------|----------|---------|
| Export CSV/Excel/PDF | export-utils.ts, PdfExportDocument, export-pdf API | ✅ |
| Print with @media print | globals.css, window.print() | ✅ |
| Bulk actions with confirm + progress | BulkActionConfirmDialog | ✅ |
| RecordFunctionBar Print/Export/Duplicate/Share | InvoiceDetailPageClient | ✅ |
| RootShell at root | ShellLayoutWrapper | ✅ |
| activeModuleId from URL | SyncModuleFromUrl | ✅ |
| SplitWorkspace, AnalyticsWorkspace | packages/ui, scaffold pages | ✅ |
| ColumnManager, FilterBuilder, QuickFilters | packages/ui, InvoiceListClient | ✅ |
| Bulk batch API | Batch endpoints | ✅ |
| ui-shell CI gate | tools/gates/ui-shell.mjs | ✅ |

---

---

## 9. REMAINING WORK (Prioritised)

### P1 — High

1. **GlobalTopBar Sign in/Log out**
   - Extend `ShellAuthValue` with optional `onSignIn?: () => void` and `onSignOut?: () => void` (ui package cannot import next-auth per Import Direction Law).
   - `ShellLayoutWrapper` passes `signOut` from `next-auth/react` and `() => router.push("/auth/signin")` for Sign in.
   - `GlobalTopBar`: when unauthenticated, user button navigates to sign-in; when authenticated, Log out calls `onSignOut`.

2. **Finance dashboard migration**
   - Replace placeholder KPI cards in `(erp)/finance/dashboards/page.tsx` with real data (AP outstanding, invoices due).
   - Wire `(erp)/finance/ap/aging/page.tsx` to aging API.
   - Add charts (recharts) per plan.

### P2 — Lower

3. **Mobile function bars** — Verify ListFunctionBar/RecordFunctionBar responsive behaviour on small screens (document says "not verified").

---

**Next step:** Prioritise GlobalTopBar Sign in/Log out wiring, then Finance dashboard migration. Use for sprint planning.

---

## 10. shadcn Blocks Reference

See **[app-shell-shadcn-blocks-comparison.md](./app-shell-shadcn-blocks-comparison.md)** for:

- shadcn MCP setup (`npx shadcn mcp init --client cursor`)
- Block summaries: **dashboard-01** (charts, data table, KPI cards), **sidebar-10** (popover sidebar, team-switcher, nav-actions)
- AFENDA vs shadcn comparison matrix

**Implemented (March 2026):**
- **OrgSwitcher** — `packages/ui` shell; pass `orgValue` to `RootShell` for multi-org
- **SectionCards** — KPI cards with trend badges
- **ChartAreaInteractive** — Area chart with time range selector
- **Finance dashboard** — Upgraded with SectionCards + ChartAreaInteractive
- **LeftModuleRail collapsible** — sidebar-07 pattern: icon-only when collapsed, full labels when expanded; SidebarTrigger + SidebarRail toggle

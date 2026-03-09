# App-Shell vs shadcn Blocks — Comparison & Recommendations

> **Purpose:** Compare AFENDA app-shell to shadcn professional blocks; recommend adoption patterns.  
> **Last Updated:** March 7, 2026  
> **Blocks analyzed:** dashboard-01, sidebar-10, sidebar-07

---

## 1. shadcn MCP Setup

MCP is configured in `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "shadcn": {
      "command": "npx",
      "args": ["shadcn@latest", "mcp"]
    }
  }
}
```

**Initialize for Cursor:**
```bash
npx shadcn@latest mcp init --client cursor
```

Enable the shadcn server in Cursor Settings → MCP.

**Add blocks:**
```bash
cd apps/web
npx shadcn@latest add dashboard-01
npx shadcn@latest add sidebar-10
```

---

## 2. Block Summaries

### dashboard-01 — Dashboard with sidebar, charts, data table

| Component | Description |
|-----------|-------------|
| **app-sidebar** | Full sidebar: NavMain, NavDocuments (dropdown), NavSecondary, NavUser |
| **site-header** | SidebarTrigger + Breadcrumb + GitHub link |
| **section-cards** | KPI cards (Total Revenue, New Customers, Active Accounts, Growth Rate) |
| **chart-area-interactive** | Recharts area chart, time range selector (7d/30d/90d) |
| **data-table** | TanStack Table + @dnd-kit sortable, column visibility, Drawer for mobile row detail |
| **nav-user** | Avatar + DropdownMenu (Account, Billing, Notifications, Log out) |

**Dependencies:** @tabler/icons-react, @dnd-kit/*, @tanstack/react-table, recharts, drawer, chart, tabs, etc.

**Note:** Uses `@tabler/icons-react`; AFENDA uses `lucide-react`. Swap icons when adapting.

---

### sidebar-10 — Sidebar in a popover

| Component | Description |
|-----------|-------------|
| **team-switcher** | DropdownMenu: org/workspace switcher (Acme Inc, Acme Corp, Evil Corp) + "Add team" |
| **nav-workspaces** | Collapsible groups (Personal Life, Professional Dev, Creative Projects, etc.) with nested pages |
| **nav-favorites** | Pinned items with emoji, DropdownMenu (Remove, Copy Link, Open in New Tab, Delete) |
| **nav-main** | Primary nav (Search, Ask AI, Home, Inbox) |
| **nav-secondary** | Secondary nav (Calendar, Settings, Templates, Trash, Help) |
| **nav-actions** | Popover: "Edit Oct 08" + action groups (Customize, Copy Link, Export, Undo, Import) |
| **app-sidebar** | Sidebar content rendered **inside a Popover** — click trigger to open overlay |

**Key pattern:** Sidebar is **not** always visible; it opens in a popover overlay. Good for space-constrained or mobile-first layouts.

---

### sidebar-07 — Sidebar that collapses to icons

| Component | Description |
|-----------|-------------|
| **team-switcher** | Same org switcher pattern |
| **nav-user** | User menu in sidebar footer |
| **nav-projects** | Collapsible project list |
| **nav-main** | Primary nav |
| **app-sidebar** | Collapsible sidebar (icon-only when collapsed) |

**Key pattern:** Icon rail when collapsed; expands to full sidebar. Similar to AFENDA's LeftModuleRail but with expand/collapse.

---

## 3. AFENDA App-Shell vs shadcn Blocks

| Aspect | AFENDA | dashboard-01 | sidebar-10 | sidebar-07 |
|--------|--------|--------------|------------|------------|
| **Left nav** | LeftModuleRail (icon-only, fixed) | Full sidebar (NavMain, NavDocuments, NavSecondary) | Sidebar in Popover | Collapsible icon ↔ full |
| **Org/team switcher** | ❌ None | ❌ None | ✅ TeamSwitcher | ✅ TeamSwitcher |
| **Surface picker** | DomainBurger (CommandDialog, Cmd+K) | N/A | N/A | N/A |
| **Top bar** | GlobalTopBar (brand, Domains button, user menu) | SiteHeader (trigger, breadcrumb) | Inline in SidebarInset | Inline |
| **Right rail** | CrudSapRail (CRUD, Audit, Predict) | ❌ None | ❌ None | ❌ None |
| **User menu** | GlobalTopBar DropdownMenu | NavUser in sidebar | N/A (header) | NavUser in sidebar |
| **KPI cards** | AnalyticsWorkspace scaffold | ✅ SectionCards | ❌ | ❌ |
| **Charts** | Placeholder | ✅ ChartAreaInteractive (recharts) | ❌ | ❌ |
| **Data table** | GeneratedList + TanStack Virtual | DataTable (TanStack + dnd-kit) | ❌ | ❌ |
| **Favorites / Pinned** | DomainBurger (pinned surfaces) | ❌ | ✅ NavFavorites | ❌ |
| **Workspace groups** | Domain → Surfaces (registry) | NavDocuments (flat) | NavWorkspaces (nested) | NavProjects |
| **Page actions** | RecordFunctionBar, ListFunctionBar | ❌ | NavActions (Popover) | ❌ |

---

## 4. Recommendations — What to Adopt

### P0 — High value, low conflict

| Block | Component | Use in AFENDA |
|-------|-----------|---------------|
| **dashboard-01** | SectionCards | Replace placeholder KPI cards in `(erp)/finance/dashboards/page.tsx` |
| **dashboard-01** | ChartAreaInteractive | Wire Finance dashboard charts (AP aging, revenue trends) |
| **sidebar-10** | TeamSwitcher | Add org switcher to GlobalTopBar or LeftModuleRail — maps to `org_id` / multi-tenant context |
| **sidebar-10** | NavActions (Popover) | Reference for RecordFunctionBar "more actions" popover (Export, Duplicate, etc.) |

### P1 — Medium value, adapt required

| Block | Component | Adaptation |
|-------|-----------|------------|
| **dashboard-01** | DataTable | AFENDA uses GeneratedList + FieldKit. Dashboard-01's DataTable has dnd-kit sortable, Drawer for mobile — consider for admin/config surfaces, not core lists. |
| **dashboard-01** | app-sidebar | AFENDA's LeftModuleRail + DomainBurger is a different model. Dashboard sidebar is always-visible; we use icon rail + Cmd+K. No direct replacement. |
| **sidebar-10** | NavFavorites | Similar to DomainBurger "Pinned" — already implemented. Could align UI patterns. |
| **sidebar-10** | NavWorkspaces | Collapsible domain → surfaces. Our surface-registry is flat per domain; could add grouping. |

### P2 — Evaluate later

| Block | Component | Notes |
|-------|-----------|-------|
| **sidebar-10** | Sidebar in Popover | Alternative to DomainBurger: full nav in popover vs command palette. Test UX for power users. |
| **sidebar-07** | Collapsible sidebar | AFENDA rail is always icon-only. If we want expandable rail, sidebar-07 pattern applies. |
| **dashboard-01** | NavUser | We have GlobalTopBar user menu. NavUser is sidebar footer — different placement. |

---

## 5. Implementation Notes

### Icon library

- **dashboard-01** uses `@tabler/icons-react`
- **AFENDA** uses `lucide-react` (AGENTS.md, components.json)
- When copying dashboard-01 components, replace `IconX` with `X` from `lucide-react` (or add @tabler as optional dep)

### components.json

- **apps/web**: `style: "base-nova"`, `@/components`, `@/lib/utils`
- **packages/ui**: `style: "new-york"`, different paths
- Blocks install to `apps/web` by default. For `packages/ui`, run from that package or move files manually.

### Import Direction Law

- `packages/ui` can only import `@afenda/contracts` (no core, db, api)
- TeamSwitcher, NavActions need org/session data — pass via props from host (apps/web)

---

## 6. Useful Blocks Beyond dashboard-01 / sidebar-10

| Block | Use case |
|-------|----------|
| **sidebar-01** | Simple nav grouped by section |
| **sidebar-02** | Collapsible sections |
| **sidebar-03** | Submenus |
| **sidebar-05** | Collapsible submenus |
| **sidebar-06** | Submenus as dropdowns |
| **login-03** | Muted background sign-in (align with `/auth/signin`) |
| **login-04** | Form + image split |

---

## 7. Next Steps

1. ~~**Add blocks to reference**~~ — CLI had config issues; components were implemented manually.
2. ~~**TeamSwitcher**~~ — **Done.** `OrgSwitcher` in `packages/ui` + `ShellOrgContext`; wire via `RootShell orgValue` prop.
3. ~~**Finance dashboard**~~ — **Done.** `SectionCards` + `ChartAreaInteractive` in `packages/ui`; Finance dashboards page upgraded.
4. **Wire orgValue:** In `ShellLayoutWrapper`, fetch user's orgs and pass `orgValue` to `RootShell` when multi-org is ready.
5. ~~**sidebar-07 collapsible**~~ — **Done.** LeftModuleRail uses `collapsible="icon"`; SidebarRail + SidebarTrigger toggle.
6. **MCP prompts:** Use natural language with shadcn MCP: "Add a login form", "Show me sidebar blocks".

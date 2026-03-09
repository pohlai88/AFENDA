## AFENDA App-Shell Upgrade — VALIDATED & APPROVED ✓

I've validated your comprehensive app-shell plan against AFENDA's existing architecture and created a **build-ready execution spec**. Full plan saved to plan.md.

> **Drift analysis:** See [app-shell-drift-analysis.md](./app-shell-drift-analysis.md) for plan-vs-codebase comparison, gaps, and optimization recommendations.

---

## ✅ VALIDATION SUMMARY

**Your Proposed Four-Zone Architecture: APPROVED**

**Score: 5.0/5.0** — This is the correct long-term model for AFENDA.

### Why It's Right

1. **Aligns with existing pillar structure** — Left rail maps to packages (kernel, erp, comm)
2. **Builds on capabilities system** — Existing `CapabilityResult` drives CRUD-SAP rail visibility
3. **Extends metadata registry** — Workspace patterns wrap existing `<GeneratedList>`, `<GeneratedForm>`
4. **Truth-first posture** — Audit (A) and Predict (P) are first-class, not afterthoughts
5. **Finance-grade institutional** — Matches NetSuite/SAP feel, not generic SaaS admin
6. **Respects boundary law** — ui → contracts only (enforced by existing CI gates)

---

## 📐 FUNCTION BAR SPECIFICATION (Your Critical Request)

### List Function Bar (OperationalListWorkspace)

**Always visible:**
- **Export** → CSV, Excel, PDF (respects column visibility + filters)
- **Print** → print-optimized layout
- **Templates** → import template, quick create variants

**Conditionally visible:**
- **BulkActions** → shows when `selection.length > 0`
  - Approve Selected (filtered by `capabilities.actionCaps["ap.invoice.approve"].allowed`)
  - Reject Selected, Void Selected
  - Export Selected, Download Evidence (batch)

**Capabilities integration:**
```ts
type ListFunctionBarProps = {
  entityKey: string;
  capabilities: CapabilityResult; // existing schema
  selection: Record<string, unknown>[];
  onExport: (format: "csv"|"xlsx"|"pdf") => void;
  onPrint: () => void;
  onBulkAction: (actionKey: string, records) => void;
}
```

---

### Export Handlers (Production-Ready Spec)

**CSV Export:**
- Respects ColumnManager preferences (visible columns only)
- Applies current filters + sort
- Uses FieldKit `exportAdapter` per column type
- Money fields → major units + currency code
- Dates → ISO 8601
- Max 10,000 rows (paginate for larger)

**Excel Export:**
- Same as CSV + formatting (ExcelJS library)
- Frozen header, auto-width columns
- Number formats for money/date/percent
- Hyperlinks for relation fields

**PDF Export:**
- React-PDF or Puppeteer
- Branded header (org logo + timestamp)
- Formatted table + page breaks
- Footer with page numbers + generation metadata

**Print:**
- Opens print-optimized view in new tab
- Removes chrome (nav, sidebars, toolbars)
- CSS `@media print` styles
- A4 portrait (Letter for US orgs)

---

### Bulk Actions Pattern

```ts
async function handleBulkApprove(selectedRecords: Invoice[]) {
  // 1. Filter eligible records
  const eligible = selectedRecords.filter(r => 
    r.status === "submitted" && 
    capabilities.actionCaps["ap.invoice.approve"].allowed
  );
  
  // 2. Confirm with user
  const confirmed = await confirm({
    title: "Approve Invoices",
    description: `Approve ${eligible.length} invoice(s)?`,
    actionLabel: "Approve All"
  });
  
  if (!confirmed) return;
  
  // 3. Batch API call with idempotency
  const results = await api.post("/v1/invoices/bulk-approve", {
    invoiceIds: eligible.map(r => r.id),
    idempotencyKey: generateIdempotencyKey()
  });
  
  // 4. Optimistic UI update
  updateLocalRecords(eligible, { status: "approved" });
  
  // 5. Handle partial failures
  if (results.failed.length > 0) {
    toast.error(`${results.failed.length} failed to approve`);
    showErrorDetails(results.failed);
  }
  
  // 6. Refetch to ensure consistency
  refetchList();
}
```

---

## 🏗️ IMPLEMENTATION ROADMAP

**Total: 23 days** (compressed: 12 days minimum viable)

| Phase | Duration | What Ships |
|-------|----------|------------|
| 0. Contracts & Registries | 2 days | Shell schemas, module/domain/surface/CRUD-SAP/function-bar registries |
| 1. Shell Foundation | 2 days | RootShell, GlobalTopBar, LeftModuleRail |
| 2. Domain Burger | 2 days | DomainBurgerPopover with search, recent, pinned |
| 3. CRUD-SAP Rail | 2 days | CrudSapRail (collapsed/peek/expanded/drawer modes) |
| 4. Workspace Patterns | 3 days | OperationalListWorkspace, RecordWorkspace, SplitWorkspace, AnalyticsWorkspace |
| 5. **Function Bars** | **3 days** | **ListFunctionBar, RecordFunctionBar, Export/Print/Bulk handlers** |
| 6. Professional List | 2 days | ColumnManager, FilterBuilder, QuickFilters, keyboard nav |
| 7. Command & Sidecar | 2 days | CommandPalette (Cmd+K), ContextualSidecar |
| 8. Finance Migration | 3 days | Invoice list/detail → new shell (reference implementation) |
| 9. Governance/Admin | 2 days | Settings, audit log, custom fields → new shell |
| 10. CI Gate | 1 day | ui-shell.mjs enforces: no custom layouts, all registries complete |

---

## 🎯 KEY DELIVERABLES

### Immediate (Phases 0-5, 8, 10) — 12 days
- Unified shell with four-zone architecture
- Finance module as gold-standard reference
- Function bars with export/print/bulk actions
- CI enforcement (no ad hoc layouts)

### Full (All phases) — 23 days
- All modules migrated
- Command palette + contextual sidebars
- Professional list enhancements
- Complete registry coverage

---

## 📋 VERIFICATION CHECKLIST

**After Phase 5 (Function Bars):**
- [ ] Export CSV: respects column visibility, applies filters
- [ ] Export Excel: formatted with frozen headers, auto-width
- [ ] Export PDF: branded header, page breaks, footer
- [ ] Print: opens formatted layout, removes chrome
- [ ] Bulk approve: batch API call with idempotency
- [ ] Bulk actions: progress indicator, handles partial failures
- [ ] Function bar visibility: conditional on selection state
- [ ] Capabilities integration: actions filtered by `actionCaps`

**After Phase 10 (Complete):**
- [ ] `pnpm typecheck` — all packages clean
- [ ] CI gate: ui-shell passes (no custom layouts)
- [ ] Finance module: list/detail/dashboard migrated
- [ ] Admin/Governance: settings/audit/custom-fields migrated
- [ ] Performance: 1000-row list < 1s
- [ ] Accessibility: keyboard nav, ARIA labels, screen reader
- [ ] Mobile: drawer nav, responsive function bars

---

## ✨ WHAT MAKES THIS SPECIAL

1. **Registry-driven** — All modules/domains/surfaces/actions defined in typed registries. CI enforces.
2. **Capabilities-native** — CRUD-SAP rail + function bars resolve from existing `CapabilityResult`
3. **Metadata-compatible** — Builds on existing entity registry, FieldKit, GeneratedList/Form
4. **Truth-first** — Audit always visible, Predict starts deterministic (explainable)
5. **Institutional** — Bloomberg-style terminal feel, not playful SaaS

This shell scales to 10+ modules, 50+ domains, 200+ surfaces without rearchitecture.

---

## 🧩 SHADCN COMPONENT SELECTION & SHELL → PRIMITIVES MAPPING

All shell components MUST use shadcn primitives from `@afenda/ui`. No raw HTML elements. Enforced by `tools/gates/shadcn-enforcement.mjs`.

### Component Selection Summary

| Shell / Zone | Primary Primitives | Supporting Primitives |
|--------------|--------------------|------------------------|
| **RootShell** | SidebarProvider, SidebarInset | — |
| **GlobalTopBar** | Button, Badge, Separator, Avatar, DropdownMenu | SidebarTrigger |
| **LeftModuleRail** | Sidebar, SidebarContent, SidebarMenu, SidebarMenuButton | Tooltip, Separator |
| **DomainBurger** | CommandDialog, CommandInput, CommandList, CommandGroup, CommandItem | — |
| **CrudSapRail** | Sidebar (right), Tabs, Button, ScrollArea | Tooltip, Separator, Badge |
| **ListFunctionBar** | Button, DropdownMenu, Separator | Badge, Progress, AlertDialog |
| **RecordFunctionBar** | Button, DropdownMenu, Breadcrumb | Separator |
| **OperationalListWorkspace** | Table, Card, ScrollArea | Button, Input, Select, Checkbox |
| **RecordWorkspace** | Card, Tabs, Breadcrumb | Button, Separator |
| **SplitWorkspace** | ResizablePanelGroup, ResizablePanel, ResizableHandle | Card, ScrollArea |
| **AnalyticsWorkspace** | Card, Tabs, Chart | Skeleton, Progress |
| **CommandPalette** | CommandDialog, CommandInput, CommandList, CommandItem | — |
| **ContextualSidecar** | Sheet (right) | Tabs, Button, ScrollArea |

---

### Shell → Primitives (Detailed)

#### RootShell
| Primitive | Usage |
|-----------|-------|
| `SidebarProvider` | Root layout; manages sidebar state, mobile sheet |
| `SidebarInset` | Main content wrapper (top bar + work surface) |

#### GlobalTopBar
| Primitive | Usage |
|-----------|-------|
| `SidebarTrigger` | Toggle sidebar (mobile/collapse); uses Button internally |
| `Button` | Domains trigger, user menu trigger |
| `Badge` | Active module label |
| `Separator` | Visual dividers (vertical) |
| `Avatar`, `AvatarFallback` | User identity in header |
| `DropdownMenu` + `Trigger/Content/Item/Label/Separator` | User menu (profile, settings, logout) |

#### LeftModuleRail
| Primitive | Usage |
|-----------|-------|
| `Sidebar` | Left rail container (collapsible="none" for fixed icon rail) |
| `SidebarContent` | Scrollable rail content |
| `SidebarFooter` | Help / secondary actions |
| `SidebarGroup`, `SidebarMenu`, `SidebarMenuItem` | Module list structure |
| `SidebarMenuButton` | Icon-only module buttons |
| `Tooltip`, `TooltipTrigger`, `TooltipContent`, `TooltipProvider` | Module labels on hover |
| `Separator` | Footer divider |

#### DomainBurger (Domain/Surface Picker)
| Primitive | Usage |
|-----------|-------|
| `CommandDialog` | Modal overlay (Dialog + Command); Cmd+K style |
| `CommandInput` | Search domains/surfaces |
| `CommandList` | Scrollable results |
| `CommandGroup` | Domain grouping |
| `CommandItem` | Surface links |
| `CommandEmpty` | No-results state |

#### CrudSapRail (Right Rail — Phase 3)
| Primitive | Usage |
|-----------|-------|
| `Sidebar` (right) or `Sheet` | Rail container; Sheet for drawer mode on mobile |
| `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` | Create | Read | Update | Delete | Search | Audit | Predict |
| `Button` | Action buttons per tab |
| `ScrollArea` | Scrollable action list |
| `Tooltip` | Action labels when rail collapsed |
| `Separator` | Section dividers |
| `Badge` | Count indicators (e.g. selected records) |

#### ListFunctionBar
| Primitive | Usage |
|-----------|-------|
| `Button` | Export, Print, Templates, bulk actions |
| `DropdownMenu` | Export format (CSV/Excel/PDF), Templates submenu |
| `Separator` | Group Export | Print | Templates | Bulk |
| `Badge` | Selection count |
| `Progress` | Bulk action progress indicator |
| `AlertDialog` | Bulk action confirmation (Approve N items?, etc.) |

#### RecordFunctionBar
| Primitive | Usage |
|-----------|-------|
| `Button` | Save, Approve, Reject, etc. (from actionCaps) |
| `Breadcrumb`, `BreadcrumbList`, `BreadcrumbItem`, `BreadcrumbLink`, `BreadcrumbPage` | Entity context (Module > Domain > Record) |
| `DropdownMenu` | More actions |
| `Separator` | Action groups |

#### OperationalListWorkspace
| Primitive | Usage |
|-----------|-------|
| `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell` | Data grid (or GeneratedList which uses Table) |
| `Card`, `CardHeader`, `CardTitle`, `CardContent` | Optional list container |
| `ScrollArea` | Scrollable table body |
| `Button` | Row actions, sort headers |
| `Input` | Quick filter, search |
| `Select` | Filter dropdowns |
| `Checkbox` | Row selection |
| `Pagination` | Page navigation |

#### RecordWorkspace
| Primitive | Usage |
|-----------|-------|
| `Card`, `CardHeader`, `CardTitle`, `CardContent`, `CardFooter` | Form sections |
| `Tabs` | Multi-section forms (Header | Lines | Attachments) |
| `Breadcrumb` | Record context |
| `Button` | Form actions |
| `Separator` | Section dividers |

#### SplitWorkspace
| Primitive | Usage |
|-----------|-------|
| `ResizablePanelGroup`, `ResizablePanel`, `ResizableHandle` | Master-detail split |
| `Card` | List + detail panels |
| `ScrollArea` | Each panel scroll |

#### AnalyticsWorkspace
| Primitive | Usage |
|-----------|-------|
| `Card` | Chart containers, KPI cards |
| `Tabs` | Time range, chart type |
| `Chart` (shadcn chart) | Charts (recharts) |
| `Skeleton` | Loading state |
| `Progress` | Loading indicator |

#### CommandPalette (Cmd+K)
| Primitive | Usage |
|-----------|-------|
| `CommandDialog` | Global command overlay |
| `CommandInput` | Search |
| `CommandList`, `CommandGroup`, `CommandItem` | Results |
| `CommandEmpty` | No results |

#### ContextualSidecar
| Primitive | Usage |
|-----------|-------|
| `Sheet` | Slide-out panel (right) |
| `SheetContent`, `SheetHeader`, `SheetTitle` | Sidecar structure |
| `Tabs` | Sidecar sections |
| `Button` | Actions |
| `ScrollArea` | Scrollable content |

---

### Primitives Not Used in Shell

| Component | Reason |
|-----------|--------|
| `Accordion` | Use Tabs for shell navigation; Accordion for in-page expand/collapse |
| `Alert` | Use for inline page alerts, not shell |
| `Calendar` | FieldKit/forms only |
| `Checkbox` | List selection, FilterBuilder only |
| `Combobox` | FilterBuilder, not shell chrome |
| `Dialog` | Use CommandDialog, AlertDialog, or Sheet for shell overlays |
| `Form`, `Input`, `Label`, `Select`, etc. | Workspace content, not shell structure |
| `HoverCard` | Optional for rich previews; Tooltip preferred for shell |
| `NavigationMenu` | Not in barrel; use Sidebar + Command for shell nav |
| `Popover` | DomainBurger could use Popover instead of CommandDialog for non-modal variant |
| `RadioGroup` | Settings/preferences only |
| `Switch` | Settings only |

---

### Implementation Notes

1. **Import from `@afenda/ui`** — All shell components import primitives from the ui package barrel.
2. **Sidebar vs Sheet** — Use `Sidebar` for desktop rail; `Sheet` for mobile drawer (Sidebar already uses Sheet internally when `isMobile`).
3. **CommandDialog vs Popover** — CommandDialog for modal, keyboard-first navigation (DomainBurger, CommandPalette). Popover for lightweight, click-outside-close (e.g. column visibility).
4. **No raw HTML** — Replace `<button>`, `<input>`, `<select>`, `<label>` with Button, Input, Select, Label. Use `{/* shadcn-exempt: ... */}` only when unavoidable.

---

**Ready to proceed?** The plan is build-ready with exact component props, TypeScript types, registry schemas, wiring patterns, and shadcn primitive mappings specified.
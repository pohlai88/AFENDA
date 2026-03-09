# Component & Primitives Inventory

> Reference for examining `@afenda/ui` primitives and reusable components.  
> Use this when auditing, testing, or extending the design system.

---

## 1. Primitives (shadcn/ui base components)

Located in `packages/ui/src/components/`. All use design tokens (no hardcoded colors).

| Component | File | Purpose |
|-----------|------|---------|
| **Accordion** | `accordion.tsx` | Collapsible sections |
| **Alert** | `alert.tsx` | Inline alerts |
| **AlertDialog** | `alert-dialog.tsx` | Confirmation dialogs |
| **Avatar** | `avatar.tsx` | User avatars, fallbacks |
| **Badge** | `badge.tsx` | Status labels, counts |
| **Breadcrumb** | `breadcrumb.tsx` | Navigation breadcrumbs |
| **Button** | `button.tsx` | Primary action control (CVA: default, destructive, outline, secondary, ghost, link; sizes: xs–lg, icon variants) |
| **Calendar** | `calendar.tsx` | Date picker (react-day-picker) |
| **Card** | `card.tsx` | Content containers (Header, Title, Description, Content, Footer, Action) |
| **Checkbox** | `checkbox.tsx` | Boolean toggle |
| **Combobox** | `combobox.tsx` | Searchable select |
| **Command** | `command.tsx` | Command palette (cmdk) |
| **Dialog** | `dialog.tsx` | Modal dialogs |
| **DropdownMenu** | `dropdown-menu.tsx` | Context menus |
| **Form** | `form.tsx` | React Hook Form + Zod integration |
| **HoverCard** | `hover-card.tsx` | Hover popovers |
| **Input** | `input.tsx` | Text input |
| **InputGroup** | `input-group.tsx` | Input with addons |
| **Label** | `label.tsx` | Form labels |
| **Pagination** | `pagination.tsx` | Page navigation |
| **Popover** | `popover.tsx` | Click-triggered popovers |
| **Progress** | `progress.tsx` | Progress bar |
| **RadioGroup** | `radio-group.tsx` | Radio buttons |
| **Select** | `select.tsx` | Dropdown select |
| **Separator** | `separator.tsx` | Visual divider |
| **Sheet** | `sheet.tsx` | Slide-out panels |
| **Sidebar** | `sidebar.tsx` | App sidebar (Provider, Inset, Menu, Rail, etc.) |
| **Skeleton** | `skeleton.tsx` | Loading placeholders |
| **Switch** | `switch.tsx` | Toggle switch |
| **Table** | `table.tsx` | Data table (Header, Body, Row, Cell) |
| **Tabs** | `tabs.tsx` | Tabbed content |
| **Textarea** | `textarea.tsx` | Multi-line text |
| **ToastNotification** | `sonner.tsx` | Toast notifications |
| **Tooltip** | `tooltip.tsx` | Hover tooltips |

**Not exported:** `navigation-menu.tsx` (exists but not in barrel).

---

## 2. Field-Kit (type-specific renderers)

Located in `packages/ui/src/field-kit/kits/`. Each kit provides:
- `CellRenderer` — table cell display
- `FormWidget` — form input
- `filterOps` — filter operators
- `exportAdapter` — export value transform

| FieldType | File | Notes |
|-----------|------|-------|
| `string` | `string.tsx` | Truncation, Input, contains/eq/startsWith |
| `int` | `int.tsx` | Numeric input |
| `decimal` | `decimal.tsx` | Decimal input |
| `money` | `money.tsx` | formatMoney, amount+currency, gt/lt/between |
| `date` | `date.tsx` | Date picker |
| `datetime` | `datetime.tsx` | Date/time picker |
| `enum` | `enum.tsx` | Select |
| `relation` | `relation.tsx` | Relation display |
| `json` | `json.tsx` | JSON display |
| `bool` | `bool.tsx` | Switch/Checkbox |
| `document` | `document.tsx` | Document handling |
| `percent` | `percent.tsx` | Percent display |

**Registry:** `packages/ui/src/field-kit/registry.ts` — maps `FieldType` → kit.

---

## 3. Generated (metadata-driven components)

Located in `packages/ui/src/generated/`.

| Component | File | Purpose |
|-----------|------|---------|
| **GeneratedList** | `GeneratedList.tsx` | Metadata-driven table (columns, sort, filter, pagination, row actions) |
| **GeneratedForm** | `GeneratedForm.tsx` | Metadata-driven form (sections, fields, capabilities) |
| **FlowStepper** | `FlowStepper.tsx` | Status flow display |
| **ActionLauncher** | `ActionLauncher.tsx` | Capability-gated action buttons |
| **FieldKitErrorBoundary** | `FieldKitErrorBoundary.tsx` | Error boundary for field renderers |

These consume the **meta registry** and **field-kit** registry.

---

## 4. Shell (application layout)

Located in `packages/ui/src/shell/`.

| Component | File | Purpose |
|-----------|------|---------|
| **RootShell** | `root/RootShell.tsx` | Main layout (SidebarProvider, TopBar, ModuleRail, content) |
| **GlobalTopBar** | `global/GlobalTopBar.tsx` | Brand, module badge, Domains button, user menu |
| **LeftModuleRail** | `navigation/LeftModuleRail.tsx` | Icon-only module sidebar |
| **DomainBurger** | `navigation/DomainBurger.tsx` | CommandDialog for domain/surface navigation |

**State:** `shell/state/shell-store.ts` — Zustand store (activeModule, activeDomain, activeSurface, pinned, recent).

**Registries:** `shell/registry/` — module-registry, domain-registry, surface-registry, crud-sap-registry, function-bar-registry.

---

## 5. Meta Registry (entity metadata)

Located in `packages/ui/src/meta/`. Pure TS, no React.

| Entity | File | Purpose |
|--------|------|---------|
| `finance.ap_invoice` | `entities/finance.ap-invoice.ts` | AP invoice fields, views, actions, flow |
| `supplier.supplier` | `entities/supplier.ts` | Supplier entity |
| `gl.account` | `entities/gl.account.ts` | GL account |
| `gl.journal-entry` | `entities/gl.journal-entry.ts` | Journal entry |

**API:** `getEntityRegistration`, `getView`, `getFlow`, `getActions`, `listEntityKeys`, `applyOverlays`.

---

## 6. Utilities & Hooks

| Export | Location | Purpose |
|--------|----------|---------|
| `cn` | `lib/utils.ts` | Tailwind class merging |
| `formatMoney` | `money.ts` | Locale-aware money display |
| `useIsMobile` | `hooks/use-mobile.ts` | Responsive breakpoint |
| Icons | `icons.ts` | Lucide re-exports |

---

## 7. Design System (CSS)

Located in `packages/ui/src/styles/`.

| File | Purpose |
|------|---------|
| `_variants.css` | dark, density-*, reduce-motion, touch, high-contrast |
| `_tokens-light.css` | Light theme OKLCH tokens |
| `_tokens-dark.css` | Dark theme overrides |
| `_density.css` | Row height, radius per density |
| `_theme.css` | @theme inline (Tailwind mapping) |
| `_base.css` | Focus, selection, scrollbars, skip-to-content |
| `_utilities.css` | tabular-nums, data-text, badges, skeleton |
| `_accessibility.css` | prefers-reduced-motion, forced-colors |
| `_print.css` | Print styles |

---

## 8. Usage in Web App

| Route | Components Used |
|-------|-----------------|
| `/` (homepage) | RootShell, Card, Button, Link |
| `/finance/ap/invoices` | GeneratedList, InvoiceListClient |
| `/finance/ap/invoices/[id]` | GeneratedForm, FlowStepper, ActionLauncher, InvoiceDetailClient |
| `/governance/settings/*` | SettingsNav, Input, Label, Switch, Textarea, Card |
| `/admin/*` | Custom header, Card, Badge |
| `/auth/signin` | Input, Label, Button, Card |

---

## 9. Examination Checklist

When auditing primitives and components:

- [ ] **Button** — All variants (default, destructive, outline, ghost, link) and sizes render correctly
- [ ] **Input / Label** — Focus ring, error state, disabled state
- [ ] **Select** — Opens, closes, keyboard nav, aria attributes
- [ ] **Card** — Header, content, footer, action slot
- [ ] **Table** — Header, body, empty state
- [ ] **Field-kit** — Each type (string, money, date, enum, bool) in list + form
- [ ] **GeneratedList** — Sort, filter, pagination, row actions
- [ ] **GeneratedForm** — Sections, readonly, hidden fields
- [ ] **FlowStepper** — Status display, transitions
- [ ] **ActionLauncher** — Allowed vs denied, tooltips
- [ ] **Shell** — Module rail, domain burger, top bar
- [ ] **Design tokens** — Light/dark, density variants
- [ ] **Accessibility** — Focus order, aria-*, keyboard nav

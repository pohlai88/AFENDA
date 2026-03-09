## Plan: AFENDA UI Autogen Architecture

**TL;DR** — Build a metadata-driven UI generation system centered in `@afenda/ui`. Code-first TS registry definitions (entity/field/view/action/flow) drive runtime renderers (`<GeneratedList>`, `<GeneratedForm>`) that consume shadcn/ui primitives via a `field-kit` widget matrix. Policy results arrive as `Capabilities` props — UI never makes permission decisions. Overlays are additive typed ops scoped to org/role with deterministic conflict resolution. `finance.ap_invoice` is the reference entity proving the full pipeline. A `ui-meta` CI gate prevents chaos.

**Key decisions:**
- Autogen core lives in `@afenda/ui` (field-kit, generated components) with meta registry kept **React-free** (pure TS) for server-side reuse
- `CapabilityEngine` interface stays in `packages/core/src/policy/` (needs IAM access — boundary law)
- Metadata is code-first TS → seeded to DB later (phase 2). Runtime reads TS modules directly.
- shadcn/ui installed via CLI into `packages/ui/src/components/`
- `@afenda/contracts` extended with meta schemas (EntityDef, FieldDef, ViewDef DSL Zod types) — transport-focused, no UI-specific concepts
- Capabilities use `Record<FieldKey, "hidden"|"ro"|"rw">` shape — O(1) lookup, auditable, cacheable
- Forms bind to existing contracts command schemas — FieldDefs drive layout, not validation truth

**Review changelog (v2):**
1. Meta registry kept React-free so API can import without pulling UI deps
2. Capabilities reshaped from arrays to `Record` for O(1) access + `policyVersion`/`evaluatedAt`
3. GeneratedForm binds to contracts command schemas, not derived Zod from FieldDefs
4. Overlay model gains `priority`, `requiresBaseVersion`, `conflictPolicy` for deterministic resolution
5. View DSL gains `queryProfile` linking to existing typed API endpoints
6. CI gate gains policy coverage + UX consistency checks
7. Renderer strings in ViewDef are semantic (`"money"|"badge"`) not component names
8. Phases reordered: GeneratedList ships before GeneratedForm for faster proof
9. shadcn hardened: Tailwind content globs, peerDependencies for Radix

---

**Steps**

### Phase 0 — shadcn/ui Foundation

1. **Install shadcn/ui into `@afenda/ui`.**
   Run `npx shadcn@latest init` targeting ui. Create `components.json` at the UI package root with:
    - `tailwindCss`: pointing to `src/styles/index.css`
   - `aliases.components`: `@afenda/ui/components`
   - `aliases.utils`: `@afenda/ui/lib/utils`
   - `style`: `new-york`

2. **Install core shadcn primitives** — the minimum set the field-kit and generated views need:
   `Button`, `Input`, `Select`, `Table`, `Form`, `Card`, `Badge`, `Dialog`, `Sheet`, `Tabs`, `Skeleton`, `Tooltip`, `DropdownMenu`, `Separator`, `Label`, `Textarea`, `Switch`

3. **Add package.json exports** in package.json for each component path (`"./components/*"` or barrel re-export). Add `react-hook-form`, `@hookform/resolvers` as dependencies. Add `react`, `react-dom`, `@radix-ui/*` as **peerDependencies** (prevents version drift across apps).

4. **Harden monorepo edges:**
   - Verify Tailwind v4 content scanning includes `../../packages/ui/src/**/*.{ts,tsx}` in consuming app's build
   - Ensure `@afenda/ui` exports are stable barrels — avoid deep import churn
   - `pnpm --filter @afenda/web build` validates scanning works end-to-end

5. **Update boundary gate** — boundaries.mjs `ALLOWED_INTERNAL["packages/ui"]` stays `["@afenda/contracts"]` (no change needed — shadcn components are internal to ui package, Radix is external).

### Phase 1 — Meta Type System (contracts)

6. **Create meta contract schemas** in packages/contracts/src/meta/.
   These are Zod schemas defining the **transport shape** of entity/field/view/action/overlay metadata.
   Contracts stay UI-free: no component names, no Tailwind classes, no icon imports.

   - `entity-def.ts` — `EntityDefSchema`: `entityKey` (e.g. `"finance.ap_invoice"`), `domainKey`, `labelSingular`, `labelPlural`, `primaryFieldKey`, `recordTitleTemplate`
   - `field-def.ts` — `FieldDefSchema`: `fieldKey`, `fieldType` enum (`string|int|decimal|money|date|datetime|enum|relation|json|bool|document|percent`), `label`, `description`, `required`, `readonly`, `defaultExpr`, `relationEntityKey?`, `enumKey?`, `validationJson?`
   - `view-def.ts` — `ViewDefSchema` (discriminated union by `viewType`):
     - `ListViewDefSchema`: `columns[]` (fieldKey, renderer as semantic string enum e.g. `"money"|"badge"|"date"|"text"`, width, pin, align, format), `filters[]`, `rowActions[]`, `queryProfile` (apiEndpoint, selectFields, defaultSort — links to existing typed API routes)
     - `FormViewDefSchema`: `tabs[] → sections[] → fields[]`, `sidePanels[]`, `guards[]`, `commandSchemaRef` (string key linking to the contracts command schema this form submits)
     - `KanbanViewDefSchema` / `PivotViewDefSchema` / `CalendarViewDefSchema` (stub types for later)
   - `action-def.ts` — `ActionDefSchema`: `actionKey`, `route`, `viewKey`, `defaultContextJson`, `menuPath`
   - `overlay-def.ts` — `OverlayDefSchema`: `overlayKey`, `targetViewKey`, `patchOps[]` (typed add/hide/reorder ops), `scope` (org/role/workspace), `priority` (number — deterministic ordering), `requiresBaseVersion` (int — overlays reject if base view version doesn't match), `conflictPolicy` (`"reject"|"last-write-wins"|"merge"`), `activeFrom?`, `activeTo?`
   - `flow-def.ts` — `FlowDefSchema`: `states[]`, `transitions[]` (from, to, guard, evidenceRequired?, permission?)
   - `capability.ts` — `CapabilityResultSchema`:
     - `fieldCaps: Record<FieldKey, "hidden" | "ro" | "rw">` (O(1) field lookup)
     - `actionCaps: Record<ActionKey, { allowed: boolean; reason?: { code: string; message: string } }>` (O(1) action lookup with structured denial)
     - `policyVersion: string` (tracks which policy rules were evaluated)
     - `evaluatedAt: string` (UTC timestamp — audit trail)
     - `cacheTtlSeconds?: number` (optional — client can cache capabilities)

   Re-export all from index.ts.

   **Invariant:** renderer values in ViewDef are semantic strings (`"money"`, `"badge"`, `"date"`, `"relation"`) — the field-kit maps these to React components. Contracts never references React, shadcn, or Tailwind.

7. **Create `FieldType` enum values** as `as const` tuple in contracts (same pattern as `InvoiceStatusValues`), so DB pgEnum can import it via the existing boundary-law-allowed path.

### Phase 2 — Entity Registry (code-first, React-free)

8. **Create entity definitions directory** at `packages/ui/src/meta/entities/`.
   **Critical constraint:** meta/ directory contains **zero React imports**. Pure TS only. This allows future server-side consumers (API validation, query profiles, export logic) to import `@afenda/ui/meta` without pulling React/shadcn into the server bundle.

   Each entity gets a file that exports a typed `EntityRegistration` object:

   - `packages/ui/src/meta/entities/finance.ap-invoice.ts` — the reference entity. Defines:
     - `entityDef`: key, domain, labels, primaryField, titleTemplate
     - `fieldDefs[]`: every field from InvoiceSchema mapped to `FieldDef` (fieldType, label, required, readonly, relation)
     - `flowDef`: 7 states from `InvoiceStatusValues`, transitions with guards (submit→submitted, approve, reject, post, markPaid, void)
     - `defaultListView`: columns (invoiceNumber, supplierName, amount, currency, status, dueDate, submittedAt), filters, rowActions (approve, reject, void), `queryProfile` pointing to `GET /v1/invoices`
     - `defaultFormView`: tabs (Details, Lines, Evidence, Audit), sections, field layout, side panels, `commandSchemaRef` pointing to contracts command schemas

   Similarly for `supplier.ts`, `gl.account.ts`, `gl.journal-entry.ts` (stubs only for now).

9. **Create the entity registry** at `packages/ui/src/meta/registry.ts`.
   A typed `Map<EntityKey, EntityRegistration>` populated by importing entity definition files. Provides:
   - `getEntity(key)` → EntityDef + fields
   - `getView(entityKey, viewKey)` → resolved ViewDef (base + overlays applied)
   - `getFlow(entityKey)` → FlowDef
   - `getActions(entityKey)` → ActionDef[]

### Phase 3 — Field Capability Matrix

10. **Create field-kit directory** at `packages/ui/src/field-kit/`.
    One module per field type, each exporting a `FieldKit<T>` record:

    | FieldType | Cell Renderer | Form Widget | Filter Ops | Export |
    |---|---|---|---|---|
    | `string` | text truncation | `<Input>` | contains, eq, startsWith | raw |
    | `int` | right-aligned tnum | `<Input type="number">` | eq, gt, lt, between | raw |
    | `decimal` | tnum + locale format | `<Input>` + mask | eq, gt, lt, between | raw |
    | `money` | `formatMoney()` tnum | `<MoneyInput>` (amount + currency) | gt, lt, between | minor→major |
    | `date` | locale short date | date picker | eq, before, after, between | ISO |
    | `datetime` | locale date+time | datetime picker | before, after, between | ISO |
    | `enum` | `<Badge>` with status color | `<Select>` from values | eq, in | raw |
    | `relation` | linked display name | `<RelationPicker>` (combobox) | eq | FK |
    | `json` | code block | `<Textarea>` | — | stringify |
    | `bool` | check/x icon | `<Switch>` or checkbox | eq | raw |
    | `document` | file icon + name | `<FileUpload>` | — | URL |
    | `percent` | tnum + % | `<Input>` + % suffix | gt, lt, between | raw |

    Each field-kit module is a named export from index.ts. The registry maps `fieldType → FieldKit` at runtime.

11. **Create the `FieldKitRegistry`** at `packages/ui/src/field-kit/registry.ts`.
    Factory function: `getFieldKit(fieldType)` → returns the `{ CellRenderer, FormWidget, FilterOps, ExportAdapter, AuditPresenter }` for that type. Throws at dev-time if a type is unregistered (CI gate catches this).

### Phase 4 — Generated List (ship first for fastest proof)

12. **Create generated components directory** at `packages/ui/src/generated/`.

13. **`<GeneratedList>`** — `packages/ui/src/generated/GeneratedList.tsx`:
    - Props: `entityKey`, `viewKey?` (defaults to `"default"`), `capabilities: CapabilityResult`, `data`, `pagination`, `onSort`, `onFilter`, `onRowAction`
    - Reads `ViewDef` from registry, resolves columns → `FieldKit.CellRenderer` per column
    - Renders shadcn `<Table>` with `<TableHeader>` / `<TableBody>` / `<TableRow>` / `<TableCell>`
    - Filter bar using `FieldKit.FilterOps` per filterable column
    - Row actions rendered as `<DropdownMenu>` — visibility gated by `capabilities.actionCaps[actionKey].allowed`
    - Disabled actions show reason tooltip from `capabilities.actionCaps[actionKey].reason.message`
    - Pagination via cursor-based `<Button>` controls (matches existing `CursorPage<T>` API pattern)
    - Column headers use DS tokens (`text-muted-foreground`, `bg-surface-100`)
    - Money columns get `.tnum` utility class from DS utilities
    - Status columns use `<Badge>` with DS status tokens (`--status-draft-bg`, etc.)
    - Fields with `capabilities.fieldCaps[key] === "hidden"` are omitted from rendering

### Phase 5 — Capability Engine + API

14. **Create capability interface** in packages/core/src/policy/.
    - `capability-engine.ts` — `resolveCapabilities(ctx: PolicyContext, entityKey: string, recordId?: string)` → `CapabilityResult`
    - Generalizes existing `canApproveInvoice()`, `canPostToGL()`, `canMarkPaid()` from sod.ts into a single dispatch
    - Returns the `Record`-based `CapabilityResult`:
      - `fieldCaps: Record<FieldKey, "hidden" | "ro" | "rw">`
      - `actionCaps: Record<ActionKey, { allowed: boolean; reason?: { code: string; message: string } }>`
      - `policyVersion`, `evaluatedAt`, optional `cacheTtlSeconds`
    - For `finance.ap_invoice`: maps existing SoD rules + permission checks into field/action capabilities
    - Re-export from index.ts

15. **Create API endpoint** `GET /v1/capabilities/:entityKey/:recordId?` in routes that calls the capability engine and returns the result. This is how the web app gets permissions without importing core directly (boundary law: web → contracts + ui only).

### Phase 6 — Generated Form + Flow

16. **`<GeneratedForm>`** — `packages/ui/src/generated/GeneratedForm.tsx`:
    - Props: `entityKey`, `viewKey?`, `capabilities: CapabilityResult`, `record?` (null = create mode), `commandSchema: z.ZodType` (the existing contracts command schema), `onSubmit`, `onCancel`
    - Reads `ViewDef` from registry, resolves field layout → `FieldKit.FormWidget` per field
    - Renders shadcn `<Form>` (react-hook-form) + Zod resolver using the **passed-in command schema** (NOT derived from FieldDefs)
    - FieldDefs drive **layout and UI hints only**: required marker display, min/max input constraints, formatting, placeholder text
    - **Authoritative validation stays in contracts command schemas** — single source of truth, no drift
    - Tab layout via shadcn `<Tabs>` / `<TabsList>` / `<TabsContent>`
    - Section layout with `<Card>` containers
    - Read-only fields rendered as styled text (not disabled inputs) — via `capabilities.fieldCaps[key] === "ro"`
    - Hidden fields omitted entirely — via `capabilities.fieldCaps[key] === "hidden"`
    - Side panels (Evidence, Audit, Timeline) as `<Sheet>` drawers

17. **`<FlowStepper>`** — `packages/ui/src/generated/FlowStepper.tsx`:
    - Props: `entityKey`, `currentStatus`, `capabilities: CapabilityResult`
    - Reads `FlowDef` from registry, renders a horizontal step indicator
    - Active state highlighted with `bg-primary`, completed states with `bg-success`
    - Available transitions as `<Button>` — disabled with reason tooltip from `capabilities.actionCaps[transitionAction].reason`

18. **`<ActionLauncher>`** — `packages/ui/src/generated/ActionLauncher.tsx`:
    - Props: `actionKey`, `capabilities: CapabilityResult`
    - Resolves route + view + context from `ActionDef`
    - Renders navigation link or modal trigger depending on action type

### Phase 7 — Wire into Web App

19. **Create invoice pages** in app:
    - `finance/ap/invoices/page.tsx` — server component, fetches `GET /v1/invoices` + `GET /v1/capabilities/finance.ap_invoice`, renders `<GeneratedList>`
    - `finance/ap/invoices/[id]/page.tsx` — server component, fetches `GET /v1/invoices/:id` + capabilities, renders `<GeneratedForm>` + `<FlowStepper>`
    - `finance/ap/invoices/layout.tsx` — admin nav extension

20. **Update admin nav** in layout.tsx to include Finance section with AP Invoices link.

### Phase 8 — Overlay System

21. **Create overlay types** in contracts (step 6 already defined `OverlayDefSchema` with `priority`, `requiresBaseVersion`, `conflictPolicy`).

22. **Create overlay resolver** in `packages/ui/src/meta/overlay.ts`:
    - `applyOverlays(baseView: ViewDef, overlays: OverlayDef[])` → resolved ViewDef
    - Overlays sorted by `priority` (ascending) for deterministic resolution
    - Each overlay validated: `requiresBaseVersion` must match `baseView.version` or overlay is rejected
    - Conflict detection per `conflictPolicy`: `reject` throws, `last-write-wins` applies silently, `merge` attempts field-level merge
    - Operations: `addField`, `hideField`, `addColumn`, `reorderSection`, `addAction`, `addValidation`
    - **Non-negotiable invariants** (enforced at apply-time AND by CI gate):
      - Overlays can **hide** but cannot **delete** base fields
      - Overlays cannot change a field's `fieldType` or semantic meaning
      - Overlays cannot remove required controls (e.g., Evidence tab for posting actions)
      - Overlays cannot remove flow transitions or guards

23. **DB tables** for overlays deferred to phase 2 — for now overlays are code-defined in TS entity files alongside the base view.

### Phase 9 — CI Gate

24. **Create `tools/gates/ui-meta.mjs`** — validates:

    **Referential integrity:**
    - Every `fieldType` in every entity definition has a registered `FieldKit` handler
    - Every `fieldKey` in every view references a valid field in the entity
    - Every `viewKey` in every action references a valid view
    - Every `transition.guard.permission` in every flow references a valid `Permissions.*` key from contracts
    - Every `queryProfile.apiEndpoint` in list views references a known API route

    **Version governance:**
    - No published view has been modified without version bump (compare against git baseline)

    **Performance budgets:**
    - List views ≤ 12 columns
    - Form views ≤ 40 fields per tab

    **Policy coverage:**
    - Every flow transition action must have a capability mapping in the capability engine
    - Every "posting-like" action must require evidence + audit hooks declared in the flow

    **UX consistency (field-kit completeness):**
    - Every registered `fieldType` must have all 4 handlers: `CellRenderer`, `FormWidget`, `FilterOps` (if field is list-filterable), `ExportAdapter`
    - Every entity with a flow must have a matching policy handler in the capability engine

    **Overlay safety:**
    - Overlay patch ops validated against base view structure
    - `requiresBaseVersion` matches current base view version
    - No overlay deletes base fields or changes field types

25. **Register gate** in run-gates.mjs and add `"check:ui-meta"` script to package.json.

26. **Update boundary gate** — add `"packages/ui"` → `["@afenda/contracts"]` validation for new meta imports (already in place, no change needed).

### Phase 10 — OWNERS + Exports

27. **Add OWNERS.md** files to: `packages/ui/src/meta/`, `packages/ui/src/field-kit/`, `packages/ui/src/generated/`, `packages/ui/src/components/`, `packages/core/src/policy/`.

28. **Update package.json exports:**
    - `"./meta"` → `./src/meta/index.ts` (React-free — safe for server import)
    - `"./field-kit"` → `./src/field-kit/index.ts`
    - `"./generated"` → `./src/generated/index.ts`
    - `"./components/*"` → shadcn component barrel

29. **Update contracts index.ts** to re-export all meta schemas.

30. **Update core index.ts** to re-export policy capability engine.

---

**Verification**

- `pnpm typecheck` — all meta type schemas compile, field-kit generics resolve, generated components have no TS errors
- `node tools/gates/ui-meta.mjs` — validates entity↔field↔view↔flow↔permission referential integrity, policy coverage, UX consistency, overlay safety
- `node tools/gates/boundaries.mjs` — import direction holds (ui→contracts only, web→contracts+ui only)
- `node tools/gates/token-compliance.mjs` — generated components use DS tokens only, no hardcoded palette colors
- `pnpm --filter @afenda/web build` — all routes compile (including new finance/ap/invoices pages)
- `packages/ui/src/meta/` has **zero** React imports (grep verification)
- Manual: visit `/finance/ap/invoices` → see generated list with real data, click row → form view with flow stepper

---

**Decisions**

- **Code-first over DB-first**: metadata lives in TS modules, not Postgres tables. DB tables for overlays deferred to phase 2. Keeps full type safety + CI gate coverage.
- **Meta registry is React-free**: `packages/ui/src/meta/` contains zero React imports — pure TS entity/field/view definitions. API can import `@afenda/ui/meta` for server-side validation, query profiles, and export logic without pulling React/shadcn into the bundle. If server-side meta usage grows significantly, extract to `@afenda/meta` package.
- **Capabilities as Record, not arrays**: `fieldCaps: Record<FieldKey, "hidden"|"ro"|"rw">` and `actionCaps: Record<ActionKey, {allowed, reason?}>` — O(1) lookup, single source per field, includes `policyVersion` + `evaluatedAt` for audit trail and optional `cacheTtlSeconds` for client caching.
- **Forms bind to contracts command schemas**: `GeneratedForm` receives the existing Zod command schema (e.g. `SubmitInvoiceCommandSchema`) as a prop. FieldDefs drive layout, required markers, and UI hints only. Authoritative validation stays in contracts — single source of truth, no drift.
- **Overlay conflict resolution**: overlays carry `priority` (deterministic ordering), `requiresBaseVersion` (rejects if base changed), and `conflictPolicy` (reject/last-write-wins/merge). Non-negotiable: overlays can hide but not delete, cannot change field types, cannot remove required controls.
- **View DSL renderer strings are semantic**: column `renderer` values are `"money"|"badge"|"date"|"text"|"relation"` — never component names or CSS classes. The field-kit maps these to React components at runtime. Contracts stays UI-framework-agnostic.
- **queryProfile links to existing API routes**: each list view declares its `apiEndpoint`, `selectFields`, `defaultSort`. This maps to existing typed routes (e.g. `GET /v1/invoices`) — no generic "query-anything" endpoint. CI gate validates the endpoint reference.
- **shadcn primitives not wrappers**: field-kit widgets compose shadcn components directly (not wrapping them in another abstraction layer). This keeps the upgrade path clean.
- **Inline style for severity colors**: the `sevStyles()` pattern from insights page (color-mix from DS tokens) is the blessed approach for dynamic status coloring in generated views — no hardcoded palette.
- **`FieldKit` is an object, not a class**: aligns with the codebase's functional style (no classes anywhere in the project).
- **Overlay ops are typed, not raw JSON Patch**: `addField | hideField | addColumn | reorderSection` instead of RFC6902 — prevents breaking invariants.
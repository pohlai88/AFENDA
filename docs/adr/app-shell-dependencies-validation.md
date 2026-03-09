# App-Shell Implementation — Tools & Dependencies Validation

> **Purpose:** Validate all tools and dependencies required for the app-shell partial/placeholder implementation.  
> **Date:** March 7, 2026

---

## 1. Direct Dependencies Added

| Package | Version | Consumer | Purpose |
|---------|---------|----------|---------|
| **exceljs** | ^4.4.0 | `@afenda/web` | Excel export (frozen header, auto-width, .xlsx) |

**Status:** ✅ Installed in `pnpm-lock.yaml` (4.4.0). Resolvable at runtime (`ExcelJS.Workbook`).

---

## 2. Workspace Dependencies (Existing)

| Package | Consumer | Used For |
|---------|----------|----------|
| `@afenda/contracts` | `@afenda/web` | `FieldType` (export-utils), entity schemas |
| `@afenda/ui` | `@afenda/web` | `getView`, `getEntity`, `getFieldKit`, `RootShell`, `ShellAuthValue`, `AlertDialog`, `Progress`, `toast`, etc. |

**Status:** ✅ Both are `workspace:*` in `apps/web/package.json`.

---

## 3. Import Validation

### export-utils.ts

| Import | Source | Status |
|--------|--------|--------|
| `ExcelJS` | `exceljs` | ✅ |
| `getView`, `getEntity`, `getFieldKit` | `@afenda/ui` | ✅ (meta + field-kit) |
| `FieldType` | `@afenda/contracts` | ✅ (kernel/registry/field-type) |

### BulkActionConfirmDialog.tsx

| Import | Source | Status |
|--------|--------|--------|
| `AlertDialog`, `AlertDialogAction`, `AlertDialogCancel`, `AlertDialogContent`, `AlertDialogDescription`, `AlertDialogFooter`, `AlertDialogHeader`, `AlertDialogTitle` | `@afenda/ui` | ✅ |
| `Progress` | `@afenda/ui` | ✅ |

### ShellLayoutWrapper.tsx

| Import | Source | Status |
|--------|--------|--------|
| `usePathname` | `next/navigation` | ✅ (Next.js built-in) |
| `RootShell` | `@afenda/ui` | ✅ |
| `SyncModuleFromUrl` | `@/components/SyncModuleFromUrl` | ✅ |
| `useAuth` | `@/hooks/useAuth` | ✅ |

### useAuth.ts

| Import | Source | Status |
|--------|--------|--------|
| `ShellAuthValue` | `@afenda/ui` | ✅ (shell/context/ShellAuthContext) |

### InvoiceListClient.tsx

| Import | Source | Status |
|--------|--------|--------|
| `getExportColumns`, `downloadCsv`, `exportToExcel`, `exportToPdf` | `@/lib/export-utils` | ✅ |
| `BulkActionConfirmDialog` | `@/components/BulkActionConfirmDialog` | ✅ |

### InvoiceDetailPageClient.tsx

| Import | Source | Status |
|--------|--------|--------|
| `exportSingleRecord` | `@/lib/export-utils` | ✅ |

---

## 4. UI Package Exports (Shell / Meta / Field-Kit)

| Export | Location | Status |
|--------|----------|--------|
| `getView`, `getEntity` | `packages/ui/src/meta/registry.ts` | ✅ |
| `getFieldKit` | `packages/ui/src/field-kit/registry.ts` | ✅ |
| `ShellAuthValue`, `ShellAuthProvider`, `useShellAuth` | `packages/ui/src/shell/context/ShellAuthContext.tsx` | ✅ |
| `RootShell` | `packages/ui/src/shell/root/RootShell.tsx` | ✅ |
| `AlertDialog`, `Progress` | `packages/ui/src/components/` | ✅ |

**Note:** UI package must be built (`pnpm --filter @afenda/ui build`) for dist to include shell exports. Web typecheck passes after build.

---

## 5. Runtime Validation

| Check | Command | Result |
|-------|---------|--------|
| exceljs resolvable | `pnpm --filter @afenda/web exec node -e "require('exceljs').Workbook"` | ✅ `function` |
| Web typecheck | `pnpm --filter @afenda/web typecheck` | ✅ Pass |
| UI typecheck | `pnpm --filter @afenda/ui typecheck` | ✅ Pass |

---

## 6. Optional / Future Dependencies

| Package | Purpose | Status |
|---------|---------|--------|
| **next-auth** | Real session for `useAuth` | ✅ Wired — SessionProvider, useSession, proxy, sign-in page |
| **React-PDF** / **Puppeteer** | Rich PDF export | Not added — using HTML table + `window.print()` |

---

## 7. Summary

| Category | Status |
|----------|--------|
| **New direct deps** | exceljs only — installed |
| **Workspace deps** | @afenda/contracts, @afenda/ui — correct |
| **UI exports** | All required symbols exported |
| **Import paths** | All resolve |
| **Typecheck** | Pass |

**Conclusion:** All tools and dependencies are correctly configured. No missing or incorrect dependencies.

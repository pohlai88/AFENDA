# CI Gates & ESLint Integration

> **Purpose:** Align ESLint with CI gates to catch errors and warnings earlier (in-editor + pre-commit), reduce gate failures, and improve developer feedback.

**Date:** 2026-03-07  
**Status:** Phase 1–2 implemented | React Hooks + 3 custom rules active

---

## 1. Current State

### 1.1 CI Pipeline

| Step | Command | What runs |
|------|---------|-----------|
| **lint-typecheck** | `pnpm lint` | Turbo runs `eslint src/` in each package (api, web, worker, core, contracts, db, ui) |
| | `pnpm typecheck` | TypeScript across monorepo |
| | `pnpm format:check` | Prettier |
| **gates** | `pnpm check:all` | 18 custom gates (boundaries, shadcn, server-clock, etc.) |

**Key insight:** ESLint runs **before** gates. If ESLint catches more of what gates catch, developers get feedback in-editor and at `pnpm lint` time, before hitting `pnpm check:all`.

### 1.2 ESLint Configuration (Root `eslint.config.js`)

| Rule | Level | Scope |
|------|-------|-------|
| `@eslint/js` recommended | — | All |
| `typescript-eslint` recommended | — | `**/*.ts`, `**/*.tsx` |
| `@typescript-eslint/no-unused-vars` | warn | TS/TSX |
| `@typescript-eslint/no-explicit-any` | warn | TS/TSX |
| `@typescript-eslint/consistent-type-imports` | warn | TS/TSX |
| `no-console` | warn | TS/TSX |
| `@afenda/no-hardcoded-colors` | error | `apps/web/**/*.tsx`, `packages/ui/**/*.tsx` |
| Test files | relaxed | `**/*.test.*`, `**/__vitest_test__/**` |

### 1.3 CI Gates Inventory (18 gates)

| Gate | Purpose | Overlap with ESLint? |
|------|---------|----------------------|
| **token-compliance** | Hardcoded Tailwind colors | ✅ Yes — `no-hardcoded-colors` ESLint rule |
| **shadcn-enforcement** | Raw `<input>`, `<button>`, etc. | ❌ No — could be ESLint rule |
| **server-clock** | No `new Date()` in DB code | ❌ No — could be ESLint rule |
| **boundaries** | Import direction law | ⚠️ Partial — `eslint-plugin-import` or custom |
| **module-boundaries** | Pillar structure | ⚠️ Complex — custom rule possible |
| Others | Schema, migrations, domain, etc. | ❌ No — not AST-based |

---

## 2. Gaps & Opportunities

### 2.1 Missing ESLint Plugins (Already in Catalog)

| Plugin | In pnpm-workspace? | In eslint.config.js? | Purpose |
|--------|--------------------|---------------------|---------|
| `eslint-plugin-react-hooks` | ✅ catalog | ❌ **NO** | `rules-of-hooks`, `exhaustive-deps` — critical for React |

**Action:** Add `eslint-plugin-react-hooks` to `eslint.config.js` for `apps/web` and `packages/ui`.

### 2.2 Gates That Can Be ESLint Rules

| Gate | Feasibility | Benefit |
|------|-------------|---------|
| **server-clock** | High | Ban `new Date()` in files that import `drizzle-orm` or `@afenda/db` — editor feedback |
| **shadcn-enforcement** | High | Ban raw `<input>`, `<button>`, `<select>`, etc. in app/UI code — editor feedback |
| **token-compliance** | Done | Already covered by `no-hardcoded-colors` |
| **boundaries** | Medium | Import restrictions — complex but doable with custom rule |

### 2.3 Additional ESLint Rules to Consider

| Rule | Plugin | Purpose |
|------|--------|---------|
| `jsx-a11y/*` | `eslint-plugin-jsx-a11y` | Accessibility (AGENTS.md §13) |
| `drizzle/*` | `eslint-plugin-drizzle` | Drizzle-specific patterns (delete/update on truth tables) |
| `@typescript-eslint/no-floating-promises` | typescript-eslint | Unhandled promises |
| `@typescript-eslint/await-thenable` | typescript-eslint | Await non-Promise |
| `@typescript-eslint/no-misused-promises` | typescript-eslint | Promises in callbacks |

---

## 3. Recommended Implementation

### Phase 1 — Quick Wins (≈30 min)

1. **Add `eslint-plugin-react-hooks`** to `eslint.config.js` for React packages.
2. **Tighten `no-console`** to `error` in non-test files (or keep warn).
3. **Add `@typescript-eslint/no-floating-promises`** as `warn` for async safety.

### Phase 2 — Custom ESLint Rules (≈2–4 hrs)

4. **`@afenda/no-js-date-in-db`** — Mirror `server-clock` gate logic:
   - In files that import `drizzle-orm` or `@afenda/db`, report `new Date()`.
   - Exempt: `__vitest_test__`, `gate:allow-js-date` comment.

5. **`@afenda/no-raw-form-elements`** — Mirror `shadcn-enforcement` gate:
   - In `apps/web`, `packages/ui` (excluding `packages/ui/src/components/`), report raw `<input>`, `<button>`, `<select>`, `<textarea>`, `<label>`.
   - Exempt: `shadcn-exempt` comment, test files.

### Phase 3 — Optional Enhancements

6. **`eslint-plugin-jsx-a11y`** — Accessibility rules.
7. **`eslint-plugin-drizzle`** — Drizzle best practices.
8. **Import boundaries** — Custom rule or `eslint-plugin-import` with `no-restricted-imports` for package-level rules.

---

## 4. Implementation Details

### 4.1 Add React Hooks Plugin

```javascript
// eslint.config.js
import reactHooks from "eslint-plugin-react-hooks";

// In config for apps/web, packages/ui:
{
  files: ["apps/web/**/*.tsx", "packages/ui/**/*.tsx"],
  plugins: { "react-hooks": reactHooks },
  rules: {
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "warn",
  },
},
```

### 4.2 Custom Rule: `no-js-date-in-db`

**File:** `tools/eslint/no-js-date-in-db.mjs`

- On `NewExpression` with `callee.name === "Date"` and no arguments or one argument.
- Check if file imports `drizzle-orm` or `@afenda/db` (via `context.getSourceCode().ast` or scope analysis).
- Skip if path includes `__vitest_test__` or line has `// gate:allow-js-date`.
- Report: "Use sql`now()` from drizzle-orm instead of new Date() for DB timestamps."

### 4.3 Custom Rule: `no-raw-form-elements`

**File:** `tools/eslint/no-raw-form-elements.mjs`

- On `JSXOpeningElement` for `input`, `button`, `select`, `textarea`, `label`.
- Skip if in `packages/ui/src/components/`.
- Skip if `shadcn-exempt` in preceding comment.
- Skip test files.
- Report: "Use <Input> from @afenda/ui instead of raw <input>."

---

## 5. Gate vs ESLint Strategy

| Concern | Gate | ESLint | Rationale |
|---------|------|--------|-----------|
| Hardcoded colors | token-compliance | no-hardcoded-colors | Both: gate for CI, ESLint for editor |
| Raw form elements | shadcn-enforcement | no-raw-form-elements | Both: gate for comprehensive scan, ESLint for editor |
| new Date() in DB code | server-clock | no-js-date-in-db | Both: gate for CI, ESLint for editor |
| Import boundaries | boundaries | Optional custom | Gate is authoritative; ESLint can provide early signal |
| React hooks | — | react-hooks | ESLint only (no gate) |

**Principle:** ESLint rules provide **fast, in-editor feedback**. Gates remain the **authoritative CI check** for complex or cross-file logic. Duplication is acceptable when it improves DX.

---

## 6. Checklist for Implementation

- [x] Add `eslint-plugin-react-hooks` to `eslint.config.js` ✅
- [x] Create `tools/eslint/no-js-date-in-db.mjs` ✅
- [x] Create `tools/eslint/no-raw-form-elements.mjs` ✅
- [x] Register custom rules in `eslint.config.js` ✅
- [x] Ensure `pnpm lint` runs in CI (already does) ✅
- [x] Add type-aware rules (no-floating-promises, no-misused-promises, await-thenable) ✅
- [x] Add `eslint-plugin-jsx-a11y` for accessibility ✅
- [x] Add `eslint-plugin-drizzle` (enforce-delete-with-where, enforce-update-with-where) ✅

---

## 7. References

- **ESLint config:** `eslint.config.js`
- **Custom rules:** `tools/eslint/`
- **Gates:** `tools/gates/`, `tools/run-gates.mjs`
- **CI:** `.github/workflows/ci.yml`
- **AGENTS.md:** §7 CI Gates, §6 UI Components

// @ts-check
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import prettierConfig from "eslint-config-prettier";
import reactHooks from "eslint-plugin-react-hooks";
import jsxA11y from "eslint-plugin-jsx-a11y";
import drizzle from "eslint-plugin-drizzle";
import noHardcodedColors from "./tools/eslint/no-hardcoded-colors.mjs";
import noJsDateInDb from "./tools/eslint/no-js-date-in-db.mjs";
import noRawFormElements from "./tools/eslint/no-raw-form-elements.mjs";
import { rule as noNoncanonicalTailwind } from "./tools/eslint/no-noncanonical-tailwind.mjs";

export default tseslint.config(
  // ── Global ignores ──────────────────────────────────────────────────────────
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.next/**",
      "**/drizzle/**",
      "**/coverage/**",
      "**/playwright-report/**",
      "**/test-results/**",
    ],
  },

  // ── Base JS recommended rules ──────────────────────────────────────────────
  eslint.configs.recommended,

  // ── TypeScript recommended ─────────────────────────────────────────────────
  ...tseslint.configs.recommended,

  // ── Type-aware linting (projectService auto-detects tsconfig per file) ──────
  {
    files: [
      "apps/**/*.ts",
      "apps/**/*.tsx",
      "packages/core/**/*.ts",
      "packages/db/**/*.ts",
      "packages/ui/**/*.ts",
      "packages/ui/**/*.tsx",
    ],
    ignores: ["**/__vitest_test__/**", "**/__e2e_test__/**", "**/*.test.ts", "**/*.test.tsx"],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/no-floating-promises": "warn",
      "@typescript-eslint/no-misused-promises": "warn",
      "@typescript-eslint/await-thenable": "warn",
    },
  },

  // ── Project-wide overrides ─────────────────────────────────────────────────
  {
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      // Allow unused vars prefixed with _ (common convention)
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],

      // Allow explicit any in quick prototyping — tighten in Sprint 2
      "@typescript-eslint/no-explicit-any": "warn",

      // Enforce consistent type-only imports (tree-shaking + clarity)
      "@typescript-eslint/consistent-type-imports": [
        "warn",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],

      // Forbid console.* — use Pino logger instead
      "no-console": ["warn", { allow: ["warn", "error"] }],

      // Reduce noise on intentional as const (e.g. ERR literal maps)
      "@typescript-eslint/no-unnecessary-type-assertion": "off",
      "@typescript-eslint/prefer-as-const": "off",
    },
  },

  // ── Accessibility (jsx-a11y) for React/JSX ───────────────────────────────
  {
    ...jsxA11y.flatConfigs.recommended,
    files: ["apps/web/**/*.tsx", "packages/ui/**/*.tsx"],
    ignores: ["**/*.test.tsx", "**/__vitest_test__/**", "packages/ui/src/components/**"],
  },

  // ── Drizzle: enforce .where() on delete/update (prevents accidental full-table ops) ─
  {
    files: ["packages/core/src/**/*.ts", "packages/db/src/**/*.ts", "apps/api/src/**/*.ts"],
    ignores: ["**/__vitest_test__/**", "**/__e2e_test__/**"],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: { drizzle },
    rules: {
      "drizzle/enforce-delete-with-where": ["error", { drizzleObjectName: ["db", "tx"] }],
      "drizzle/enforce-update-with-where": ["error", { drizzleObjectName: ["db", "tx"] }],
    },
  },

  // ── React Hooks (apps/web, packages/ui) ────────────────────────────────────
  {
    files: ["apps/web/**/*.ts", "apps/web/**/*.tsx", "packages/ui/**/*.ts", "packages/ui/**/*.tsx"],
    ignores: ["**/*.test.ts", "**/*.test.tsx", "**/__vitest_test__/**"],
    plugins: { "react-hooks": reactHooks },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },

  // ── @afenda custom rules (register plugin) ────────────────────────────────
  {
    plugins: {
      "@afenda": {
        rules: {
          "no-hardcoded-colors": noHardcodedColors,
          "no-raw-form-elements": noRawFormElements,
          "no-js-date-in-db": noJsDateInDb,
          "no-noncanonical-tailwind": noNoncanonicalTailwind,
        },
      },
    },
  },

  // ── Design-system: tokens + shadcn (apps/web, packages/ui) ───────────────
  {
    files: ["apps/web/**/*.tsx", "packages/ui/**/*.tsx"],
    ignores: ["**/*.test.tsx", "**/__vitest_test__/**", "packages/ui/src/components/**"],
    rules: {
      "@afenda/no-hardcoded-colors": "error",
      "@afenda/no-raw-form-elements": "error",
      "@afenda/no-noncanonical-tailwind": "warn",
    },
  },

  // ── Server clock: no new Date() in DB code (core, api, worker) ────────────
  {
    files: ["packages/core/src/**/*.ts", "apps/api/src/**/*.ts", "apps/worker/src/**/*.ts"],
    ignores: ["**/__vitest_test__/**", "**/__e2e_test__/**"],
    rules: {
      "@afenda/no-js-date-in-db": "error",
    },
  },

  // ── Test files — relax rules that hinder test ergonomics ───────────────────
  {
    files: ["**/*.test.ts", "**/*.test.tsx", "**/__vitest_test__/**"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "no-console": "off",
    },
  },

  // ── Prettier compat (must be last) ─────────────────────────────────────────
  prettierConfig,
);

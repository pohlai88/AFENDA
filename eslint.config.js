// @ts-check
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import prettierConfig from "eslint-config-prettier";

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

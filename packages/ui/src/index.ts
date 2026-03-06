// Design system exports (shadcn/ui based)

// Placeholder — Sprint 0 just proves the package exists in the workspace
export const UI_VERSION = "0.0.0";

// ── Money formatting (locale-aware display) ───────────────────────────────────
export { formatMoney } from "./money";

// ── Shared utilities ─────────────────────────────────────────────────────────
export { cn } from "./lib/utils";

// ── shadcn/ui component re-exports ───────────────────────────────────────────
export * from "./components/index";

// ── Meta registry (React-free entity/field/view metadata) ────────────────────
export * from "./meta/index";

// ── Field-kit (cell renderers, form widgets, filter ops) ─────────────────────
export * from "./field-kit/index";

// ── Generated components (metadata-driven UI) ────────────────────────────────
export * from "./generated/index";

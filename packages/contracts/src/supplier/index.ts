/**
 * Barrel — re-exports every supplier schema from `contracts/supplier`.
 *
 * RULES:
 *   1. Exports only — no imports that execute code, no side effects, no logic.
 *   2. Entity schemas first (SupplierSchema), then commands.
 *   3. Consumers must import from `@afenda/contracts`, never from deep paths.
 */
export * from "./supplier.entity.js";
export * from "./supplier.commands.js";

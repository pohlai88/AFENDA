/**
 * Barrel — re-exports every invoice schema from `contracts/invoice`.
 *
 * RULES:
 *   1. Exports only — no imports that execute code, no side effects, no logic.
 *   2. Entity schemas first (InvoiceSchema), then commands.
 *   3. Consumers must import from `@afenda/contracts`, never from deep paths.
 */
export * from "./invoice.entity.js";
export * from "./invoice.commands.js";

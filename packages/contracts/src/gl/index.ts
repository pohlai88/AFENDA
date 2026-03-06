/**
 * Barrel — re-exports every GL schema from `contracts/gl`.
 *
 * RULES:
 *   1. Exports only — no imports that execute code, no side effects, no logic.
 *   2. Entity schemas first (AccountSchema), then commands.
 *   3. Consumers must import from `@afenda/contracts`, never from deep paths.
 */
export * from "./account.entity.js";
export * from "./journal-entry.entity.js";
export * from "./gl.commands.js";

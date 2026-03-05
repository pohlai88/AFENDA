/**
 * Barrel — re-exports every evidence schema from `contracts/evidence`.
 *
 * RULES:
 *   1. Exports only — no imports that execute code, no side effects, no logic.
 *   2. Entity schemas first (DocumentSchema, EvidenceTargetSchema, EvidenceLinkSchema),
 *      then command schemas that may depend on them.
 *   3. Consumers must import from `@afenda/contracts`, never from deep paths.
 */
export * from "./evidence.entity.js";
export * from "./evidence.commands.js";

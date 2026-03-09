/**
 * Sequence entity types — closed set of entities that use gap-free numbering.
 *
 * Adding a new value requires:
 *   1. Add the literal to `SequenceEntityTypeValues` below.
 *   2. Seed a sequence row for every existing org (migration).
 *   3. Coordinate with OWNERS of the domain that uses the new entity type.
 */

export const SequenceEntityTypeValues = [
  "invoice",
  "journalEntry",
  "payment",
  "paymentRun",
  "supplier",
  "purchaseOrder",
  "receipt",
] as const;

export type SequenceEntityType = (typeof SequenceEntityTypeValues)[number];

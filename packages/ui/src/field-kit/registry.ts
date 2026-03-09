/**
 * FieldKit Registry — maps FieldType → FieldKit handler.
 *
 * RULES:
 *   1. Every FieldType from contracts must have a handler.
 *      The ui-meta CI gate enforces this at build time.
 *   2. `getFieldKit(type)` throws if a type is unregistered —
 *      fail fast during development.
 */
import type { FieldType } from "@afenda/contracts";
import type { FieldKit } from "./types";
import {
  stringKit,
  intKit,
  decimalKit,
  moneyKit,
  dateKit,
  datetimeKit,
  enumKit,
  relationKit,
  jsonKit,
  boolKit,
  nullableBoolKit,
  documentKit,
  createDocumentKit,
  percentKit,
  type DocumentRef,
  type DocumentUploadAdapter,
  type DocumentFieldMeta,
} from "./kits";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const REGISTRY: Record<FieldType, FieldKit<any>> = {
  string: stringKit,
  int: intKit,
  decimal: decimalKit,
  money: moneyKit,
  date: dateKit,
  datetime: datetimeKit,
  enum: enumKit,
  relation: relationKit,
  json: jsonKit,
  bool: boolKit,
  nullableBool: nullableBoolKit,
  document: documentKit,
  percent: percentKit,
};

/**
 * Get the FieldKit handler for a given field type.
 * Throws if the type is not registered.
 */
export function getFieldKit<T = unknown>(fieldType: FieldType): FieldKit<T> {
  const kit = REGISTRY[fieldType];
  if (!kit) {
    throw new Error(`[field-kit] No handler registered for field type: "${fieldType}"`);
  }
  return kit as FieldKit<T>;
}

/** Check whether a field type has a registered handler. */
export function hasFieldKit(fieldType: string): boolean {
  return fieldType in REGISTRY;
}

/** Register a custom document kit. Call at app startup with createDocumentKit(...). */
export function registerDocumentKit(
  kit: FieldKit<DocumentRef | null>,
): void {
  REGISTRY.document = kit as FieldKit<unknown>;
}

export {
  createDocumentKit,
  type DocumentRef,
  type DocumentUploadAdapter,
  type DocumentFieldMeta,
};

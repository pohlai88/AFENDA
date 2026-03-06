/**
 * FieldKit Registry — maps FieldType → FieldKit handler.
 *
 * RULES:
 *   1. Every FieldType from contracts/meta must have a handler.
 *      The ui-meta CI gate enforces this at build time.
 *   2. `getFieldKit(type)` throws if a type is unregistered —
 *      fail fast during development.
 */
import type { FieldType } from "@afenda/contracts";
import type { FieldKit } from "./types";
import { stringKit } from "./kits/string";
import { intKit } from "./kits/int";
import { decimalKit } from "./kits/decimal";
import { moneyKit } from "./kits/money";
import { dateKit } from "./kits/date";
import { datetimeKit } from "./kits/datetime";
import { enumKit } from "./kits/enum";
import { relationKit } from "./kits/relation";
import { jsonKit } from "./kits/json";
import { boolKit } from "./kits/bool";
import { documentKit } from "./kits/document";
import { percentKit } from "./kits/percent";

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

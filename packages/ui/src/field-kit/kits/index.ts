/**
 * Field kit barrel — re-exports all kits for registry and consumers.
 *
 * RULES:
 * - Every FieldType in @afenda/contracts must have a kit here
 * - Registry imports from this barrel for single source of truth
 */
export { stringKit } from "./string";
export { intKit } from "./int";
export { decimalKit } from "./decimal";
export { moneyKit } from "./money";
export { dateKit } from "./date";
export { datetimeKit } from "./datetime";
export { enumKit } from "./enum";
export { relationKit } from "./relation";
export { jsonKit } from "./json";
export { boolKit } from "./bool";
export { nullableBoolKit } from "./nullable-bool";
export {
  documentKit,
  createDocumentKit,
  type DocumentRef,
  type DocumentUploadAdapter,
  type DocumentFieldMeta,
} from "./document";
export { percentKit } from "./percent";

/**
 * Barrel — re-exports field-kit types and registry.
 */
export type { FieldKit, CellRendererProps, FormWidgetProps, FilterOp, ExportAdapter, AuditPresenterProps } from "./types";
export {
  getFieldKit,
  hasFieldKit,
  registerDocumentKit,
  createDocumentKit,
  type DocumentRef,
  type DocumentUploadAdapter,
  type DocumentFieldMeta,
} from "./registry";

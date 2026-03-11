/**
 * Document domain — evidence registration, entity linking, file metadata.
 *
 * Auto-instrumented: every function call produces an OTel span `evidence.<fn_name>`.
 * S1+ growth: retention policies, virus-scan integration, thumbnail generation.
 */
import { instrumentService } from "../../infrastructure/tracing";
import * as rawRegistry from "./evidence.registry";
import * as rawLink from "./evidence.link";

// Policy module is mostly types + constants — re-export directly
export * from "./evidence.policy";

// Error class — re-export directly (not a callable function)
export { RegisterDocumentError } from "./evidence.registry";

// Types — compile-time only
export type {
  RegisterDocumentParams,
  RegisterDocumentOptions,
  RegisterDocumentAuth,
  RegisterDocumentResult,
  RegisterDocumentWithAudit,
  RegisterDocumentErrorCode,
} from "./evidence.registry";
export type { AttachEvidenceParams } from "./evidence.link";

// Queries — not instrumented (read-only, low cardinality)
export { listDocuments } from "./evidence.queries";
export type { DocumentListRow, ListDocumentsParams } from "./evidence.queries";

// Functions — auto-wrapped with OTel spans
const instrumented = instrumentService("evidence", { ...rawRegistry, ...rawLink });

export const {
  registerDocument,
  getDocumentIdBySha256,
  attachEvidence,
} = instrumented;

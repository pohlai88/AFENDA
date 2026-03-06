/**
 * Document domain — evidence registration, entity linking, file metadata.
 *
 * Auto-instrumented: every function call produces an OTel span `evidence.<fn_name>`.
 * S1+ growth: retention policies, virus-scan integration, thumbnail generation.
 */
import { instrumentService } from "../infra/tracing.js";
import * as rawRegistry from "./evidence.registry.js";
import * as rawLink from "./evidence.link.js";

// Policy module is mostly types + constants — re-export directly
export * from "./evidence.policy.js";

// Error class — re-export directly (not a callable function)
export { RegisterDocumentError } from "./evidence.registry.js";

// Types — compile-time only
export type {
  RegisterDocumentParams,
  RegisterDocumentOptions,
  RegisterDocumentAuth,
  RegisterDocumentResult,
  RegisterDocumentWithAudit,
  RegisterDocumentErrorCode,
} from "./evidence.registry.js";
export type { AttachEvidenceParams } from "./evidence.link.js";

// Functions — auto-wrapped with OTel spans
const instrumented = instrumentService("evidence", { ...rawRegistry, ...rawLink });

export const {
  registerDocument,
  getDocumentIdBySha256,
  attachEvidence,
} = instrumented;

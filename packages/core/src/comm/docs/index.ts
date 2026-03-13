import { instrumentService } from "../../kernel/infrastructure/tracing";
import * as rawDocumentService from "./document.service.js";
import * as rawDocumentQueries from "./document.queries.js";

export type {
  CommDocumentPolicyContext,
  CommDocumentServiceError,
  CommDocumentServiceResult,
} from "./document.service.js";
export type {
  DocumentRow,
  DocumentVersionRow,
  DocumentListParams,
  CollaboratorRow,
} from "./document.queries.js";

const instrumented = instrumentService("comm.docs", {
  ...rawDocumentService,
  ...rawDocumentQueries,
});

export const {
  createDocument,
  updateDocument,
  publishDocument,
  archiveDocument,
  addDocumentCollaborator,
  removeDocumentCollaborator,
  listCommDocuments,
  getDocumentById,
  getDocumentBySlug,
  listChildDocuments,
  getDocumentBreadcrumb,
  listDocumentVersions,
  listDocumentCollaborators,
  findCollaborator,
} = instrumented;

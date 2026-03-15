import { z } from "zod";
import { DateSchema } from "../../shared/datetime.js";
import { PrincipalIdSchema } from "../../shared/ids.js";
import {
  applyDateOrderRefinement,
  CommListLimitSchema,
  CommQueryTextSchema,
  CommSearchLimitSchema,
} from "../shared/query.js";
import { makeCommDetailResponseSchema, makeCommListResponseSchema, makeCommSearchResponseSchema } from "../shared/response.js";
import {
  CollaboratorRoleSchema,
  CommDocumentCollaboratorSchema,
  CommDocumentIdSchema,
  CommDocumentSchema,
  CommDocumentSlugSchema,
  CommDocumentStatusSchema,
  CommDocumentTypeSchema,
  CommDocumentVersionIdSchema,
  CommDocumentVersionSchema,
  CommDocumentVisibilitySchema,
} from "./document.entity.js";

export const GetCommDocumentQuerySchema = z.object({
  documentId: CommDocumentIdSchema,
});

export const GetCommDocumentBySlugQuerySchema = z.object({
  slug: CommDocumentSlugSchema,
});

export const ListCommDocumentsQuerySchema = z
  .object({
    status: CommDocumentStatusSchema.optional(),
    documentType: CommDocumentTypeSchema.optional(),
    visibility: CommDocumentVisibilitySchema.optional(),
    parentDocId: CommDocumentIdSchema.optional(),
    updatedBefore: DateSchema.optional(),
    updatedAfter: DateSchema.optional(),
    limit: CommListLimitSchema,
    cursor: CommDocumentIdSchema.optional(),
  })
  .superRefine((data, ctx) => {
    applyDateOrderRefinement(data, ctx, {
      fromKey: "updatedAfter",
      toKey: "updatedBefore",
      message: "updatedBefore must be on or after updatedAfter.",
      path: ["updatedBefore"],
    });
  });

export const SearchCommDocumentsQuerySchema = z.object({
  query: CommQueryTextSchema,
  status: CommDocumentStatusSchema.optional(),
  documentType: CommDocumentTypeSchema.optional(),
  visibility: CommDocumentVisibilitySchema.optional(),
  limit: CommSearchLimitSchema,
});

export const ListCommDocumentVersionsQuerySchema = z.object({
  documentId: CommDocumentIdSchema,
  limit: CommListLimitSchema,
  cursor: CommDocumentVersionIdSchema.optional(),
});

export const ListCommDocumentCollaboratorsQuerySchema = z.object({
  documentId: CommDocumentIdSchema,
  role: CollaboratorRoleSchema.optional(),
  limit: CommListLimitSchema,
  cursor: PrincipalIdSchema.optional(),
});

export const GetCommDocumentResponseSchema = makeCommDetailResponseSchema(CommDocumentSchema);
export const ListCommDocumentsResponseSchema = makeCommListResponseSchema(CommDocumentSchema);
export const SearchCommDocumentsResponseSchema = makeCommSearchResponseSchema(CommDocumentSchema);
export const ListCommDocumentVersionsResponseSchema =
  makeCommListResponseSchema(CommDocumentVersionSchema);
export const ListCommDocumentCollaboratorsResponseSchema = makeCommListResponseSchema(
  CommDocumentCollaboratorSchema,
);

export type GetCommDocumentResponse = z.infer<typeof GetCommDocumentResponseSchema>;
export type GetCommDocumentQuery = z.infer<typeof GetCommDocumentQuerySchema>;
export type GetCommDocumentBySlugQuery = z.infer<typeof GetCommDocumentBySlugQuerySchema>;
export type ListCommDocumentsQuery = z.infer<typeof ListCommDocumentsQuerySchema>;
export type SearchCommDocumentsQuery = z.infer<typeof SearchCommDocumentsQuerySchema>;
export type ListCommDocumentVersionsQuery = z.infer<typeof ListCommDocumentVersionsQuerySchema>;
export type ListCommDocumentCollaboratorsQuery = z.infer<
  typeof ListCommDocumentCollaboratorsQuerySchema
>;
export type ListCommDocumentsResponse = z.infer<typeof ListCommDocumentsResponseSchema>;
export type SearchCommDocumentsResponse = z.infer<typeof SearchCommDocumentsResponseSchema>;
export type ListCommDocumentVersionsResponse = z.infer<
  typeof ListCommDocumentVersionsResponseSchema
>;
export type ListCommDocumentCollaboratorsResponse = z.infer<
  typeof ListCommDocumentCollaboratorsResponseSchema
>;

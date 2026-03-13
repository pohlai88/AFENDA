import { z } from "zod";
import { PrincipalIdSchema } from "../../shared/ids.js";
import { IdempotencyKeySchema } from "../../kernel/execution/idempotency/request-key.js";
import {
  CommDocumentIdSchema,
  CommDocumentSlugSchema,
  CommDocumentTypeSchema,
  CommDocumentVisibilitySchema,
  CollaboratorRoleSchema,
} from "./document.entity.js";

// ─── Reusable Field Schemas ───────────────────────────────────────────────────

const TitleSchema = z.string().trim().min(1).max(500);
const BodySchema = z.string().trim().min(1).max(100_000);

// ─── Base Command Schema ──────────────────────────────────────────────────────

const DocumentCommandBase = z.object({
  idempotencyKey: IdempotencyKeySchema,
});

// ─── Document Commands ────────────────────────────────────────────────────────

export const CreateCommDocumentCommandSchema = DocumentCommandBase.extend({
  title: TitleSchema,
  body: BodySchema,
  documentType: CommDocumentTypeSchema.optional().default("page"),
  visibility: CommDocumentVisibilitySchema.optional().default("org"),
  slug: CommDocumentSlugSchema.nullable().optional().default(null),
  parentDocId: CommDocumentIdSchema.nullable().optional().default(null),
}).superRefine((data, ctx) => {
  if (data.parentDocId && data.parentDocId === (data as { documentId?: string }).documentId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "A document cannot be its own parent.",
      path: ["parentDocId"],
    });
  }
});

export const UpdateCommDocumentCommandSchema = DocumentCommandBase.extend({
  documentId: CommDocumentIdSchema,
  title: TitleSchema.optional(),
  body: BodySchema.optional(),
  documentType: CommDocumentTypeSchema.optional(),
  visibility: CommDocumentVisibilitySchema.optional(),
  slug: CommDocumentSlugSchema.nullable().optional(),
  parentDocId: CommDocumentIdSchema.nullable().optional(),
}).superRefine((data, ctx) => {
  if (data.parentDocId && data.parentDocId === data.documentId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "A document cannot be its own parent.",
      path: ["parentDocId"],
    });
  }
});

export const PublishCommDocumentCommandSchema = DocumentCommandBase.extend({
  documentId: CommDocumentIdSchema,
});

export const ArchiveCommDocumentCommandSchema = DocumentCommandBase.extend({
  documentId: CommDocumentIdSchema,
});

export const DeleteCommDocumentCommandSchema = DocumentCommandBase.extend({
  documentId: CommDocumentIdSchema,
});

export type CreateCommDocumentCommand = z.infer<typeof CreateCommDocumentCommandSchema>;
export type UpdateCommDocumentCommand = z.infer<typeof UpdateCommDocumentCommandSchema>;
export type PublishCommDocumentCommand = z.infer<typeof PublishCommDocumentCommandSchema>;
export type ArchiveCommDocumentCommand = z.infer<typeof ArchiveCommDocumentCommandSchema>;
export type DeleteCommDocumentCommand = z.infer<typeof DeleteCommDocumentCommandSchema>;

// ─── Collaborator Commands ────────────────────────────────────────────────────

export const AddDocumentCollaboratorCommandSchema = DocumentCommandBase.extend({
  documentId: CommDocumentIdSchema,
  principalId: PrincipalIdSchema,
  role: CollaboratorRoleSchema.optional().default("editor"),
});

export const RemoveDocumentCollaboratorCommandSchema = DocumentCommandBase.extend({
  documentId: CommDocumentIdSchema,
  principalId: PrincipalIdSchema,
});

export type AddDocumentCollaboratorCommand = z.infer<typeof AddDocumentCollaboratorCommandSchema>;
export type RemoveDocumentCollaboratorCommand = z.infer<
  typeof RemoveDocumentCollaboratorCommandSchema
>;

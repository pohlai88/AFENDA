import { z } from "zod";
import { OrgIdSchema, PrincipalIdSchema, UuidSchema } from "../../shared/ids.js";
import { UtcDateTimeSchema } from "../../shared/datetime.js";

// ─── ID Brands ────────────────────────────────────────────────────────────────

/**
 * Knowledge base document ID.
 *
 * Domain-specific to comm/docs (wiki pages, SOPs, templates, policies).
 * NOT to be confused with shared/DocumentIdSchema, which represents
 * evidence/attachment documents across multiple domains (AP, supplier onboarding).
 */
export const CommDocumentIdSchema = UuidSchema.brand<"CommDocumentId">();
export const CommDocumentVersionIdSchema = UuidSchema.brand<"CommDocumentVersionId">();

// ─── Enum Values & Schemas ────────────────────────────────────────────────────

export const CommDocumentStatusValues = ["draft", "published", "archived"] as const;
export const CommDocumentStatusSchema = z.enum(CommDocumentStatusValues);

export const CommDocumentTypeValues = ["page", "wiki", "sop", "template", "policy"] as const;
export const CommDocumentTypeSchema = z.enum(CommDocumentTypeValues);

export const CommDocumentVisibilityValues = ["org", "team", "private"] as const;
export const CommDocumentVisibilitySchema = z.enum(CommDocumentVisibilityValues);

/** URL-friendly path segment, unique per org. */
export const CommDocumentSlugSchema = z
  .string()
  .trim()
  .min(1)
  .max(200)
  .regex(/^[a-z0-9_-]+$/);

// ─── Reusable Field Schemas ───────────────────────────────────────────────────

const TitleSchema = z.string().trim().min(1).max(500);
const BodySchema = z.string().trim().min(1).max(100_000);

// ─── Document Schema ──────────────────────────────────────────────────────────

export const CommDocumentSchema = z
  .object({
    id: CommDocumentIdSchema,
    orgId: OrgIdSchema,
    documentNumber: z.string().trim().min(1).max(64),
    title: TitleSchema,
    body: BodySchema,
    status: CommDocumentStatusSchema,
    documentType: CommDocumentTypeSchema,
    visibility: CommDocumentVisibilitySchema,
    slug: CommDocumentSlugSchema.nullable().default(null),
    parentDocId: CommDocumentIdSchema.nullable().default(null),
    createdByPrincipalId: PrincipalIdSchema,
    lastEditedByPrincipalId: PrincipalIdSchema.nullable().default(null),
    publishedAt: UtcDateTimeSchema.nullable().default(null),
    publishedByPrincipalId: PrincipalIdSchema.nullable().default(null),
    createdAt: UtcDateTimeSchema,
    updatedAt: UtcDateTimeSchema,
  })
  .superRefine((data, ctx) => {
    if (data.parentDocId && data.parentDocId === data.id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "A document cannot be its own parent.",
        path: ["parentDocId"],
      });
    }
    if (data.status === "published") {
      if (!data.publishedAt) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Published documents must include publishedAt.",
          path: ["publishedAt"],
        });
      }
      if (!data.publishedByPrincipalId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Published documents must include publishedByPrincipalId.",
          path: ["publishedByPrincipalId"],
        });
      }
    }
  });

// ─── Document Version Schema ──────────────────────────────────────────────────

export const CommDocumentVersionSchema = z.object({
  id: CommDocumentVersionIdSchema,
  orgId: OrgIdSchema,
  documentId: CommDocumentIdSchema,
  versionNumber: z.number().int().positive(),
  title: TitleSchema,
  body: BodySchema,
  createdByPrincipalId: PrincipalIdSchema,
  createdAt: UtcDateTimeSchema,
});

// ─── Document Collaborator ────────────────────────────────────────────────────

export const CollaboratorRoleValues = ["editor", "viewer", "admin"] as const;
export type CollaboratorRole = (typeof CollaboratorRoleValues)[number];
export const CollaboratorRoleSchema = z.enum(CollaboratorRoleValues);

export const CommDocumentCollaboratorSchema = z.object({
  documentId: CommDocumentIdSchema,
  orgId: OrgIdSchema,
  principalId: PrincipalIdSchema,
  role: CollaboratorRoleSchema,
  addedByPrincipalId: PrincipalIdSchema,
  addedAt: UtcDateTimeSchema,
});

// ─── Types ────────────────────────────────────────────────────────────────────

export type CommDocumentCollaborator = z.infer<typeof CommDocumentCollaboratorSchema>;
export type CommDocumentId = z.infer<typeof CommDocumentIdSchema>;
export type CommDocumentVersionId = z.infer<typeof CommDocumentVersionIdSchema>;
export type CommDocumentStatus = z.infer<typeof CommDocumentStatusSchema>;
export type CommDocumentType = z.infer<typeof CommDocumentTypeSchema>;
export type CommDocumentVisibility = z.infer<typeof CommDocumentVisibilitySchema>;
export type CommDocument = z.infer<typeof CommDocumentSchema>;
export type CommDocumentVersion = z.infer<typeof CommDocumentVersionSchema>;

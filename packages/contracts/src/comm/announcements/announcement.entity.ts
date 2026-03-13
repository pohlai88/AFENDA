import { z } from "zod";
import { OrgIdSchema, PrincipalIdSchema, UuidSchema } from "../../shared/ids.js";
import { UtcDateTimeSchema } from "../../shared/datetime.js";

/** ID brands */
export const AnnouncementIdSchema = UuidSchema.brand<"AnnouncementId">();
export const AnnouncementReadIdSchema = UuidSchema.brand<"AnnouncementReadId">();

/** Literal value sets */
export const AnnouncementStatusValues = ["draft", "scheduled", "published", "archived"] as const;
export const AnnouncementAudienceTypeValues = ["org", "team", "role"] as const;

export const AnnouncementStatusSchema = z.enum(AnnouncementStatusValues);
export const AnnouncementAudienceTypeSchema = z.enum(AnnouncementAudienceTypeValues);

/** Reusable small schemas */
const AnnouncementNumberSchema = z.string().trim().min(1).max(64);
const TitleSchema = z.string().trim().min(1).max(500);
const BodySchema = z.string().trim().min(1).max(50_000);
const UuidArraySchema = z.array(UuidSchema).optional().default([]);

/** Shared audience validation — reused across Create, Update, and the core schema */
function validateAudience(
  data: { audienceType: string; audienceIds?: string[] },
  ctx: z.RefinementCtx,
) {
  const idsCount = data.audienceIds?.length ?? 0;

  if (data.audienceType === "org" && idsCount > 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "When audienceType is 'org', audienceIds must be empty.",
      path: ["audienceIds"],
    });
  }

  if (["team", "role"].includes(data.audienceType) && idsCount === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "When audienceType is 'team' or 'role', audienceIds must contain at least one id.",
      path: ["audienceIds"],
    });
  }
}

/** Core announcement shape (server persisted) */
export const AnnouncementSchema = z
  .object({
    id: AnnouncementIdSchema,
    orgId: OrgIdSchema,
    announcementNumber: AnnouncementNumberSchema,
    title: TitleSchema,
    body: BodySchema,
    status: AnnouncementStatusSchema,
    audienceType: AnnouncementAudienceTypeSchema,
    /** UUIDs of teams or roles; empty array means all-org */
    audienceIds: UuidArraySchema,
    scheduledAt: UtcDateTimeSchema.nullable(),
    publishedAt: UtcDateTimeSchema.nullable(),
    publishedByPrincipalId: PrincipalIdSchema.nullable(),
    createdByPrincipalId: PrincipalIdSchema,
    createdAt: UtcDateTimeSchema,
    updatedAt: UtcDateTimeSchema,
  })
  .superRefine((data, ctx) => {
    validateAudience(data, ctx);

    if (data.status === "scheduled" && !data.scheduledAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Scheduled announcements must include scheduledAt.",
        path: ["scheduledAt"],
      });
    }

    if (data.status === "published") {
      if (!data.publishedAt) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Published announcements must include publishedAt.",
          path: ["publishedAt"],
        });
      }
      if (!data.publishedByPrincipalId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Published announcements must include publishedByPrincipalId.",
          path: ["publishedByPrincipalId"],
        });
      }
    }
  });

/** Create schema (client -> server). Server generates id, timestamps. */
export const AnnouncementCreateSchema = z
  .object({
    orgId: OrgIdSchema,
    announcementNumber: AnnouncementNumberSchema,
    title: TitleSchema,
    body: BodySchema,
    status: AnnouncementStatusSchema.optional().default("draft"),
    audienceType: AnnouncementAudienceTypeSchema,
    audienceIds: UuidArraySchema,
    scheduledAt: UtcDateTimeSchema.nullable().optional().default(null),
    publishedAt: UtcDateTimeSchema.nullable().optional().default(null),
    publishedByPrincipalId: PrincipalIdSchema.nullable().optional().default(null),
    createdByPrincipalId: PrincipalIdSchema,
  })
  .superRefine((data, ctx) => {
    validateAudience(data, ctx);

    if (data.status === "scheduled" && !data.scheduledAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Scheduled announcements must include scheduledAt.",
        path: ["scheduledAt"],
      });
    }
  });

/** Update schema (partial updates allowed) */
export const AnnouncementUpdateSchema = z
  .object({
    announcementNumber: AnnouncementNumberSchema.optional(),
    title: TitleSchema.optional(),
    body: BodySchema.optional(),
    status: AnnouncementStatusSchema.optional(),
    audienceType: AnnouncementAudienceTypeSchema.optional(),
    audienceIds: UuidArraySchema.optional(),
    scheduledAt: UtcDateTimeSchema.nullable().optional(),
    publishedAt: UtcDateTimeSchema.nullable().optional(),
    publishedByPrincipalId: PrincipalIdSchema.nullable().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.audienceType && data.audienceIds !== undefined) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      validateAudience(data as any, ctx);
    }
  });

/** AnnouncementRead */
export const AnnouncementReadSchema = z.object({
  id: AnnouncementReadIdSchema,
  orgId: OrgIdSchema,
  announcementId: AnnouncementIdSchema,
  principalId: PrincipalIdSchema,
  acknowledgedAt: UtcDateTimeSchema,
  createdAt: UtcDateTimeSchema,
});

/** Types */
export type AnnouncementId = z.infer<typeof AnnouncementIdSchema>;
export type AnnouncementReadId = z.infer<typeof AnnouncementReadIdSchema>;
export type AnnouncementStatus = z.infer<typeof AnnouncementStatusSchema>;
export type AnnouncementAudienceType = z.infer<typeof AnnouncementAudienceTypeSchema>;
export type Announcement = z.infer<typeof AnnouncementSchema>;
export type AnnouncementCreate = z.infer<typeof AnnouncementCreateSchema>;
export type AnnouncementUpdate = z.infer<typeof AnnouncementUpdateSchema>;
export type AnnouncementRead = z.infer<typeof AnnouncementReadSchema>;

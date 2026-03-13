import { z } from "zod";
import { OrgIdSchema, PrincipalIdSchema, UuidSchema } from "../../shared/ids.js";
import { UtcDateTimeSchema } from "../../shared/datetime.js";

export const AnnouncementIdSchema = UuidSchema.brand<"AnnouncementId">();
export const AnnouncementReadIdSchema = UuidSchema.brand<"AnnouncementReadId">();

export const AnnouncementStatusValues = ["draft", "scheduled", "published", "archived"] as const;

export const AnnouncementAudienceTypeValues = ["org", "team", "role"] as const;

export const AnnouncementStatusSchema = z.enum(AnnouncementStatusValues);
export const AnnouncementAudienceTypeSchema = z.enum(AnnouncementAudienceTypeValues);

export const AnnouncementSchema = z.object({
  id: AnnouncementIdSchema,
  orgId: OrgIdSchema,
  announcementNumber: z.string().trim().min(1).max(64),
  title: z.string().trim().min(1).max(500),
  body: z.string().trim().min(1).max(50_000),
  status: AnnouncementStatusSchema,
  audienceType: AnnouncementAudienceTypeSchema,
  /** UUIDs of teams or roles; empty array means all-org */
  audienceIds: z.array(z.string().uuid()),
  scheduledAt: UtcDateTimeSchema.nullable(),
  publishedAt: UtcDateTimeSchema.nullable(),
  publishedByPrincipalId: PrincipalIdSchema.nullable(),
  createdByPrincipalId: PrincipalIdSchema,
  createdAt: UtcDateTimeSchema,
  updatedAt: UtcDateTimeSchema,
});

export const AnnouncementReadSchema = z.object({
  id: AnnouncementReadIdSchema,
  orgId: OrgIdSchema,
  announcementId: AnnouncementIdSchema,
  principalId: PrincipalIdSchema,
  acknowledgedAt: UtcDateTimeSchema,
  createdAt: UtcDateTimeSchema,
});

export type AnnouncementId = z.infer<typeof AnnouncementIdSchema>;
export type AnnouncementReadId = z.infer<typeof AnnouncementReadIdSchema>;
export type AnnouncementStatus = z.infer<typeof AnnouncementStatusSchema>;
export type AnnouncementAudienceType = z.infer<typeof AnnouncementAudienceTypeSchema>;
export type Announcement = z.infer<typeof AnnouncementSchema>;
export type AnnouncementRead = z.infer<typeof AnnouncementReadSchema>;

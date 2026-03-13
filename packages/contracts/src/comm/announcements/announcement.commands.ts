import { z } from "zod";
import { IdempotencyKeySchema } from "../../kernel/execution/idempotency/request-key.js";
import { UtcDateTimeSchema } from "../../shared/datetime.js";
import { AnnouncementIdSchema, AnnouncementAudienceTypeSchema } from "./announcement.entity.js";

// Base schema for commands that require idempotencyKey + announcementId
const AnnouncementCommandBase = z.object({
  idempotencyKey: IdempotencyKeySchema,
  announcementId: AnnouncementIdSchema,
});

export const CreateAnnouncementCommandSchema = z
  .object({
    idempotencyKey: IdempotencyKeySchema,
    title: z.string().trim().min(1).max(500),
    body: z.string().trim().min(1).max(50_000),
    audienceType: AnnouncementAudienceTypeSchema,
    /**
     * UUID list of teams/roles; ignored when audienceType is "org"
     */
    audienceIds: z.array(z.string().uuid()).optional(),
    scheduledAt: UtcDateTimeSchema.optional(),
  })
  .superRefine((data, ctx) => {
    const idsCount = data.audienceIds?.length ?? 0;

    if (data.audienceType === "org" && idsCount > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "audienceIds must be empty when audienceType is 'org'",
        path: ["audienceIds"],
      });
    }

    if (["team", "role"].includes(data.audienceType) && idsCount === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "audienceIds must contain at least one id when audienceType is 'team' or 'role'",
        path: ["audienceIds"],
      });
    }
  });

export const PublishAnnouncementCommandSchema = AnnouncementCommandBase;

export const ScheduleAnnouncementCommandSchema = AnnouncementCommandBase.extend({
  scheduledAt: UtcDateTimeSchema,
});

export const ArchiveAnnouncementCommandSchema = AnnouncementCommandBase;

export const AcknowledgeAnnouncementCommandSchema = AnnouncementCommandBase;

// Types
export type CreateAnnouncementCommand = z.infer<typeof CreateAnnouncementCommandSchema>;
export type PublishAnnouncementCommand = z.infer<typeof PublishAnnouncementCommandSchema>;
export type ScheduleAnnouncementCommand = z.infer<typeof ScheduleAnnouncementCommandSchema>;
export type ArchiveAnnouncementCommand = z.infer<typeof ArchiveAnnouncementCommandSchema>;
export type AcknowledgeAnnouncementCommand = z.infer<typeof AcknowledgeAnnouncementCommandSchema>;

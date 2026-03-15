import { z } from "zod";
import { IdempotencyKeySchema } from "../../kernel/execution/idempotency/request-key.js";
import { UtcDateTimeSchema } from "../../shared/datetime.js";
import { AnnouncementAudienceTypeSchema, AnnouncementIdSchema } from "./announcement.entity.js";

// Base schema for commands that require idempotencyKey + announcementId
const AnnouncementCommandBase = z.object({
  idempotencyKey: IdempotencyKeySchema,
  announcementId: AnnouncementIdSchema,
});

const CreateAnnouncementCommandFields = {
  title: z.string().trim().min(1).max(500),
  body: z.string().trim().min(1).max(50_000),
  scheduledAt: UtcDateTimeSchema.optional(),
};

function buildAudienceBranch(audienceType: "team" | "role") {
  return AnnouncementCommandBase.omit({ announcementId: true }).extend({
    ...CreateAnnouncementCommandFields,
    audienceType: z.literal(audienceType),
    audienceIds: z
      .array(z.string().uuid())
      .min(1, "audienceIds must contain at least one id when audienceType is 'team' or 'role'"),
  });
}

export const CreateAnnouncementCommandSchema = z.discriminatedUnion("audienceType", [
  AnnouncementCommandBase.omit({ announcementId: true }).extend({
    ...CreateAnnouncementCommandFields,
    audienceType: z.literal("org"),
    /**
     * UUID list of teams/roles; must be empty when audienceType is "org"
     */
    audienceIds: z
      .array(z.string().uuid())
      .max(0, "audienceIds must be empty when audienceType is 'org'")
      .default([]),
  }),
  buildAudienceBranch("team"),
  buildAudienceBranch("role"),
]);

export const PublishAnnouncementCommandSchema = AnnouncementCommandBase;

export const UpdateAnnouncementCommandSchema = AnnouncementCommandBase.extend({
  title: z.string().trim().min(1).max(500).optional(),
  body: z.string().trim().min(1).max(50_000).optional(),
  audienceType: AnnouncementAudienceTypeSchema.optional(),
  audienceIds: z.array(z.string().uuid()).optional(),
}).superRefine((data, ctx) => {
  const hasAnyUpdatableField =
    data.title !== undefined ||
    data.body !== undefined ||
    data.audienceType !== undefined ||
    data.audienceIds !== undefined;

  if (!hasAnyUpdatableField) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "At least one updatable field is required.",
      path: ["title"],
    });
  }

  const audienceTypeProvided = data.audienceType !== undefined;
  const audienceIdsProvided = data.audienceIds !== undefined;
  if (audienceTypeProvided !== audienceIdsProvided) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "audienceType and audienceIds must be provided together.",
      path: ["audienceType"],
    });
  }
});

export const ScheduleAnnouncementCommandSchema = AnnouncementCommandBase.extend({
  scheduledAt: UtcDateTimeSchema,
});

export const ArchiveAnnouncementCommandSchema = AnnouncementCommandBase;
export const UnscheduleAnnouncementCommandSchema = AnnouncementCommandBase;
export const UnarchiveAnnouncementCommandSchema = AnnouncementCommandBase;

export const AcknowledgeAnnouncementCommandSchema = AnnouncementCommandBase;

// Types
export type CreateAnnouncementCommand = z.infer<typeof CreateAnnouncementCommandSchema>;
export type PublishAnnouncementCommand = z.infer<typeof PublishAnnouncementCommandSchema>;
export type UpdateAnnouncementCommand = z.infer<typeof UpdateAnnouncementCommandSchema>;
export type ScheduleAnnouncementCommand = z.infer<typeof ScheduleAnnouncementCommandSchema>;
export type ArchiveAnnouncementCommand = z.infer<typeof ArchiveAnnouncementCommandSchema>;
export type UnscheduleAnnouncementCommand = z.infer<typeof UnscheduleAnnouncementCommandSchema>;
export type UnarchiveAnnouncementCommand = z.infer<typeof UnarchiveAnnouncementCommandSchema>;
export type AcknowledgeAnnouncementCommand = z.infer<typeof AcknowledgeAnnouncementCommandSchema>;

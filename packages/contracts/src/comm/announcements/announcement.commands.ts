import { z } from "zod";
import { IdempotencyKeySchema } from "../../kernel/execution/idempotency/request-key.js";
import { UtcDateTimeSchema } from "../../shared/datetime.js";
import { AnnouncementIdSchema, AnnouncementAudienceTypeSchema } from "./announcement.entity.js";

export const CreateAnnouncementCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  title: z.string().trim().min(1).max(500),
  body: z.string().trim().min(1).max(50_000),
  audienceType: AnnouncementAudienceTypeSchema,
  /** UUID list of teams/roles; ignored when audienceType is "org" */
  audienceIds: z.array(z.string().uuid()).optional(),
  scheduledAt: UtcDateTimeSchema.optional().nullable(),
});

export const PublishAnnouncementCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  announcementId: AnnouncementIdSchema,
});

export const ScheduleAnnouncementCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  announcementId: AnnouncementIdSchema,
  scheduledAt: UtcDateTimeSchema,
});

export const ArchiveAnnouncementCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  announcementId: AnnouncementIdSchema,
});

export const AcknowledgeAnnouncementCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  announcementId: AnnouncementIdSchema,
});

export type CreateAnnouncementCommand = z.infer<typeof CreateAnnouncementCommandSchema>;
export type PublishAnnouncementCommand = z.infer<typeof PublishAnnouncementCommandSchema>;
export type ScheduleAnnouncementCommand = z.infer<typeof ScheduleAnnouncementCommandSchema>;
export type ArchiveAnnouncementCommand = z.infer<typeof ArchiveAnnouncementCommandSchema>;
export type AcknowledgeAnnouncementCommand = z.infer<typeof AcknowledgeAnnouncementCommandSchema>;

import { z } from "zod";
import { UtcDateTimeSchema } from "../../shared/datetime.js";
import { CorrelationIdSchema, OrgIdSchema, PrincipalIdSchema } from "../../shared/ids.js";
import {
  AnnouncementAudienceTypeSchema,
  AnnouncementIdSchema,
  AnnouncementStatusSchema,
} from "./announcement.entity.js";

const AnnouncementNumberSchema = z.string().trim().min(1).max(64);

export const CommAnnouncementUpdateSnapshotSchema = z.object({
  title: z.string().trim().min(1).max(500),
  body: z.string().trim().min(1).max(50_000),
  status: AnnouncementStatusSchema,
  audienceType: AnnouncementAudienceTypeSchema,
  audienceIds: z.array(z.string().uuid()),
  scheduledAt: UtcDateTimeSchema.nullable(),
});

export const CommAnnouncementUpdatedPayloadSchema = z.object({
  announcementId: AnnouncementIdSchema,
  announcementNumber: AnnouncementNumberSchema,
  orgId: OrgIdSchema,
  correlationId: CorrelationIdSchema,
  previous: CommAnnouncementUpdateSnapshotSchema,
  current: CommAnnouncementUpdateSnapshotSchema,
  updatedAt: UtcDateTimeSchema,
});

export const CommAnnouncementCreatedPayloadSchema = z.object({
  announcementId: AnnouncementIdSchema,
  announcementNumber: AnnouncementNumberSchema,
  orgId: OrgIdSchema,
  title: z.string().trim().min(1).max(500),
  audienceType: AnnouncementAudienceTypeSchema,
  audienceIds: z.array(z.string().uuid()),
  correlationId: CorrelationIdSchema,
});

export const CommAnnouncementPublishedPayloadSchema = z.object({
  announcementId: AnnouncementIdSchema,
  announcementNumber: AnnouncementNumberSchema,
  orgId: OrgIdSchema,
  title: z.string().trim().min(1).max(500),
  audienceType: AnnouncementAudienceTypeSchema,
  audienceIds: z.array(z.string().uuid()),
  correlationId: CorrelationIdSchema,
});

export const CommAnnouncementScheduledPayloadSchema = z.object({
  announcementId: AnnouncementIdSchema,
  announcementNumber: AnnouncementNumberSchema,
  orgId: OrgIdSchema,
  correlationId: CorrelationIdSchema,
  previousScheduledAt: UtcDateTimeSchema.nullable(),
  scheduledAt: UtcDateTimeSchema,
  updatedAt: UtcDateTimeSchema,
});

export const CommAnnouncementArchivedPayloadSchema = z.object({
  announcementId: AnnouncementIdSchema,
  announcementNumber: AnnouncementNumberSchema,
  orgId: OrgIdSchema,
  correlationId: CorrelationIdSchema,
});

export const CommAnnouncementAcknowledgedPayloadSchema = z.object({
  announcementId: AnnouncementIdSchema,
  announcementNumber: AnnouncementNumberSchema,
  orgId: OrgIdSchema,
  principalId: PrincipalIdSchema,
  correlationId: CorrelationIdSchema,
});

export const CommAnnouncementRescheduledPayloadSchema = z.object({
  announcementId: AnnouncementIdSchema,
  announcementNumber: AnnouncementNumberSchema,
  orgId: OrgIdSchema,
  correlationId: CorrelationIdSchema,
  previousScheduledAt: UtcDateTimeSchema.nullable(),
  scheduledAt: UtcDateTimeSchema,
  updatedAt: UtcDateTimeSchema,
});

export const CommAnnouncementUnscheduledPayloadSchema = z.object({
  announcementId: AnnouncementIdSchema,
  announcementNumber: AnnouncementNumberSchema,
  orgId: OrgIdSchema,
  correlationId: CorrelationIdSchema,
  previousScheduledAt: UtcDateTimeSchema,
  status: z.literal("draft"),
  updatedAt: UtcDateTimeSchema,
});

export const CommAnnouncementUnarchivedPayloadSchema = z.object({
  announcementId: AnnouncementIdSchema,
  announcementNumber: AnnouncementNumberSchema,
  orgId: OrgIdSchema,
  correlationId: CorrelationIdSchema,
  previousStatus: z.literal("archived"),
  status: z.enum(["draft", "published"]),
  updatedAt: UtcDateTimeSchema,
});

// Aliases with concise names for consumers that prefer event-centric naming.
export const AnnouncementUpdatedEventSchema = CommAnnouncementUpdatedPayloadSchema;
export const AnnouncementCreatedEventSchema = CommAnnouncementCreatedPayloadSchema;
export const AnnouncementPublishedEventSchema = CommAnnouncementPublishedPayloadSchema;
export const AnnouncementScheduledEventSchema = CommAnnouncementScheduledPayloadSchema;
export const AnnouncementArchivedEventSchema = CommAnnouncementArchivedPayloadSchema;
export const AnnouncementAcknowledgedEventSchema = CommAnnouncementAcknowledgedPayloadSchema;
export const AnnouncementRescheduledEventSchema = CommAnnouncementRescheduledPayloadSchema;
export const AnnouncementUnscheduledEventSchema = CommAnnouncementUnscheduledPayloadSchema;
export const AnnouncementUnarchivedEventSchema = CommAnnouncementUnarchivedPayloadSchema;

export type CommAnnouncementUpdateSnapshot = z.infer<typeof CommAnnouncementUpdateSnapshotSchema>;
export type CommAnnouncementUpdatedPayload = z.infer<typeof CommAnnouncementUpdatedPayloadSchema>;
export type CommAnnouncementCreatedPayload = z.infer<typeof CommAnnouncementCreatedPayloadSchema>;
export type CommAnnouncementPublishedPayload = z.infer<
  typeof CommAnnouncementPublishedPayloadSchema
>;
export type CommAnnouncementScheduledPayload = z.infer<
  typeof CommAnnouncementScheduledPayloadSchema
>;
export type CommAnnouncementArchivedPayload = z.infer<typeof CommAnnouncementArchivedPayloadSchema>;
export type CommAnnouncementAcknowledgedPayload = z.infer<
  typeof CommAnnouncementAcknowledgedPayloadSchema
>;
export type CommAnnouncementRescheduledPayload = z.infer<
  typeof CommAnnouncementRescheduledPayloadSchema
>;
export type CommAnnouncementUnscheduledPayload = z.infer<
  typeof CommAnnouncementUnscheduledPayloadSchema
>;
export type CommAnnouncementUnarchivedPayload = z.infer<
  typeof CommAnnouncementUnarchivedPayloadSchema
>;

export type AnnouncementUpdatedEvent = z.infer<typeof AnnouncementUpdatedEventSchema>;
export type AnnouncementCreatedEvent = z.infer<typeof AnnouncementCreatedEventSchema>;
export type AnnouncementPublishedEvent = z.infer<typeof AnnouncementPublishedEventSchema>;
export type AnnouncementScheduledEvent = z.infer<typeof AnnouncementScheduledEventSchema>;
export type AnnouncementArchivedEvent = z.infer<typeof AnnouncementArchivedEventSchema>;
export type AnnouncementAcknowledgedEvent = z.infer<typeof AnnouncementAcknowledgedEventSchema>;
export type AnnouncementRescheduledEvent = z.infer<typeof AnnouncementRescheduledEventSchema>;
export type AnnouncementUnscheduledEvent = z.infer<typeof AnnouncementUnscheduledEventSchema>;
export type AnnouncementUnarchivedEvent = z.infer<typeof AnnouncementUnarchivedEventSchema>;

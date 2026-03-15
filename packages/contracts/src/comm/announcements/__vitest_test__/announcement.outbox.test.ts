import { describe, expect, it } from "vitest";
import { CommAnnouncementEvents } from "../announcement.events.js";
import { AnnouncementOutboxRecordSchema, OutboxRecordSchema } from "../announcement.outbox.js";

const base = {
  id: "123e4567-e89b-12d3-a456-426614174010",
  createdAt: "2026-03-14T12:00:00.000Z",
};

const payloadEnvelope = {
  announcementId: "123e4567-e89b-12d3-a456-426614174000",
  announcementNumber: "ANN-0001",
  orgId: "123e4567-e89b-12d3-a456-426614174001",
  correlationId: "123e4567-e89b-12d3-a456-426614174002",
  updatedAt: "2026-03-14T12:00:00.000Z",
};

describe("AnnouncementOutboxRecordSchema", () => {
  it("accepts generic outbox record shape", () => {
    const result = OutboxRecordSchema.safeParse({
      ...base,
      eventName: CommAnnouncementEvents.Created,
      payload: { entityType: "announcement" },
      processedAt: null,
    });

    expect(result.success).toBe(true);
  });

  it("validates updated payload when eventName is updated", () => {
    const result = AnnouncementOutboxRecordSchema.safeParse({
      ...base,
      eventName: CommAnnouncementEvents.Updated,
      payload: {
        ...payloadEnvelope,
        previous: {
          title: "Old title",
          body: "Old body",
          status: "draft",
          audienceType: "org",
          audienceIds: [],
          scheduledAt: null,
        },
        current: {
          title: "New title",
          body: "New body",
          status: "scheduled",
          audienceType: "team",
          audienceIds: ["123e4567-e89b-12d3-a456-426614174003"],
          scheduledAt: "2026-03-18T10:00:00.000Z",
        },
      },
    });

    expect(result.success).toBe(true);
  });

  it("rejects invalid unscheduled payload", () => {
    const result = AnnouncementOutboxRecordSchema.safeParse({
      ...base,
      eventName: CommAnnouncementEvents.Unscheduled,
      payload: {
        ...payloadEnvelope,
        previousScheduledAt: "2026-03-20T10:00:00.000Z",
        status: "published",
      },
    });

    expect(result.success).toBe(false);
  });

  it("validates created payload when eventName is created", () => {
    const result = AnnouncementOutboxRecordSchema.safeParse({
      ...base,
      eventName: CommAnnouncementEvents.Created,
      payload: {
        announcementId: payloadEnvelope.announcementId,
        announcementNumber: payloadEnvelope.announcementNumber,
        orgId: payloadEnvelope.orgId,
        title: "Created title",
        audienceType: "team",
        audienceIds: ["123e4567-e89b-12d3-a456-426614174003"],
        correlationId: payloadEnvelope.correlationId,
      },
    });

    expect(result.success).toBe(true);
  });

  it("rejects archived payload when required fields are missing", () => {
    const result = AnnouncementOutboxRecordSchema.safeParse({
      ...base,
      eventName: CommAnnouncementEvents.Archived,
      payload: {
        announcementId: payloadEnvelope.announcementId,
      },
    });

    expect(result.success).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import {
  CommAnnouncementRescheduledPayloadSchema,
  CommAnnouncementUnarchivedPayloadSchema,
  CommAnnouncementUnscheduledPayloadSchema,
  CommAnnouncementUpdatedPayloadSchema,
} from "../announcement.events.payloads.js";

const baseEnvelope = {
  announcementId: "123e4567-e89b-12d3-a456-426614174000",
  announcementNumber: "ANN-0001",
  orgId: "123e4567-e89b-12d3-a456-426614174001",
  correlationId: "123e4567-e89b-12d3-a456-426614174002",
  updatedAt: "2026-03-14T12:00:00.000Z",
};

describe("announcement event payload schemas", () => {
  it("accepts updated payload with previous/current snapshots", () => {
    const result = CommAnnouncementUpdatedPayloadSchema.safeParse({
      ...baseEnvelope,
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
        scheduledAt: "2026-03-20T12:00:00.000Z",
      },
    });

    expect(result.success).toBe(true);
  });

  it("accepts rescheduled payload and allows null previousScheduledAt", () => {
    const result = CommAnnouncementRescheduledPayloadSchema.safeParse({
      ...baseEnvelope,
      previousScheduledAt: null,
      scheduledAt: "2026-03-21T12:00:00.000Z",
    });

    expect(result.success).toBe(true);
  });

  it("requires draft status in unscheduled payload", () => {
    const result = CommAnnouncementUnscheduledPayloadSchema.safeParse({
      ...baseEnvelope,
      previousScheduledAt: "2026-03-19T12:00:00.000Z",
      status: "published",
    });

    expect(result.success).toBe(false);
  });

  it("requires archived as previousStatus in unarchived payload", () => {
    const result = CommAnnouncementUnarchivedPayloadSchema.safeParse({
      ...baseEnvelope,
      previousStatus: "published",
      status: "draft",
    });

    expect(result.success).toBe(false);
  });
});

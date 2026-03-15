import { describe, expect, it } from "vitest";
import {
  AnnouncementCreateSchema,
  AnnouncementSchema,
  AnnouncementUpdateSchema,
} from "../announcement.entity.js";

const base = {
  id: "11111111-1111-4111-8111-111111111111",
  orgId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  announcementNumber: "ANN-0001",
  title: "Policy update",
  body: "Body copy",
  status: "draft",
  audienceType: "org",
  audienceIds: [],
  scheduledAt: null,
  publishedAt: null,
  publishedByPrincipalId: null,
  createdByPrincipalId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  createdAt: "2026-03-14T12:00:00.000Z",
  updatedAt: "2026-03-14T12:00:00.000Z",
};

describe("AnnouncementSchema", () => {
  it("accepts valid draft announcement", () => {
    const result = AnnouncementSchema.safeParse(base);
    expect(result.success).toBe(true);
  });

  it("rejects org audience with ids", () => {
    const result = AnnouncementSchema.safeParse({
      ...base,
      audienceIds: ["33333333-3333-4333-8333-333333333333"],
    });

    expect(result.success).toBe(false);
  });

  it("rejects published without publishedByPrincipalId", () => {
    const result = AnnouncementSchema.safeParse({
      ...base,
      status: "published",
      publishedAt: "2026-03-14T12:00:00.000Z",
      publishedByPrincipalId: null,
    });

    expect(result.success).toBe(false);
  });
});

describe("AnnouncementCreateSchema", () => {
  it("applies defaults and accepts org audience", () => {
    const result = AnnouncementCreateSchema.safeParse({
      orgId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      announcementNumber: "ANN-0002",
      title: "Announcement",
      body: "Body",
      audienceType: "org",
      audienceIds: [],
      createdByPrincipalId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe("draft");
      expect(result.data.scheduledAt).toBeNull();
    }
  });
});

describe("AnnouncementUpdateSchema", () => {
  it("accepts status-only update with required scheduledAt for scheduled status", () => {
    const result = AnnouncementUpdateSchema.safeParse({
      status: "scheduled",
      scheduledAt: "2026-03-20T09:00:00.000Z",
    });

    expect(result.success).toBe(true);
  });

  it("rejects scheduled status update without scheduledAt", () => {
    const result = AnnouncementUpdateSchema.safeParse({
      status: "scheduled",
    });

    expect(result.success).toBe(false);
  });
});

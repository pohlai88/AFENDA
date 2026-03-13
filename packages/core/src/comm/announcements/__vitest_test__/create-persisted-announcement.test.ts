import { describe, expect, it } from "vitest";
import {
  createPersistedAnnouncement,
  ensureScheduledAtInFuture,
} from "../create-persisted-announcement.js";

const ORG_ID = "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa";
const PRINCIPAL_ID = "bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb";

const baseCreate = {
  orgId: ORG_ID,
  announcementNumber: "ANN-TEST001",
  title: "Test",
  body: "Body content",
  audienceType: "org" as const,
  audienceIds: [],
  createdByPrincipalId: PRINCIPAL_ID,
};

describe("ensureScheduledAtInFuture", () => {
  it("does nothing when scheduledAt is null", () => {
    expect(() => ensureScheduledAtInFuture(null)).not.toThrow();
  });

  it("does nothing when scheduledAt is undefined", () => {
    expect(() => ensureScheduledAtInFuture(undefined)).not.toThrow();
  });

  it("throws when scheduledAt is invalid datetime", () => {
    expect(() => ensureScheduledAtInFuture("not-a-date")).toThrow(
      "scheduledAt is not a valid datetime",
    );
  });

  it("throws when scheduledAt is in the past", () => {
    const past = new Date(Date.now() - 60_000).toISOString();
    expect(() => ensureScheduledAtInFuture(past)).toThrow(
      "scheduledAt must be in the future",
    );
  });

  it("throws when scheduledAt equals now", () => {
    const now = new Date();
    expect(() => ensureScheduledAtInFuture(now.toISOString(), now)).toThrow(
      "scheduledAt must be in the future",
    );
  });

  it("does not throw when scheduledAt is in the future", () => {
    const future = new Date(Date.now() + 60_000).toISOString();
    expect(() => ensureScheduledAtInFuture(future)).not.toThrow();
  });
});

describe("createPersistedAnnouncement", () => {
  const fixedNow = new Date("2026-03-15T12:00:00.000Z");

  it("creates draft announcement with server-owned fields", () => {
    const raw = { ...baseCreate, status: "draft" };
    const result = createPersistedAnnouncement(raw, { now: fixedNow });

    expect(result.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
    expect(result.orgId).toBe(ORG_ID);
    expect(result.announcementNumber).toBe("ANN-TEST001");
    expect(result.title).toBe("Test");
    expect(result.body).toBe("Body content");
    expect(result.status).toBe("draft");
    expect(result.audienceType).toBe("org");
    expect(result.audienceIds).toEqual([]);
    expect(result.scheduledAt).toBeNull();
    expect(result.publishedAt).toBeNull();
    expect(result.publishedByPrincipalId).toBeNull();
    expect(result.createdByPrincipalId).toBe(PRINCIPAL_ID);
    expect(result.createdAt).toBe("2026-03-15T12:00:00.000Z");
    expect(result.updatedAt).toBe("2026-03-15T12:00:00.000Z");
  });

  it("creates scheduled announcement when scheduledAt is in future", () => {
    const futureAt = "2026-03-20T14:00:00.000Z";
    const raw = {
      ...baseCreate,
      status: "scheduled",
      scheduledAt: futureAt,
    };
    const result = createPersistedAnnouncement(raw, { now: fixedNow });

    expect(result.status).toBe("scheduled");
    expect(result.scheduledAt).toBe(futureAt);
  });

  it("throws when status is scheduled but scheduledAt is in past", () => {
    const pastAt = "2026-03-10T10:00:00.000Z";
    const raw = {
      ...baseCreate,
      status: "scheduled",
      scheduledAt: pastAt,
    };
    expect(() => createPersistedAnnouncement(raw, { now: fixedNow })).toThrow(
      "scheduledAt must be in the future",
    );
  });

  it("creates published announcement with published fields", () => {
    const raw = {
      ...baseCreate,
      status: "published",
      publishedAt: "2026-03-15T11:00:00.000Z",
      publishedByPrincipalId: PRINCIPAL_ID,
    };
    const result = createPersistedAnnouncement(raw, { now: fixedNow });

    expect(result.status).toBe("published");
    expect(result.publishedAt).toBe("2026-03-15T11:00:00.000Z");
    expect(result.publishedByPrincipalId).toBe(PRINCIPAL_ID);
  });

  it("defaults publishedAt and publishedByPrincipalId when status is published", () => {
    const raw = {
      ...baseCreate,
      status: "published",
      publishedAt: null,
      publishedByPrincipalId: null,
    };
    const result = createPersistedAnnouncement(raw, { now: fixedNow });

    expect(result.status).toBe("published");
    expect(result.publishedAt).toBe("2026-03-15T12:00:00.000Z");
    expect(result.publishedByPrincipalId).toBe(PRINCIPAL_ID);
  });

  it("creates announcement with team audience", () => {
    const teamIds = ["cccccccc-cccc-4ccc-8ccc-cccccccccccc"];
    const raw = {
      ...baseCreate,
      audienceType: "team" as const,
      audienceIds: teamIds,
    };
    const result = createPersistedAnnouncement(raw, { now: fixedNow });

    expect(result.audienceType).toBe("team");
    expect(result.audienceIds).toEqual(teamIds);
  });

  it("throws on invalid create payload", () => {
    expect(() =>
      createPersistedAnnouncement({ ...baseCreate, title: "" }, { now: fixedNow }),
    ).toThrow();
  });
});

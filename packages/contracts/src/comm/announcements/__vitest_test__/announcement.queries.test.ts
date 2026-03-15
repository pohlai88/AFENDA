import { describe, expect, it } from "vitest";
import {
  GetAnnouncementQuerySchema,
  ListAnnouncementReadsQuerySchema,
  ListAnnouncementsQuerySchema,
  SearchAnnouncementsQuerySchema,
} from "../announcement.queries.js";

describe("announcement query schemas", () => {
  it("parses GetAnnouncementQuerySchema", () => {
    const result = GetAnnouncementQuerySchema.safeParse({
      announcementId: "11111111-1111-4111-8111-111111111111",
    });

    expect(result.success).toBe(true);
  });

  it("applies list default limit", () => {
    const result = ListAnnouncementsQuerySchema.safeParse({});

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBeTypeOf("number");
    }
  });

  it("rejects invalid date order", () => {
    const result = ListAnnouncementsQuerySchema.safeParse({
      publishedAfter: "2026-03-20T00:00:00.000Z",
      publishedBefore: "2026-03-19T00:00:00.000Z",
    });

    expect(result.success).toBe(false);
  });

  it("parses search query", () => {
    const result = SearchAnnouncementsQuerySchema.safeParse({
      query: "incident",
      limit: 10,
    });

    expect(result.success).toBe(true);
  });

  it("parses announcement reads query", () => {
    const result = ListAnnouncementReadsQuerySchema.safeParse({
      announcementId: "11111111-1111-4111-8111-111111111111",
      limit: 20,
    });

    expect(result.success).toBe(true);
  });
});

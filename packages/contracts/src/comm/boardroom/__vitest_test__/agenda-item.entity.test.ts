import { describe, expect, it } from "vitest";
import { BoardAgendaItemSchema } from "../agenda-item.entity.js";

describe("agenda-item.entity", () => {
  it("parses a valid agenda item", () => {
    const parsed = BoardAgendaItemSchema.parse({
      id: "55555555-5555-4555-8555-555555555555",
      orgId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      meetingId: "11111111-1111-4111-8111-111111111111",
      sortOrder: 1,
      title: "Budget review",
      description: null,
      presenterId: null,
      durationMinutes: null,
      createdAt: "2026-05-01T09:00:00.000Z",
      updatedAt: "2026-05-01T09:00:00.000Z",
    });

    expect(parsed.sortOrder).toBe(1);
  });

  it("rejects presenter without duration", () => {
    const result = BoardAgendaItemSchema.safeParse({
      id: "55555555-5555-4555-8555-555555555555",
      orgId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      meetingId: "11111111-1111-4111-8111-111111111111",
      sortOrder: 1,
      title: "Budget review",
      description: null,
      presenterId: "22222222-2222-4222-8222-222222222222",
      durationMinutes: null,
      createdAt: "2026-05-01T09:00:00.000Z",
      updatedAt: "2026-05-01T09:00:00.000Z",
    });

    expect(result.success).toBe(false);
  });

  it("rejects zero duration when presenter is set", () => {
    const result = BoardAgendaItemSchema.safeParse({
      id: "55555555-5555-4555-8555-555555555555",
      orgId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      meetingId: "11111111-1111-4111-8111-111111111111",
      sortOrder: 1,
      title: "Budget review",
      description: null,
      presenterId: "22222222-2222-4222-8222-222222222222",
      durationMinutes: 0,
      createdAt: "2026-05-01T09:00:00.000Z",
      updatedAt: "2026-05-01T09:00:00.000Z",
    });

    expect(result.success).toBe(false);
  });
});

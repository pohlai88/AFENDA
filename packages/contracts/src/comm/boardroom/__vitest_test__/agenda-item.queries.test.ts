import { describe, expect, it } from "vitest";
import {
  GetBoardAgendaItemResponseSchema,
  ListBoardAgendaItemsQuerySchema,
} from "../agenda-item.queries.js";

describe("agenda-item.queries", () => {
  it("applies the default list limit", () => {
    const parsed = ListBoardAgendaItemsQuerySchema.parse({
      meetingId: "11111111-1111-4111-8111-111111111111",
    });

    expect(parsed.limit).toBe(50);
  });

  it("parses the detail response schema", () => {
    const parsed = GetBoardAgendaItemResponseSchema.parse({
      data: {
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
      },
      correlationId: "99999999-9999-4999-8999-999999999999",
    });

    expect(parsed.data.title).toBe("Budget review");
  });
});

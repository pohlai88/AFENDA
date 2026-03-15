import { describe, expect, it } from "vitest";
import {
  CommAgendaItemAddedPayloadSchema,
  CommAgendaItemUpdatedPayloadSchema,
} from "../agenda-item.events.payloads.js";

describe("agenda-item.events.payloads", () => {
  it("parses agenda-item-added payload", () => {
    const parsed = CommAgendaItemAddedPayloadSchema.parse({
      agendaItemId: "55555555-5555-4555-8555-555555555555",
      meetingId: "11111111-1111-4111-8111-111111111111",
      orgId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      title: "Budget review",
      sortOrder: 1,
      presenterId: null,
      correlationId: "99999999-9999-4999-8999-999999999999",
    });

    expect(parsed.sortOrder).toBe(1);
  });

  it("applies presenterId default when omitted in added payload", () => {
    const parsed = CommAgendaItemAddedPayloadSchema.parse({
      agendaItemId: "55555555-5555-4555-8555-555555555555",
      meetingId: "11111111-1111-4111-8111-111111111111",
      orgId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      title: "Budget review",
      sortOrder: 1,
      correlationId: "99999999-9999-4999-8999-999999999999",
    });

    expect(parsed.presenterId).toBeNull();
  });

  it("accepts optional changed fields in updated payload", () => {
    const parsed = CommAgendaItemUpdatedPayloadSchema.parse({
      agendaItemId: "55555555-5555-4555-8555-555555555555",
      meetingId: "11111111-1111-4111-8111-111111111111",
      orgId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      correlationId: "99999999-9999-4999-8999-999999999999",
      title: "Updated budget review",
      sortOrder: 2,
      presenterId: "22222222-2222-4222-8222-222222222222",
    });

    expect(parsed.title).toBe("Updated budget review");
    expect(parsed.sortOrder).toBe(2);
  });

  it("rejects updated payload without agendaItemId", () => {
    const result = CommAgendaItemUpdatedPayloadSchema.safeParse({
      meetingId: "11111111-1111-4111-8111-111111111111",
      orgId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      correlationId: "99999999-9999-4999-8999-999999999999",
    });

    expect(result.success).toBe(false);
  });
});

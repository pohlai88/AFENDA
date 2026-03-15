import { describe, expect, it } from "vitest";
import {
  AddAgendaItemCommandSchema,
  UpdateAgendaItemCommandSchema,
} from "../agenda-item.commands.js";

describe("agenda-item.commands", () => {
  it("applies defaults when adding an agenda item", () => {
    const parsed = AddAgendaItemCommandSchema.parse({
      idempotencyKey: "idem-agenda-add-1",
      meetingId: "11111111-1111-4111-8111-111111111111",
      title: "Budget review",
    });

    expect(parsed.description).toBeNull();
    expect(parsed.presenterId).toBeNull();
  });

  it("rejects presenter without duration", () => {
    const result = AddAgendaItemCommandSchema.safeParse({
      idempotencyKey: "idem-agenda-add-2",
      meetingId: "11111111-1111-4111-8111-111111111111",
      title: "Budget review",
      presenterId: "22222222-2222-4222-8222-222222222222",
    });

    expect(result.success).toBe(false);
  });

  it("rejects zero duration when presenter is provided", () => {
    const result = AddAgendaItemCommandSchema.safeParse({
      idempotencyKey: "idem-agenda-add-3",
      meetingId: "11111111-1111-4111-8111-111111111111",
      title: "Budget review",
      presenterId: "22222222-2222-4222-8222-222222222222",
      durationMinutes: 0,
    });

    expect(result.success).toBe(false);
  });

  it("rejects empty update commands", () => {
    const result = UpdateAgendaItemCommandSchema.safeParse({
      idempotencyKey: "idem-agenda-update-1",
      meetingId: "11111111-1111-4111-8111-111111111111",
      agendaItemId: "55555555-5555-4555-8555-555555555555",
    });

    expect(result.success).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import {
  CreateActionItemCommandSchema,
  RecordMinutesCommandSchema,
  UpdateActionItemCommandSchema,
} from "../minutes.commands.js";

describe("minutes.commands", () => {
  it("applies defaults for record minutes", () => {
    const parsed = RecordMinutesCommandSchema.parse({
      idempotencyKey: "idem-minutes-record-1",
      meetingId: "11111111-1111-4111-8111-111111111111",
      content: "Resolved to approve budget.",
    });

    expect(parsed.resolutionId).toBeNull();
    expect(parsed.metadata).toEqual({});
  });

  it("rejects past due dates when creating action items", () => {
    const result = CreateActionItemCommandSchema.safeParse({
      idempotencyKey: "idem-action-create-1",
      minuteId: "99999999-9999-4999-8999-999999999999",
      title: "Send follow-up",
      dueDate: "2020-01-01",
    });

    expect(result.success).toBe(false);
  });

  it("rejects empty update action-item commands", () => {
    const result = UpdateActionItemCommandSchema.safeParse({
      idempotencyKey: "idem-action-update-1",
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    });

    expect(result.success).toBe(false);
  });
});

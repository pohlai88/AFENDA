import { describe, expect, it } from "vitest";
import { OutboxEventSchema } from "../../../kernel/execution/outbox/envelope.js";
import { ApprovalEventTypes } from "../../approvals/approval.events.js";
import { ProjectEventTypes } from "../../projects/project.events.js";
import { TaskEventTypes } from "../../tasks/task.events.js";
import { ChatterEventTypes } from "../../chatter/chatter.events.js";

const COMM_EVENT_TYPES = [
  ...ApprovalEventTypes,
  ...ProjectEventTypes,
  ...TaskEventTypes,
  ...ChatterEventTypes,
] as const;

describe("Comm event type outbox sync", () => {
  it("keeps all normalized comm event constants valid for OutboxEventSchema", () => {
    const orgId = "2a130cb2-e4a6-4f44-8fce-2a8db50c7f49";
    const correlationId = "31a20152-21e5-4445-8fc1-65be56b070ce";
    const occurredAt = "2026-03-12T10:30:00.000Z";

    for (const eventType of COMM_EVENT_TYPES) {
      const parsed = OutboxEventSchema.parse({
        type: eventType,
        version: "1",
        orgId,
        correlationId,
        occurredAt,
        payload: {
          entityType: "comm",
          eventType,
        },
      });

      expect(parsed.type).toBe(eventType);
    }
  });

  it("keeps comm event type list unique", () => {
    const unique = new Set(COMM_EVENT_TYPES);
    expect(unique.size).toBe(COMM_EVENT_TYPES.length);
  });
});

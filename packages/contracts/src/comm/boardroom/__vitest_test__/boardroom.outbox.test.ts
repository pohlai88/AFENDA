import { describe, expect, it } from "vitest";
import { CommAgendaItemEvents } from "../agenda-item.events.js";
import {
  BoardroomOutboxRecordSchema,
  BoardroomEventTypes,
  OutboxRecordSchema,
} from "../boardroom.outbox.js";
import { CommAttendeeEvents } from "../attendee.events.js";
import { CommMinutesEvents } from "../minutes.events.js";
import { CommMeetingEvents } from "../meeting.events.js";
import { CommResolutionEvents } from "../resolution.events.js";

describe("boardroom.outbox", () => {
  it("parses a generic outbox record", () => {
    const parsed = OutboxRecordSchema.parse({
      id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      eventName: "COMM.SOMETHING",
      payload: { ok: true },
      createdAt: "2026-06-01T10:00:00.000Z",
      processedAt: null,
    });

    expect(parsed.eventName).toBe("COMM.SOMETHING");
  });

  it("parses valid payloads for every boardroom event type", () => {
    const cases = [
      [
        CommMeetingEvents.Created,
        {
          meetingId: "11111111-1111-4111-8111-111111111111",
          orgId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          title: "Quarterly board meeting",
          chairId: "22222222-2222-4222-8222-222222222222",
          scheduledAt: null,
          correlationId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        },
      ],
      [
        CommMeetingEvents.Updated,
        {
          meetingId: "11111111-1111-4111-8111-111111111111",
          orgId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          title: "Quarterly board meeting (updated)",
          correlationId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        },
      ],
      [
        CommMeetingEvents.Deleted,
        {
          meetingId: "11111111-1111-4111-8111-111111111111",
          orgId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          correlationId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        },
      ],
      [
        CommMeetingEvents.Started,
        {
          meetingId: "11111111-1111-4111-8111-111111111111",
          orgId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          startedAt: "2026-06-01T10:00:00.000Z",
          correlationId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        },
      ],
      [
        CommMeetingEvents.Adjourned,
        {
          meetingId: "11111111-1111-4111-8111-111111111111",
          orgId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          adjournedAt: "2026-06-01T11:00:00.000Z",
          note: "Lunch break",
          correlationId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        },
      ],
      [
        CommMeetingEvents.Cancelled,
        {
          meetingId: "11111111-1111-4111-8111-111111111111",
          orgId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          reason: "Schedule conflict",
          correlationId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        },
      ],
      [
        CommMeetingEvents.Completed,
        {
          meetingId: "11111111-1111-4111-8111-111111111111",
          orgId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          completedAt: "2026-06-01T12:00:00.000Z",
          correlationId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        },
      ],
      [
        CommAgendaItemEvents.Added,
        {
          agendaItemId: "55555555-5555-4555-8555-555555555555",
          meetingId: "11111111-1111-4111-8111-111111111111",
          orgId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          title: "Budget review",
          sortOrder: 1,
          presenterId: null,
          correlationId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        },
      ],
      [
        CommAgendaItemEvents.Updated,
        {
          agendaItemId: "55555555-5555-4555-8555-555555555555",
          meetingId: "11111111-1111-4111-8111-111111111111",
          orgId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          correlationId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        },
      ],
      [
        CommAgendaItemEvents.Removed,
        {
          agendaItemId: "55555555-5555-4555-8555-555555555555",
          meetingId: "11111111-1111-4111-8111-111111111111",
          orgId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          correlationId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        },
      ],
      [
        CommAttendeeEvents.Added,
        {
          attendeeId: "66666666-6666-4666-8666-666666666666",
          meetingId: "11111111-1111-4111-8111-111111111111",
          orgId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          principalId: "22222222-2222-4222-8222-222222222222",
          role: null,
          correlationId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        },
      ],
      [
        CommAttendeeEvents.Updated,
        {
          attendeeId: "66666666-6666-4666-8666-666666666666",
          meetingId: "11111111-1111-4111-8111-111111111111",
          orgId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          status: "confirmed",
          role: null,
          correlationId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        },
      ],
      [
        CommAttendeeEvents.StatusUpdated,
        {
          attendeeId: "66666666-6666-4666-8666-666666666666",
          meetingId: "11111111-1111-4111-8111-111111111111",
          orgId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          status: "attended",
          correlationId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        },
      ],
      [
        CommAttendeeEvents.Removed,
        {
          attendeeId: "66666666-6666-4666-8666-666666666666",
          meetingId: "11111111-1111-4111-8111-111111111111",
          orgId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          correlationId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        },
      ],
      [
        CommResolutionEvents.Proposed,
        {
          resolutionId: "77777777-7777-4777-8777-777777777777",
          meetingId: "11111111-1111-4111-8111-111111111111",
          orgId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          title: "Approve budget",
          correlationId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        },
      ],
      [
        CommResolutionEvents.Updated,
        {
          resolutionId: "77777777-7777-4777-8777-777777777777",
          orgId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          status: "discussed",
          correlationId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        },
      ],
      [
        CommResolutionEvents.Withdrawn,
        {
          resolutionId: "77777777-7777-4777-8777-777777777777",
          orgId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          status: "deferred",
          reason: "Insufficient quorum",
          correlationId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        },
      ],
      [
        CommResolutionEvents.VoteCast,
        {
          resolutionId: "77777777-7777-4777-8777-777777777777",
          orgId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          principalId: "22222222-2222-4222-8222-222222222222",
          vote: "for",
          correlationId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        },
      ],
      [
        CommMinutesEvents.MinutesRecorded,
        {
          minuteId: "99999999-9999-4999-8999-999999999999",
          meetingId: "11111111-1111-4111-8111-111111111111",
          orgId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          resolutionId: null,
          recordedAt: "2026-06-01T10:00:00.000Z",
          correlationId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        },
      ],
      [
        CommMinutesEvents.ActionItemCreated,
        {
          actionItemId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          minuteId: "99999999-9999-4999-8999-999999999999",
          orgId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          title: "Send follow-up",
          assigneeId: null,
          dueDate: null,
          correlationId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        },
      ],
      [
        CommMinutesEvents.ActionItemUpdated,
        {
          actionItemId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          minuteId: "99999999-9999-4999-8999-999999999999",
          orgId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          status: "done",
          closedAt: "2026-06-01T10:30:00.000Z",
          correlationId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        },
      ],
      [
        CommMinutesEvents.ActionItemDeleted,
        {
          actionItemId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          minuteId: "99999999-9999-4999-8999-999999999999",
          orgId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          correlationId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        },
      ],
    ] as const;

    expect(BoardroomEventTypes).toHaveLength(cases.length);

    for (const [eventName, payload] of cases) {
      const parsed = BoardroomOutboxRecordSchema.parse({
        id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
        eventName,
        payload,
        createdAt: "2026-06-01T10:00:00.000Z",
      });

      expect(parsed.eventName).toBe(eventName);
    }
  });

  it("rejects payload mismatches by event type", () => {
    const result = BoardroomOutboxRecordSchema.safeParse({
      id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      eventName: CommMeetingEvents.Created,
      payload: {
        attendeeId: "66666666-6666-4666-8666-666666666666",
      },
      createdAt: "2026-06-01T10:00:00.000Z",
    });

    expect(result.success).toBe(false);
  });
});

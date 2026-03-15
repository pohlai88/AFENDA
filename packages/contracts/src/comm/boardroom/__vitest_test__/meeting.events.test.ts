import { describe, expect, it } from "vitest";
import {
  BoardMeetingEventTypes,
  CommMeetingEventTypes,
  CommMeetingEvents,
} from "../meeting.events.js";

describe("meeting.events", () => {
  it("keeps the registry and aggregate list aligned", () => {
    expect(BoardMeetingEventTypes).toEqual(
      expect.arrayContaining([
        CommMeetingEvents.Created,
        CommMeetingEvents.Updated,
        CommMeetingEvents.Deleted,
        CommMeetingEvents.Started,
        CommMeetingEvents.Adjourned,
        CommMeetingEvents.Cancelled,
        CommMeetingEvents.Completed,
      ]),
    );
  });

  it("keeps event names unique", () => {
    expect(new Set(BoardMeetingEventTypes).size).toBe(BoardMeetingEventTypes.length);
  });

  it("keeps canonical and legacy event type aliases aligned", () => {
    expect(CommMeetingEventTypes).toEqual(BoardMeetingEventTypes);
  });
});

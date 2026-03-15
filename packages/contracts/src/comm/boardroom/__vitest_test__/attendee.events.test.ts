import { describe, expect, it } from "vitest";
import {
  BoardAttendeeEventTypes,
  CommAttendeeEventTypes,
  CommAttendeeEvents,
} from "../attendee.events.js";

describe("attendee.events", () => {
  it("keeps the registry and aggregate list aligned", () => {
    expect(BoardAttendeeEventTypes).toEqual(
      expect.arrayContaining([
        CommAttendeeEvents.Added,
        CommAttendeeEvents.Updated,
        CommAttendeeEvents.StatusUpdated,
        CommAttendeeEvents.Removed,
      ]),
    );
  });

  it("keeps event names unique", () => {
    expect(new Set(BoardAttendeeEventTypes).size).toBe(BoardAttendeeEventTypes.length);
  });

  it("keeps canonical and legacy event type aliases aligned", () => {
    expect(CommAttendeeEventTypes).toEqual(BoardAttendeeEventTypes);
  });
});

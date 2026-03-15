import { describe, expect, it } from "vitest";
import {
  CommMinutesEventTypes,
  CommMinutesEvents,
  MinutesEventTypes,
} from "../minutes.events.js";

describe("minutes.events", () => {
  it("keeps the registry and aggregate list aligned", () => {
    expect(CommMinutesEventTypes).toEqual(
      expect.arrayContaining([
        CommMinutesEvents.MinutesRecorded,
        CommMinutesEvents.ActionItemCreated,
        CommMinutesEvents.ActionItemUpdated,
        CommMinutesEvents.ActionItemDeleted,
      ]),
    );
  });

  it("keeps event names unique", () => {
    expect(new Set(CommMinutesEventTypes).size).toBe(CommMinutesEventTypes.length);
  });

  it("keeps canonical and legacy event type aliases aligned", () => {
    expect(MinutesEventTypes).toEqual(CommMinutesEventTypes);
  });
});

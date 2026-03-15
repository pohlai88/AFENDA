import { describe, expect, it } from "vitest";
import {
  BoardResolutionEventTypes,
  CommResolutionEventTypes,
  CommResolutionEvents,
  ResolutionEventTypes,
} from "../resolution.events.js";

describe("resolution.events", () => {
  it("keeps the registry and aggregate list aligned", () => {
    expect(BoardResolutionEventTypes).toEqual(
      expect.arrayContaining([
        CommResolutionEvents.Proposed,
        CommResolutionEvents.Updated,
        CommResolutionEvents.Withdrawn,
        CommResolutionEvents.VoteCast,
      ]),
    );
  });

  it("keeps event names unique", () => {
    expect(new Set(BoardResolutionEventTypes).size).toBe(BoardResolutionEventTypes.length);
  });

  it("keeps canonical and legacy event type aliases aligned", () => {
    expect(CommResolutionEventTypes).toEqual(BoardResolutionEventTypes);
    expect(ResolutionEventTypes).toEqual(BoardResolutionEventTypes);
  });
});

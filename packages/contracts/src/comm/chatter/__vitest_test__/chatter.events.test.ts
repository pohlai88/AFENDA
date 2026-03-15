import { describe, expect, it } from "vitest";
import {
  CommChatterMessagePostedPayloadSchema,
  COMM_CHATTER_MESSAGE_DELETED,
  COMM_CHATTER_MESSAGE_POSTED,
  COMM_CHATTER_MESSAGE_UPDATED,
  ChatterEventTypes,
  CommChatterEvents,
} from "../chatter.events.js";

describe("chatter.events – constants", () => {
  it("all event types follow COMM.<ENTITY>_<ACTION> naming", () => {
    for (const et of ChatterEventTypes) {
      expect(et).toMatch(/^COMM\./);
    }
  });

  it("CommChatterEvents registry has correct values", () => {
    expect(CommChatterEvents.MessagePosted).toBe(COMM_CHATTER_MESSAGE_POSTED);
    expect(CommChatterEvents.MessageUpdated).toBe(COMM_CHATTER_MESSAGE_UPDATED);
    expect(CommChatterEvents.MessageDeleted).toBe(COMM_CHATTER_MESSAGE_DELETED);
  });

  it("ChatterEventTypes contains exactly 3 events", () => {
    expect(ChatterEventTypes).toHaveLength(3);
  });

  it("ChatterEventTypes has no duplicates", () => {
    expect(new Set(ChatterEventTypes).size).toBe(ChatterEventTypes.length);
  });

  it("re-exports payload schema surface from events module", () => {
    expect(CommChatterMessagePostedPayloadSchema).toBeDefined();
  });
});

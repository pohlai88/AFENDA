import { describe, expect, it } from "vitest";
import {
  BoardroomOutboxRecordSchema,
  CommMeetingEvents,
  GetBoardMeetingResponseSchema,
  MeetingCreatedEventSchema,
} from "../index.js";

describe("boardroom index barrel", () => {
  it("re-exports key upgraded contracts", () => {
    expect(CommMeetingEvents.Created).toBe("COMM.MEETING_CREATED");
    expect(typeof MeetingCreatedEventSchema.safeParse).toBe("function");
    expect(typeof BoardroomOutboxRecordSchema.safeParse).toBe("function");
    expect(typeof GetBoardMeetingResponseSchema.safeParse).toBe("function");
  });
});

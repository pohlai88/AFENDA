import { describe, expect, it } from "vitest";
import {
  AnnouncementOutboxRecordSchema,
  AnnouncementSchema,
  CommAnnouncementEvents,
  CreateAnnouncementCommandSchema,
  GetAnnouncementQuerySchema,
} from "../index.js";

describe("announcements barrel exports", () => {
  it("exports key schemas and event constants", () => {
    expect(AnnouncementSchema).toBeDefined();
    expect(CreateAnnouncementCommandSchema).toBeDefined();
    expect(GetAnnouncementQuerySchema).toBeDefined();
    expect(AnnouncementOutboxRecordSchema).toBeDefined();
    expect(CommAnnouncementEvents.Updated).toBe("COMM.ANNOUNCEMENT_UPDATED");
  });
});

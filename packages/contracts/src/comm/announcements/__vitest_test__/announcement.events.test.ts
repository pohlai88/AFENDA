import { describe, expect, it } from "vitest";
import {
  AnnouncementEventTypes,
  COMM_ANNOUNCEMENT_ACKNOWLEDGED,
  COMM_ANNOUNCEMENT_ARCHIVED,
  COMM_ANNOUNCEMENT_CREATED,
  COMM_ANNOUNCEMENT_PUBLISHED,
  COMM_ANNOUNCEMENT_RESCHEDULED,
  COMM_ANNOUNCEMENT_SCHEDULED,
  COMM_ANNOUNCEMENT_UNARCHIVED,
  COMM_ANNOUNCEMENT_UNSCHEDULED,
  COMM_ANNOUNCEMENT_UPDATED,
  CommAnnouncementEvents,
} from "../announcement.events.js";

describe("announcement events", () => {
  it("keeps constants mapped correctly", () => {
    expect(CommAnnouncementEvents.Published).toBe(COMM_ANNOUNCEMENT_PUBLISHED);
    expect(CommAnnouncementEvents.Scheduled).toBe(COMM_ANNOUNCEMENT_SCHEDULED);
    expect(CommAnnouncementEvents.Acknowledged).toBe(COMM_ANNOUNCEMENT_ACKNOWLEDGED);
    expect(CommAnnouncementEvents.Archived).toBe(COMM_ANNOUNCEMENT_ARCHIVED);
    expect(CommAnnouncementEvents.Created).toBe(COMM_ANNOUNCEMENT_CREATED);
    expect(CommAnnouncementEvents.Updated).toBe(COMM_ANNOUNCEMENT_UPDATED);
    expect(CommAnnouncementEvents.Rescheduled).toBe(COMM_ANNOUNCEMENT_RESCHEDULED);
    expect(CommAnnouncementEvents.Unscheduled).toBe(COMM_ANNOUNCEMENT_UNSCHEDULED);
    expect(CommAnnouncementEvents.Unarchived).toBe(COMM_ANNOUNCEMENT_UNARCHIVED);
  });

  it("keeps AnnouncementEventTypes unique", () => {
    const unique = new Set(AnnouncementEventTypes);
    expect(unique.size).toBe(AnnouncementEventTypes.length);
  });

  it("includes all event constants in AnnouncementEventTypes", () => {
    const expected = Object.values(CommAnnouncementEvents);
    expect(AnnouncementEventTypes).toEqual(expected);
  });
});

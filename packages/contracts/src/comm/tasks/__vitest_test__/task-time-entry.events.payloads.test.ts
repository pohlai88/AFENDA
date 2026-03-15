import { describe, expect, it } from "vitest";
import {
  TimeEntryCreatedEventSchema,
  TimeEntryUpdatedEventSchema,
  TimeEntryDeletedEventSchema,
} from "../task-time-entry.events.payloads.js";

const ORG_ID = "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa";
const PRINCIPAL_ID = "bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb";
const TASK_ID = "cccccccc-cccc-4ccc-accc-cccccccccccc";
const ENTRY_ID = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const CORR_ID = "ffffffff-ffff-4fff-afff-ffffffffffff";

describe("task-time-entry.events.payloads", () => {
  it("parses TimeEntryCreatedEventSchema", () => {
    const result = TimeEntryCreatedEventSchema.safeParse({
      taskId: TASK_ID,
      orgId: ORG_ID,
      timeEntryId: ENTRY_ID,
      principalId: PRINCIPAL_ID,
      minutes: 60,
      entryDate: "2026-06-15",
      correlationId: CORR_ID,
    });
    expect(result.success).toBe(true);
  });

  it("rejects TimeEntryCreatedEventSchema with zero minutes", () => {
    const result = TimeEntryCreatedEventSchema.safeParse({
      taskId: TASK_ID,
      orgId: ORG_ID,
      timeEntryId: ENTRY_ID,
      principalId: PRINCIPAL_ID,
      minutes: 0,
      entryDate: "2026-06-15",
      correlationId: CORR_ID,
    });
    expect(result.success).toBe(false);
  });

  it("rejects TimeEntryCreatedEventSchema with negative minutes", () => {
    const result = TimeEntryCreatedEventSchema.safeParse({
      taskId: TASK_ID,
      orgId: ORG_ID,
      timeEntryId: ENTRY_ID,
      principalId: PRINCIPAL_ID,
      minutes: -30,
      entryDate: "2026-06-15",
      correlationId: CORR_ID,
    });
    expect(result.success).toBe(false);
  });

  it("parses TimeEntryUpdatedEventSchema", () => {
    const result = TimeEntryUpdatedEventSchema.safeParse({
      taskId: TASK_ID,
      orgId: ORG_ID,
      timeEntryId: ENTRY_ID,
      principalId: PRINCIPAL_ID,
      correlationId: CORR_ID,
    });
    expect(result.success).toBe(true);
  });

  it("parses TimeEntryDeletedEventSchema", () => {
    const result = TimeEntryDeletedEventSchema.safeParse({
      taskId: TASK_ID,
      orgId: ORG_ID,
      timeEntryId: ENTRY_ID,
      deletedByPrincipalId: PRINCIPAL_ID,
      correlationId: CORR_ID,
    });
    expect(result.success).toBe(true);
  });
});

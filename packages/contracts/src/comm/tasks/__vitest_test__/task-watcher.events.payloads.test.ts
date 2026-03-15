import { describe, expect, it } from "vitest";
import {
  WatcherAddedEventSchema,
  WatcherRemovedEventSchema,
} from "../task-watcher.events.payloads.js";

const ORG_ID = "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa";
const PRINCIPAL_ID = "bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb";
const TASK_ID = "cccccccc-cccc-4ccc-accc-cccccccccccc";
const WATCHER_ID = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const CORR_ID = "ffffffff-ffff-4fff-afff-ffffffffffff";

describe("task-watcher.events.payloads", () => {
  it("parses WatcherAddedEventSchema", () => {
    const result = WatcherAddedEventSchema.safeParse({
      taskId: TASK_ID,
      orgId: ORG_ID,
      watcherId: WATCHER_ID,
      principalId: PRINCIPAL_ID,
      addedByPrincipalId: PRINCIPAL_ID,
      correlationId: CORR_ID,
    });
    expect(result.success).toBe(true);
  });

  it("rejects WatcherAddedEventSchema missing principalId", () => {
    const result = WatcherAddedEventSchema.safeParse({
      taskId: TASK_ID,
      orgId: ORG_ID,
      watcherId: WATCHER_ID,
      addedByPrincipalId: PRINCIPAL_ID,
      correlationId: CORR_ID,
    });
    expect(result.success).toBe(false);
  });

  it("parses WatcherRemovedEventSchema", () => {
    const result = WatcherRemovedEventSchema.safeParse({
      taskId: TASK_ID,
      orgId: ORG_ID,
      principalId: PRINCIPAL_ID,
      removedByPrincipalId: PRINCIPAL_ID,
      correlationId: CORR_ID,
    });
    expect(result.success).toBe(true);
  });

  it("rejects WatcherRemovedEventSchema missing removedByPrincipalId", () => {
    const result = WatcherRemovedEventSchema.safeParse({
      taskId: TASK_ID,
      orgId: ORG_ID,
      principalId: PRINCIPAL_ID,
      correlationId: CORR_ID,
    });
    expect(result.success).toBe(false);
  });
});

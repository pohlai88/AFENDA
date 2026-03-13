import { describe, expect, it } from "vitest";
import { getEntityHref } from "../links";

type InboxEntityType =
  | "task"
  | "project"
  | "approval_request"
  | "document"
  | "board_meeting"
  | "announcement";

function makeInboxItem(
  entityType: InboxEntityType,
  entityId = "00000000-0000-0000-0000-000000000001",
): { entityType: InboxEntityType; entityId: string } {
  return {
    entityType,
    entityId,
  };
}

describe("Inbox deep links", () => {
  it("routes announcement inbox items to announcement detail", () => {
    const href = getEntityHref(makeInboxItem("announcement", "ann-123"));
    expect(href).toBe("/comm/announcements/ann-123");
  });

  it("routes known entity types to module detail pages", () => {
    expect(getEntityHref(makeInboxItem("task", "task-1"))).toBe("/comm/tasks/task-1");
    expect(getEntityHref(makeInboxItem("project", "project-1"))).toBe("/comm/projects/project-1");
    expect(getEntityHref(makeInboxItem("approval_request", "apr-1"))).toBe("/comm/approvals/apr-1");
    expect(getEntityHref(makeInboxItem("document", "doc-123"))).toBe("/comm/docs/doc-123");
  });
});

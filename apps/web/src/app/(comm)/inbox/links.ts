type InboxLinkEntityType =
  | "task"
  | "project"
  | "approval_request"
  | "document"
  | "board_meeting"
  | "announcement";

export function getEntityHref(item: { entityType: InboxLinkEntityType; entityId: string }): string {
  switch (item.entityType) {
    case "task":
      return `/comm/tasks/${item.entityId}`;
    case "project":
      return `/comm/projects/${item.entityId}`;
    case "approval_request":
      return `/comm/approvals/${item.entityId}`;
    case "announcement":
      return `/comm/announcements/${item.entityId}`;
    case "document":
      return `/comm/docs/${item.entityId}`;
    case "board_meeting":
      return `/comm/boardroom/${item.entityId}`;
    default:
      return "/comm";
  }
}

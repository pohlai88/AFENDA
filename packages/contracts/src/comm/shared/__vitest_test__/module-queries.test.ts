import { describe, expect, it } from "vitest";
import { ListCommentsQuerySchema } from "../comment.queries.js";
import { ListInboxItemsQuerySchema } from "../inbox.queries.js";
import { ListLabelsQuerySchema } from "../label.queries.js";
import { ListSavedViewsQuerySchema } from "../saved-view.queries.js";
import { ListSubscriptionsQuerySchema } from "../subscription.queries.js";

describe("shared module query schemas", () => {
  it("applies list defaults for comment/inbox/label/subscription queries", () => {
    const comments = ListCommentsQuerySchema.parse({
      entityType: "task",
      entityId: "11111111-1111-4111-8111-111111111111",
    });
    const inbox = ListInboxItemsQuerySchema.parse({});
    const labels = ListLabelsQuerySchema.parse({});
    const subscriptions = ListSubscriptionsQuerySchema.parse({});

    expect(comments.limit).toBe(50);
    expect(inbox.limit).toBe(50);
    expect(labels.limit).toBe(50);
    expect(subscriptions.limit).toBe(50);
    expect(inbox.unreadOnly).toBe(false);
  });

  it("applies saved-view boolean defaults", () => {
    const parsed = ListSavedViewsQuerySchema.parse({
      entityType: "task",
    });

    expect(parsed.includeOrgShared).toBe(true);
    expect(parsed.defaultOnly).toBe(false);
  });

  it("rejects blank label entityId when provided", () => {
    const result = ListLabelsQuerySchema.safeParse({
      entityId: "   ",
    });

    expect(result.success).toBe(false);
  });
});

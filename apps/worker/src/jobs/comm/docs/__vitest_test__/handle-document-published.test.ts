import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../shared/inbox-fanout.js", () => ({
  createInboxItems: vi.fn(),
  listSubscriberPrincipalIds: vi.fn(),
}));

import { createInboxItems, listSubscriberPrincipalIds } from "../../shared/inbox-fanout.js";
import { handleDocumentPublished } from "../handle-document-published.js";

function createHelpers() {
  return {
    addJob: vi.fn(),
    logger: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    },
    withPgClient: vi.fn(),
  } as const;
}

describe("handleDocumentPublished", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("warns and exits for unexpected event type", async () => {
    const helpers = createHelpers();

    await handleDocumentPublished(
      {
        type: "COMM.UNRELATED",
        orgId: "00000000-0000-0000-0000-000000000001",
        correlationId: "corr-1",
        payload: {
          documentId: "00000000-0000-0000-0000-000000000010",
          documentNumber: "DOC-0001",
          title: "Policy doc",
          orgId: "00000000-0000-0000-0000-000000000001",
          correlationId: "corr-1",
        },
      },
      helpers as never,
    );

    expect(helpers.logger.warn).toHaveBeenCalledTimes(1);
    expect(listSubscriberPrincipalIds).not.toHaveBeenCalled();
    expect(createInboxItems).not.toHaveBeenCalled();
  });

  it("fans out inbox items to subscribers when document is published", async () => {
    const helpers = createHelpers();
    vi.mocked(listSubscriberPrincipalIds).mockResolvedValue([
      "00000000-0000-0000-0000-0000000000A1",
      "00000000-0000-0000-0000-0000000000B2",
    ]);
    vi.mocked(createInboxItems).mockResolvedValue(2);

    await handleDocumentPublished(
      {
        type: "COMM.DOCUMENT_PUBLISHED",
        orgId: "00000000-0000-0000-0000-000000000001",
        correlationId: "corr-2",
        payload: {
          documentId: "00000000-0000-0000-0000-000000000010",
          documentNumber: "DOC-0002",
          title: "Published policy",
          orgId: "00000000-0000-0000-0000-000000000001",
          correlationId: "corr-2",
        },
      },
      helpers as never,
    );

    expect(listSubscriberPrincipalIds).toHaveBeenCalledTimes(1);
    expect(listSubscriberPrincipalIds).toHaveBeenCalledWith(
      helpers,
      "00000000-0000-0000-0000-000000000001",
      "document",
      "00000000-0000-0000-0000-000000000010",
    );
    expect(createInboxItems).toHaveBeenCalledTimes(1);

    const [callHelpers, items] = vi.mocked(createInboxItems).mock.calls[0]!;
    expect(callHelpers).toBe(helpers);
    expect(items).toHaveLength(2);
    expect(items.map((item) => item.principalId).sort()).toEqual([
      "00000000-0000-0000-0000-0000000000A1",
      "00000000-0000-0000-0000-0000000000B2",
    ]);
    expect(items.every((item) => item.entityType === "document")).toBe(true);
    expect(items.every((item) => item.entityId === "00000000-0000-0000-0000-000000000010")).toBe(
      true,
    );
    expect(items.every((item) => item.title === "Document published")).toBe(true);
  });

  it("skips fan-out when no subscribers", async () => {
    const helpers = createHelpers();
    vi.mocked(listSubscriberPrincipalIds).mockResolvedValue([]);

    await handleDocumentPublished(
      {
        type: "COMM.DOCUMENT_PUBLISHED",
        orgId: "00000000-0000-0000-0000-000000000001",
        correlationId: "corr-3",
        payload: {
          documentId: "00000000-0000-0000-0000-000000000010",
          documentNumber: "DOC-0003",
          title: "No watchers",
          orgId: "00000000-0000-0000-0000-000000000001",
          correlationId: "corr-3",
        },
      },
      helpers as never,
    );

    expect(createInboxItems).not.toHaveBeenCalled();
    expect(helpers.logger.info).toHaveBeenCalled();
  });
});

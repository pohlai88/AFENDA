import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../shared/inbox-fanout.js", () => ({
  createInboxItems: vi.fn(),
}));

import { createInboxItems } from "../../shared/inbox-fanout.js";
import { handleAnnouncementPublished } from "../handle-announcement-published.js";

type MockRow = Record<string, unknown>;

function createHelpers(rows: MockRow[] = []) {
  const query = vi.fn().mockResolvedValue({ rows });
  return {
    addJob: vi.fn(),
    logger: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    },
    withPgClient: vi.fn(async (cb: (pgClient: { query: typeof query }) => Promise<unknown>) =>
      cb({ query }),
    ),
    _query: query,
  } as const;
}

describe("handleAnnouncementPublished", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("warns and exits for unexpected event type", async () => {
    const helpers = createHelpers();

    await handleAnnouncementPublished(
      {
        type: "COMM.UNRELATED",
        orgId: "00000000-0000-0000-0000-000000000001",
        correlationId: "corr-1",
        payload: {
          announcementId: "00000000-0000-0000-0000-000000000010",
          announcementNumber: "ANN-0001",
          orgId: "00000000-0000-0000-0000-000000000001",
          title: "Quarterly update",
          audienceType: "org",
          audienceIds: [],
          correlationId: "corr-1",
        },
      },
      helpers as any,
    );

    expect(helpers.logger.warn).toHaveBeenCalledTimes(1);
    expect(helpers.withPgClient).not.toHaveBeenCalled();
    expect(createInboxItems).not.toHaveBeenCalled();
  });

  it("deduplicates resolved principals and fans out inbox items", async () => {
    const helpers = createHelpers([
      { principal_id: "00000000-0000-0000-0000-0000000000A1" },
      { principal_id: "00000000-0000-0000-0000-0000000000A1" },
      { principal_id: "00000000-0000-0000-0000-0000000000B2" },
    ]);

    vi.mocked(createInboxItems).mockResolvedValue(2);

    await handleAnnouncementPublished(
      {
        type: "COMM.ANNOUNCEMENT_PUBLISHED",
        orgId: "00000000-0000-0000-0000-000000000001",
        correlationId: "corr-2",
        payload: {
          announcementId: "00000000-0000-0000-0000-000000000010",
          announcementNumber: "ANN-0002",
          orgId: "00000000-0000-0000-0000-000000000001",
          title: "Policy refresh",
          audienceType: "org",
          audienceIds: [],
          correlationId: "corr-2",
        },
      },
      helpers as any,
    );

    expect(helpers.withPgClient).toHaveBeenCalledTimes(1);
    expect(createInboxItems).toHaveBeenCalledTimes(1);

    const [callHelpers, items] = vi.mocked(createInboxItems).mock.calls[0]!;
    expect(callHelpers).toBe(helpers);
    expect(items).toHaveLength(2);
    expect(items.map((item) => item.principalId).sort()).toEqual([
      "00000000-0000-0000-0000-0000000000A1",
      "00000000-0000-0000-0000-0000000000B2",
    ]);
  });

  it("skips fan-out when no audience principals resolve", async () => {
    const helpers = createHelpers([]);
    vi.mocked(createInboxItems).mockResolvedValue(0);

    await handleAnnouncementPublished(
      {
        type: "COMM.ANNOUNCEMENT_PUBLISHED",
        orgId: "00000000-0000-0000-0000-000000000001",
        correlationId: "corr-3",
        payload: {
          announcementId: "00000000-0000-0000-0000-000000000010",
          announcementNumber: "ANN-0003",
          orgId: "00000000-0000-0000-0000-000000000001",
          title: "No recipients",
          audienceType: "team",
          audienceIds: ["00000000-0000-0000-0000-0000000000C1"],
          correlationId: "corr-3",
        },
      },
      helpers as any,
    );

    expect(createInboxItems).not.toHaveBeenCalled();
    expect(helpers.logger.info).toHaveBeenCalled();
  });
});

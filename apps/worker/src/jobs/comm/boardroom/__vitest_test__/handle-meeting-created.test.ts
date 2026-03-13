import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../shared/inbox-fanout.js", () => ({
  createInboxItems: vi.fn(),
}));

import { createInboxItems } from "../../shared/inbox-fanout.js";
import { handleMeetingCreated } from "../handle-meeting-created.js";

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

describe("handleMeetingCreated", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("warns and exits for unexpected event type", async () => {
    const helpers = createHelpers();

    await handleMeetingCreated(
      {
        type: "COMM.UNRELATED",
        payload: {
          meetingId: "00000000-0000-0000-0000-000000000010",
          meetingNumber: "MTG-001",
          title: "Q1 Review",
          orgId: "00000000-0000-0000-0000-000000000001",
          correlationId: "corr-1",
        },
      },
      helpers as any,
    );

    expect(helpers.logger.warn).toHaveBeenCalledTimes(1);
    expect(createInboxItems).not.toHaveBeenCalled();
  });

  it("fans out inbox items to chair and secretary", async () => {
    const helpers = createHelpers();
    vi.mocked(createInboxItems).mockResolvedValue(2);

    await handleMeetingCreated(
      {
        type: "COMM.MEETING_CREATED",
        payload: {
          meetingId: "00000000-0000-0000-0000-000000000010",
          meetingNumber: "MTG-001",
          title: "Q1 Review",
          orgId: "00000000-0000-0000-0000-000000000001",
          correlationId: "corr-1",
          chairId: "00000000-0000-0000-0000-0000000000A1",
          secretaryId: "00000000-0000-0000-0000-0000000000B2",
        },
      },
      helpers as any,
    );

    expect(createInboxItems).toHaveBeenCalledTimes(1);
    const [, items] = vi.mocked(createInboxItems).mock.calls[0]!;
    expect(items).toHaveLength(2);
    expect(items.map((i) => i.principalId).sort()).toEqual([
      "00000000-0000-0000-0000-0000000000A1",
      "00000000-0000-0000-0000-0000000000B2",
    ]);
    expect(items.every((i) => i.entityType === "board_meeting")).toBe(true);
    expect(items.every((i) => i.entityId === "00000000-0000-0000-0000-000000000010")).toBe(true);
    expect(items.every((i) => i.title === "Board meeting")).toBe(true);
  });

  it("deduplicates when chair and secretary are the same", async () => {
    const helpers = createHelpers();
    vi.mocked(createInboxItems).mockResolvedValue(1);

    await handleMeetingCreated(
      {
        type: "COMM.MEETING_CREATED",
        payload: {
          meetingId: "00000000-0000-0000-0000-000000000010",
          meetingNumber: "MTG-001",
          title: "Q1 Review",
          orgId: "00000000-0000-0000-0000-000000000001",
          correlationId: "corr-1",
          chairId: "00000000-0000-0000-0000-0000000000A1",
          secretaryId: "00000000-0000-0000-0000-0000000000A1",
        },
      },
      helpers as any,
    );

    expect(createInboxItems).toHaveBeenCalledTimes(1);
    const [, items] = vi.mocked(createInboxItems).mock.calls[0]!;
    expect(items).toHaveLength(1);
    expect(items[0]!.principalId).toBe("00000000-0000-0000-0000-0000000000A1");
  });

  it("skips fan-out when no chair or secretary", async () => {
    const helpers = createHelpers();

    await handleMeetingCreated(
      {
        type: "COMM.MEETING_CREATED",
        payload: {
          meetingId: "00000000-0000-0000-0000-000000000010",
          meetingNumber: "MTG-001",
          title: "Q1 Review",
          orgId: "00000000-0000-0000-0000-000000000001",
          correlationId: "corr-1",
        },
      },
      helpers as any,
    );

    expect(createInboxItems).not.toHaveBeenCalled();
    expect(helpers.logger.info).toHaveBeenCalledWith(
      expect.stringContaining("inbox fan-out skipped"),
    );
  });
});

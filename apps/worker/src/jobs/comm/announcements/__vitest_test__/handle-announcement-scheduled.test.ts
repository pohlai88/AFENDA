import { beforeEach, describe, expect, it, vi } from "vitest";
import { handleAnnouncementScheduled } from "../handle-announcement-scheduled.js";

function createHelpers(rowsForFirstQuery?: Array<Record<string, unknown>>) {
  const query = vi
    .fn()
    .mockResolvedValueOnce({ rows: rowsForFirstQuery ?? [] })
    .mockResolvedValue({ rows: [] });

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

describe("handleAnnouncementScheduled", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("queues a due job for scheduled announcements", async () => {
    const helpers = createHelpers();

    await handleAnnouncementScheduled(
      {
        type: "COMM.ANNOUNCEMENT_SCHEDULED",
        orgId: "00000000-0000-0000-0000-000000000001",
        correlationId: "corr-10",
        payload: {
          announcementId: "00000000-0000-0000-0000-000000000010",
          announcementNumber: "ANN-1010",
          orgId: "00000000-0000-0000-0000-000000000001",
          scheduledAt: "2030-01-01T12:00:00.000Z",
          correlationId: "corr-10",
        },
      },
      helpers as any,
    );

    expect(helpers.addJob).toHaveBeenCalledTimes(1);
    const [task, payload, options] = helpers.addJob.mock.calls[0]!;
    expect(task).toBe("handle_announcement_scheduled");
    expect(payload.type).toBe("COMM.ANNOUNCEMENT_SCHEDULED_DUE");
    expect(options.jobKey).toBe(
      "comm_announcement_publish_due:00000000-0000-0000-0000-000000000010",
    );
    expect(options.jobKeyMode).toBe("replace");
    expect(options.maxAttempts).toBe(10);
    expect(options.runAt.toISOString()).toBe("2030-01-01T12:00:00.000Z");
  });

  it("warns and skips when scheduledAt is invalid", async () => {
    const helpers = createHelpers();

    await handleAnnouncementScheduled(
      {
        type: "COMM.ANNOUNCEMENT_SCHEDULED",
        orgId: "00000000-0000-0000-0000-000000000001",
        correlationId: "corr-11",
        payload: {
          announcementId: "00000000-0000-0000-0000-000000000010",
          announcementNumber: "ANN-1011",
          orgId: "00000000-0000-0000-0000-000000000001",
          scheduledAt: "not-a-date",
          correlationId: "corr-11",
        },
      },
      helpers as any,
    );

    expect(helpers.addJob).not.toHaveBeenCalled();
    expect(helpers.logger.warn).toHaveBeenCalledTimes(1);
  });

  it("publishes due announcements and inserts outbox event", async () => {
    const helpers = createHelpers([
      {
        id: "00000000-0000-0000-0000-000000000010",
        announcement_number: "ANN-1012",
        org_id: "00000000-0000-0000-0000-000000000001",
        title: "Due now",
        audience_type: "org",
        audience_ids: [],
      },
    ]);

    await handleAnnouncementScheduled(
      {
        type: "COMM.ANNOUNCEMENT_SCHEDULED_DUE",
        orgId: "00000000-0000-0000-0000-000000000001",
        correlationId: "corr-12",
        payload: {
          announcementId: "00000000-0000-0000-0000-000000000010",
          announcementNumber: "ANN-1012",
          orgId: "00000000-0000-0000-0000-000000000001",
          scheduledAt: "2030-01-01T12:00:00.000Z",
          correlationId: "corr-12",
        },
      },
      helpers as any,
    );

    expect(helpers.withPgClient).toHaveBeenCalledTimes(1);
    expect(helpers._query).toHaveBeenCalledTimes(2);
    expect(helpers.logger.info).toHaveBeenCalled();
  });
});

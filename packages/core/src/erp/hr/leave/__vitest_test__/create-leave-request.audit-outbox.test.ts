import { describe, expect, it, vi } from "vitest";
import { createLeaveRequest } from "../services/create-leave-request.service";
import { HRM_EVENTS } from "../../shared/events/hrm-events";

describe("Create leave request write-path evidence", () => {
  it("writes audit and outbox entries on successful request creation", async () => {
    const leaveReturningMock = vi.fn().mockResolvedValueOnce([
      {
        leaveRequestId: "l1111111-1111-1111-1111-111111111111",
        employmentId: "e1111111-1111-1111-1111-111111111111",
        leaveTypeId: "t1111111-1111-1111-1111-111111111111",
        status: "submitted",
      },
    ]);

    const leaveValuesMock = vi.fn().mockReturnValue({ returning: leaveReturningMock });
    const auditValuesMock = vi.fn().mockResolvedValue(undefined);
    const outboxValuesMock = vi.fn().mockResolvedValue(undefined);

    let insertCount = 0;
    const insertMock = vi.fn(() => {
      insertCount += 1;
      if (insertCount === 1) {
        return { values: leaveValuesMock };
      }
      if (insertCount === 2) {
        return { values: auditValuesMock };
      }
      return { values: outboxValuesMock };
    });

    const tx: any = {
      insert: insertMock,
    };

    const db: any = {
      transaction: vi.fn(async (fn: (txArg: unknown) => Promise<unknown>) => fn(tx)),
    };

    const correlationId = "22222222-2222-4222-8222-222222222222";

    const result = await createLeaveRequest(db, "org-1", "actor-1", correlationId, {
      employmentId: "e1111111-1111-1111-1111-111111111111",
      leaveTypeId: "t1111111-1111-1111-1111-111111111111",
      startDate: "2026-03-01",
      endDate: "2026-03-02",
      requestedAmount: "2",
    });

    expect(result.ok).toBe(true);
    expect(auditValuesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: HRM_EVENTS.LEAVE_REQUEST_CREATED,
        correlationId,
        entityType: "hrm_leave_request",
      }),
    );
    expect(outboxValuesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "HRM.LEAVE_REQUEST_CREATED",
        correlationId,
      }),
    );
  });
});

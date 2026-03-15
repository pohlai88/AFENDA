import { describe, expect, it, vi } from "vitest";
import { recordAttendance } from "../services/record-attendance.service";
import { HRM_EVENTS } from "../../shared/events/hrm-events";

function makeSelectChain(whereMock: (...args: any[]) => Promise<unknown>) {
  const chain: any = {
    from: () => chain,
    where: whereMock,
  };
  return chain;
}

describe("Record attendance write-path evidence", () => {
  it("blocks duplicate attendance record for the same employment and work date", async () => {
    const whereMock = vi.fn().mockResolvedValueOnce([{ id: "existing-attendance-record" }]);

    const tx: any = {
      select: vi.fn(() => makeSelectChain(whereMock)),
      insert: vi.fn(),
    };

    const db: any = {
      transaction: vi.fn(async (fn: (txArg: unknown) => Promise<unknown>) => fn(tx)),
    };

    const result = await recordAttendance(
      db,
      "org-1",
      "actor-1",
      "11111111-1111-4111-8111-111111111111",
      {
        employmentId: "e1111111-1111-1111-1111-111111111111",
        workDate: "2026-03-01",
        attendanceStatus: "present",
      },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("HRM_CONFLICT");
    }
    expect(tx.insert).not.toHaveBeenCalled();
  });

  it("writes audit and outbox entries on successful attendance record", async () => {
    const whereMock = vi.fn().mockResolvedValueOnce([]);

    const attendanceReturningMock = vi.fn().mockResolvedValueOnce([
      {
        attendanceRecordId: "a1111111-1111-1111-1111-111111111111",
        employmentId: "e1111111-1111-1111-1111-111111111111",
        workDate: "2026-03-01",
        attendanceStatus: "present",
      },
    ]);

    const attendanceValuesMock = vi.fn().mockReturnValue({ returning: attendanceReturningMock });
    const auditValuesMock = vi.fn().mockResolvedValue(undefined);
    const outboxValuesMock = vi.fn().mockResolvedValue(undefined);

    let insertCount = 0;
    const insertMock = vi.fn(() => {
      insertCount += 1;
      if (insertCount === 1) {
        return { values: attendanceValuesMock };
      }
      if (insertCount === 2) {
        return { values: auditValuesMock };
      }
      return { values: outboxValuesMock };
    });

    const tx: any = {
      select: vi.fn(() => makeSelectChain(whereMock)),
      insert: insertMock,
    };

    const db: any = {
      transaction: vi.fn(async (fn: (txArg: unknown) => Promise<unknown>) => fn(tx)),
    };

    const correlationId = "11111111-1111-4111-8111-111111111111";

    const result = await recordAttendance(db, "org-1", "actor-1", correlationId, {
      employmentId: "e1111111-1111-1111-1111-111111111111",
      workDate: "2026-03-01",
      attendanceStatus: "present",
      source: "manual",
    });

    expect(result.ok).toBe(true);
    expect(auditValuesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: HRM_EVENTS.ATTENDANCE_RECORDED,
        correlationId,
        entityType: "hrm_attendance_record",
      }),
    );
    expect(outboxValuesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "HRM.ATTENDANCE_RECORDED",
        correlationId,
      }),
    );
  });
});

import type { DbClient } from "@afenda/db";
import { auditLog, hrmAttendanceRecords, outboxEvent } from "@afenda/db";
import { and, eq, sql } from "drizzle-orm";
import { HRM_ERROR_CODES } from "../../shared/constants/hrm-error-codes";
import { HRM_EVENTS } from "../../shared/events/hrm-events";
import { err, ok, type HrmResult } from "../../shared/types/hrm-result";
import type { RecordAttendanceInput, RecordAttendanceOutput } from "../dto/record-attendance.dto";

export async function recordAttendance(
  db: DbClient,
  orgId: string,
  actorPrincipalId: string | undefined,
  correlationId: string,
  input: RecordAttendanceInput,
): Promise<HrmResult<RecordAttendanceOutput>> {
  if (!input.employmentId || !input.workDate || !input.attendanceStatus) {
    return err(
      HRM_ERROR_CODES.INVALID_INPUT,
      "employmentId, workDate and attendanceStatus are required",
    );
  }

  try {
    const data = await db.transaction(async (tx) => {
      const [existing] = await tx
        .select({ id: hrmAttendanceRecords.id })
        .from(hrmAttendanceRecords)
        .where(
          and(
            eq(hrmAttendanceRecords.orgId, orgId),
            eq(hrmAttendanceRecords.employmentId, input.employmentId),
            eq(hrmAttendanceRecords.workDate, input.workDate),
          ),
        );

      if (existing) {
        return err<RecordAttendanceOutput>(
          HRM_ERROR_CODES.CONFLICT,
          "Attendance record already exists for this employment and work date",
          { employmentId: input.employmentId, workDate: input.workDate },
        );
      }

      const [row] = await tx
        .insert(hrmAttendanceRecords)
        .values({
          orgId,
          employmentId: input.employmentId,
          workDate: sql`${input.workDate}::date`,
          attendanceStatus: input.attendanceStatus,
          checkInAt: input.checkInAt ? sql`${input.checkInAt}::timestamptz` : undefined,
          checkOutAt: input.checkOutAt ? sql`${input.checkOutAt}::timestamptz` : undefined,
          source: input.source,
        })
        .returning({
          attendanceRecordId: hrmAttendanceRecords.id,
          employmentId: hrmAttendanceRecords.employmentId,
          workDate: hrmAttendanceRecords.workDate,
          attendanceStatus: hrmAttendanceRecords.attendanceStatus,
        });

      if (!row) {
        throw new Error("Failed to record attendance");
      }

      await tx.insert(auditLog).values({
        orgId,
        actorPrincipalId: actorPrincipalId ?? null,
        action: HRM_EVENTS.ATTENDANCE_RECORDED,
        entityType: "hrm_attendance_record",
        entityId: row.attendanceRecordId,
        correlationId,
        details: {
          attendanceRecordId: row.attendanceRecordId,
          employmentId: row.employmentId,
          workDate: row.workDate,
          attendanceStatus: row.attendanceStatus,
        },
      });

      await tx.insert(outboxEvent).values({
        orgId,
        type: "HRM.ATTENDANCE_RECORDED",
        version: "1",
        correlationId,
        payload: {
          attendanceRecordId: row.attendanceRecordId,
          employmentId: row.employmentId,
          workDate: row.workDate,
          attendanceStatus: row.attendanceStatus,
        },
      });

      return ok<RecordAttendanceOutput>({
        attendanceRecordId: row.attendanceRecordId,
        employmentId: row.employmentId,
        workDate: String(row.workDate),
        attendanceStatus: row.attendanceStatus,
      });
    });

    return data;
  } catch (error) {
    return err(HRM_ERROR_CODES.INTERNAL_ERROR, "Failed to record attendance", {
      cause: error instanceof Error ? error.message : "unknown_error",
    });
  }
}

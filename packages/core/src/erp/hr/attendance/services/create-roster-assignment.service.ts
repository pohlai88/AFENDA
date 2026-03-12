import type { DbClient } from "@afenda/db";
import { auditLog, hrmRosterAssignments, outboxEvent } from "@afenda/db";
import { and, eq, sql } from "drizzle-orm";
import { HRM_ERROR_CODES } from "../../shared/constants/hrm-error-codes";
import { HRM_EVENTS } from "../../shared/events/hrm-events";
import { err, ok, type HrmResult } from "../../shared/types/hrm-result";
import type {
  CreateRosterAssignmentInput,
  CreateRosterAssignmentOutput,
} from "../dto/create-roster-assignment.dto";

function normalizeRosterStatus(status: string | undefined): string {
  if (!status) return "scheduled";
  return status;
}

export async function createRosterAssignment(
  db: DbClient,
  orgId: string,
  actorPrincipalId: string | undefined,
  correlationId: string,
  input: CreateRosterAssignmentInput,
): Promise<HrmResult<CreateRosterAssignmentOutput>> {
  if (!input.employmentId || !input.shiftId || !input.workDate) {
    return err(HRM_ERROR_CODES.INVALID_INPUT, "employmentId, shiftId and workDate are required");
  }

  try {
    const data = await db.transaction(async (tx) => {
      const [existing] = await tx
        .select({ id: hrmRosterAssignments.id })
        .from(hrmRosterAssignments)
        .where(
          and(
            eq(hrmRosterAssignments.orgId, orgId),
            eq(hrmRosterAssignments.employmentId, input.employmentId),
            eq(hrmRosterAssignments.workDate, input.workDate),
          ),
        );

      if (existing) {
        return err<CreateRosterAssignmentOutput>(
          HRM_ERROR_CODES.ROSTER_ASSIGNMENT_OVERLAP,
          "Roster assignment already exists for this employee on workDate",
          {
            employmentId: input.employmentId,
            workDate: input.workDate,
          },
        );
      }

      const [row] = await tx
        .insert(hrmRosterAssignments)
        .values({
          orgId,
          employmentId: input.employmentId,
          shiftId: input.shiftId,
          workDate: sql`${input.workDate}::date`,
          status: normalizeRosterStatus(input.status),
        })
        .returning({
          rosterAssignmentId: hrmRosterAssignments.id,
          employmentId: hrmRosterAssignments.employmentId,
          shiftId: hrmRosterAssignments.shiftId,
          workDate: hrmRosterAssignments.workDate,
          status: hrmRosterAssignments.status,
        });

      if (!row) {
        throw new Error("Failed to create roster assignment");
      }

      await tx.insert(auditLog).values({
        orgId,
        actorPrincipalId: actorPrincipalId ?? null,
        action: HRM_EVENTS.ROSTER_ASSIGNMENT_CREATED,
        entityType: "hrm_roster_assignment",
        entityId: row.rosterAssignmentId,
        correlationId,
        details: {
          rosterAssignmentId: row.rosterAssignmentId,
          employmentId: row.employmentId,
          shiftId: row.shiftId,
          workDate: row.workDate,
          status: row.status,
        },
      });

      await tx.insert(outboxEvent).values({
        orgId,
        type: "HRM.ROSTER_ASSIGNMENT_CREATED",
        version: "1",
        correlationId,
        payload: {
          rosterAssignmentId: row.rosterAssignmentId,
          employmentId: row.employmentId,
          shiftId: row.shiftId,
          workDate: row.workDate,
          status: row.status,
        },
      });

      return ok<CreateRosterAssignmentOutput>({
        rosterAssignmentId: row.rosterAssignmentId,
        employmentId: row.employmentId,
        shiftId: row.shiftId,
        workDate: String(row.workDate),
        status: row.status,
      });
    });

    return data;
  } catch (error) {
    return err(HRM_ERROR_CODES.INTERNAL_ERROR, "Failed to create roster assignment", {
      cause: error instanceof Error ? error.message : "unknown_error",
    });
  }
}

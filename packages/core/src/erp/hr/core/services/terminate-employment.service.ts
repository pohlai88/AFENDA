import type { DbClient } from "@afenda/db";
import {
  auditLog,
  hrmEmployeeProfiles,
  hrmEmploymentRecords,
  hrmEmploymentStatusHistory,
  hrmSeparationCases,
  hrmWorkAssignments,
  outboxEvent,
} from "@afenda/db";
import { and, eq, sql } from "drizzle-orm";
import { HRM_ERROR_CODES } from "../../shared/constants/hrm-error-codes";
import { HRM_EVENTS } from "../../shared/events/hrm-events";
import type { HrmCommandContext } from "../../shared/types/hrm-command-context";
import { err, ok, type HrmResult } from "../../shared/types/hrm-result";
import type {
  TerminateEmploymentInput,
  TerminateEmploymentOutput,
} from "../dto/terminate-employment.dto";

export interface TerminateEmploymentDeps {
  run: (ctx: HrmCommandContext, input: TerminateEmploymentInput) => Promise<TerminateEmploymentOutput>;
}

export class TerminateEmploymentService {
  constructor(private readonly deps: TerminateEmploymentDeps) {}

  async execute(
    ctx: HrmCommandContext,
    input: TerminateEmploymentInput,
  ): Promise<HrmResult<TerminateEmploymentOutput>> {
    if (!input.employmentId || !input.terminationDate || !input.terminationReasonCode) {
      return err(
        HRM_ERROR_CODES.INVALID_INPUT,
        "employmentId, terminationDate, and terminationReasonCode are required",
      );
    }

    try {
      const data = await this.deps.run(ctx, input);
      return ok(data);
    } catch (error) {
      return err(HRM_ERROR_CODES.INTERNAL_ERROR, "Failed to terminate employment", {
        cause: error instanceof Error ? error.message : "unknown_error",
      });
    }
  }
}

export async function terminateEmployment(
  db: DbClient,
  orgId: string,
  actorPrincipalId: string | undefined,
  correlationId: string,
  input: TerminateEmploymentInput,
): Promise<HrmResult<TerminateEmploymentOutput>> {
  if (!input.employmentId || !input.terminationDate || !input.terminationReasonCode) {
    return err(
      HRM_ERROR_CODES.INVALID_INPUT,
      "employmentId, terminationDate, and terminationReasonCode are required",
    );
  }

  try {
    const [employment] = await db
      .select({
        id: hrmEmploymentRecords.id,
        employeeId: hrmEmploymentRecords.employeeId,
        status: hrmEmploymentRecords.employmentStatus,
      })
      .from(hrmEmploymentRecords)
      .where(and(eq(hrmEmploymentRecords.orgId, orgId), eq(hrmEmploymentRecords.id, input.employmentId)));

    if (!employment) {
      return err(HRM_ERROR_CODES.EMPLOYMENT_NOT_FOUND, "Employment not found", {
        employmentId: input.employmentId,
      });
    }

    if (["terminated", "inactive"].includes(employment.status)) {
      return err(
        HRM_ERROR_CODES.INVALID_EMPLOYMENT_STATE,
        "Employment is already terminated/inactive",
        {
          employmentId: input.employmentId,
          employmentStatus: employment.status,
        },
      );
    }

    const data = await db.transaction(async (tx) => {
      let separationCaseId: string | undefined;

      await tx.insert(hrmEmploymentStatusHistory).values({
        orgId,
        employmentId: input.employmentId,
        oldStatus: employment.status,
        newStatus: "terminated",
        changedAt: input.terminationDate,
        changedBy: actorPrincipalId ?? null,
        reasonCode: input.terminationReasonCode,
        metadata: input.comment ? { comment: input.comment } : undefined,
      });

      await tx
        .update(hrmEmploymentRecords)
        .set({
          employmentStatus: "terminated",
          terminationDate: input.terminationDate,
          updatedAt: sql`now()`,
        })
        .where(and(eq(hrmEmploymentRecords.orgId, orgId), eq(hrmEmploymentRecords.id, input.employmentId)));

      await tx
        .update(hrmWorkAssignments)
        .set({
          effectiveTo: sql`${input.terminationDate}::timestamptz`,
          isCurrent: false,
          assignmentStatus: "historical",
          updatedAt: sql`now()`,
        })
        .where(
          and(
            eq(hrmWorkAssignments.orgId, orgId),
            eq(hrmWorkAssignments.employmentId, input.employmentId),
            eq(hrmWorkAssignments.isCurrent, true),
          ),
        );

      await tx
        .update(hrmEmployeeProfiles)
        .set({
          currentStatus: "terminated",
          updatedAt: sql`now()`,
        })
        .where(and(eq(hrmEmployeeProfiles.orgId, orgId), eq(hrmEmployeeProfiles.id, employment.employeeId)));

      if (input.startSeparationCase) {
        const [separationCase] = await tx
          .insert(hrmSeparationCases)
          .values({
            orgId,
            employmentId: input.employmentId,
            caseStatus: "open",
            separationType: "termination",
            initiatedAt: sql`${input.terminationDate}::date`,
            targetLastWorkingDate: sql`${input.terminationDate}::date`,
          })
          .returning({ id: hrmSeparationCases.id });

        separationCaseId = separationCase?.id;
      }

      const payload = {
        employmentId: input.employmentId,
        terminatedAt: input.terminationDate,
        terminationReasonCode: input.terminationReasonCode,
        separationCaseId,
      };

      await tx.insert(auditLog).values({
        orgId,
        actorPrincipalId: actorPrincipalId ?? null,
        action: HRM_EVENTS.EMPLOYEE_TERMINATED,
        entityType: "hrm_employment",
        entityId: input.employmentId,
        correlationId,
        details: payload,
      });

      await tx.insert(outboxEvent).values({
        orgId,
        type: "HRM.EMPLOYEE_TERMINATED",
        version: "1",
        correlationId,
        payload,
      });

      return {
        employmentId: input.employmentId,
        terminatedAt: input.terminationDate,
        separationCaseId,
      };
    });

    return ok(data);
  } catch (error) {
    return err(HRM_ERROR_CODES.INTERNAL_ERROR, "Failed to terminate employment", {
      cause: error instanceof Error ? error.message : "unknown_error",
    });
  }
}
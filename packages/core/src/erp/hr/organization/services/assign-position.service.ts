import type { DbClient } from "@afenda/db";
import { hrmPositions } from "@afenda/db";
import { and, eq } from "drizzle-orm";
import { transferEmployee } from "../../core/services/transfer-employee.service";
import { HRM_ERROR_CODES } from "../../shared/constants/hrm-error-codes";
import { err, type HrmResult } from "../../shared/types/hrm-result";
import type { AssignPositionInput, AssignPositionOutput } from "../dto/assign-position.dto";

export async function assignPosition(
  db: DbClient,
  orgId: string,
  actorPrincipalId: string | undefined,
  correlationId: string,
  input: AssignPositionInput,
): Promise<HrmResult<AssignPositionOutput>> {
  if (!input.employmentId || !input.positionId || !input.effectiveFrom) {
    return err(HRM_ERROR_CODES.INVALID_INPUT, "employmentId, positionId and effectiveFrom are required");
  }

  const [position] = await db
    .select({
      id: hrmPositions.id,
      legalEntityId: hrmPositions.legalEntityId,
      orgUnitId: hrmPositions.orgUnitId,
      jobId: hrmPositions.jobId,
      gradeId: hrmPositions.gradeId,
    })
    .from(hrmPositions)
    .where(and(eq(hrmPositions.orgId, orgId), eq(hrmPositions.id, input.positionId)));

  if (!position) {
    return err(HRM_ERROR_CODES.POSITION_NOT_FOUND, "Position not found", {
      positionId: input.positionId,
    });
  }

  return transferEmployee(db, orgId, actorPrincipalId, correlationId, {
    employmentId: input.employmentId,
    effectiveFrom: input.effectiveFrom,
    legalEntityId: position.legalEntityId,
    departmentId: position.orgUnitId ?? undefined,
    positionId: position.id,
    jobId: position.jobId ?? undefined,
    gradeId: position.gradeId ?? undefined,
    changeReason: input.changeReason ?? "assign-position",
  });
}
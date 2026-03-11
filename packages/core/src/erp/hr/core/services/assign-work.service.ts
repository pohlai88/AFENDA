import type { HrmCommandContext } from "../../shared/types/hrm-command-context";
import { err, ok, type HrmResult } from "../../shared/types/hrm-result";
import { HRM_ERROR_CODES } from "../../shared/constants/hrm-error-codes";
import type { AssignWorkInput, AssignWorkOutput } from "../dto/assign-work.dto";
import type { TransferEmployeeOutput } from "../dto/transfer-employee.dto";
import { transferEmployee } from "./transfer-employee.service";
import type { DbClient } from "@afenda/db";

export interface AssignWorkDeps {
  run: (ctx: HrmCommandContext, input: AssignWorkInput) => Promise<AssignWorkOutput>;
}

export class AssignWorkService {
  constructor(private readonly deps: AssignWorkDeps) {}

  async execute(
    ctx: HrmCommandContext,
    input: AssignWorkInput,
  ): Promise<HrmResult<AssignWorkOutput>> {
    if (!input.employmentId || !input.effectiveFrom || !input.legalEntityId) {
      return err(
        HRM_ERROR_CODES.INVALID_INPUT,
        "employmentId, effectiveFrom, and legalEntityId are required",
      );
    }

    try {
      const data = await this.deps.run(ctx, input);
      return ok(data);
    } catch (error) {
      return err(HRM_ERROR_CODES.INTERNAL_ERROR, "Failed to assign work", {
        cause: error instanceof Error ? error.message : "unknown_error",
      });
    }
  }
}

export async function assignWork(
  db: DbClient,
  orgId: string,
  actorPrincipalId: string | undefined,
  correlationId: string,
  input: AssignWorkInput,
): Promise<HrmResult<AssignWorkOutput>> {
  const result = await transferEmployee(db, orgId, actorPrincipalId, correlationId, {
    ...input,
    changeReason: input.changeReason ?? "assign-work",
  });

  if (!result.ok) {
    return result;
  }

  const data: TransferEmployeeOutput = result.data;
  return ok({
    previousWorkAssignmentId: data.previousWorkAssignmentId,
    newWorkAssignmentId: data.newWorkAssignmentId,
  });
}
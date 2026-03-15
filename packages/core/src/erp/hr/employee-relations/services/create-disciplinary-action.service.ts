import type { DbClient } from "@afenda/db";
import {
  auditLog,
  hrmDisciplinaryActions,
  hrmEmploymentRecords,
  outboxEvent,
} from "@afenda/db";
import { and, eq } from "drizzle-orm";
import { HRM_ERROR_CODES } from "../../shared/constants/hrm-error-codes";
import { HRM_EVENTS } from "../../shared/events/hrm-events";
import { err, ok, type HrmResult } from "../../shared/types/hrm-result";

export interface CreateDisciplinaryActionInput {
  employmentId: string;
  actionType: string;
  effectiveDate: string;
  status?: string;
  notes?: string | null;
}

export interface CreateDisciplinaryActionOutput {
  disciplinaryActionId: string;
}

export async function createDisciplinaryAction(
  db: DbClient,
  orgId: string,
  actorPrincipalId: string | undefined,
  correlationId: string,
  input: CreateDisciplinaryActionInput,
): Promise<HrmResult<CreateDisciplinaryActionOutput>> {
  if (!input.employmentId || !input.actionType || !input.effectiveDate) {
    return err(
      HRM_ERROR_CODES.INVALID_INPUT,
      "employmentId, actionType, and effectiveDate are required",
    );
  }

  try {
    const [employment] = await db
      .select({ id: hrmEmploymentRecords.id })
      .from(hrmEmploymentRecords)
      .where(
        and(
          eq(hrmEmploymentRecords.orgId, orgId),
          eq(hrmEmploymentRecords.id, input.employmentId),
        ),
      );

    if (!employment) {
      return err(HRM_ERROR_CODES.EMPLOYMENT_NOT_FOUND, "Employment not found", {
        employmentId: input.employmentId,
      });
    }

    const status = input.status ?? "draft";

    const [row] = await db
      .insert(hrmDisciplinaryActions)
      .values({
        orgId,
        employmentId: input.employmentId,
        actionType: input.actionType,
        effectiveDate: input.effectiveDate,
        status,
        notes: input.notes ?? null,
      })
      .returning({ id: hrmDisciplinaryActions.id });

    if (!row) {
      throw new Error("Failed to create disciplinary action");
    }

    await db.insert(auditLog).values({
      orgId,
      actorPrincipalId: actorPrincipalId ?? null,
      action: HRM_EVENTS.DISCIPLINARY_ACTION_CREATED,
      entityType: "hrm_disciplinary_action",
      entityId: row.id,
      correlationId,
      details: {
        disciplinaryActionId: row.id,
        employmentId: input.employmentId,
        actionType: input.actionType,
        status,
      },
    });

    await db.insert(outboxEvent).values({
      orgId,
      type: "HRM.DISCIPLINARY_ACTION_CREATED",
      version: "1",
      correlationId,
      payload: {
        disciplinaryActionId: row.id,
        employmentId: input.employmentId,
        actionType: input.actionType,
      },
    });

    return ok({ disciplinaryActionId: row.id });
  } catch (error) {
    return err(HRM_ERROR_CODES.INTERNAL_ERROR, "Failed to create disciplinary action", {
      cause: error instanceof Error ? error.message : "unknown_error",
    });
  }
}

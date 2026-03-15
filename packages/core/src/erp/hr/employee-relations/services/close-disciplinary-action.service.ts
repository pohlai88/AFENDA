import type { DbClient } from "@afenda/db";
import { auditLog, hrmDisciplinaryActions, outboxEvent } from "@afenda/db";
import { and, eq } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { HRM_ERROR_CODES } from "../../shared/constants/hrm-error-codes";
import { HRM_EVENTS } from "../../shared/events/hrm-events";
import { err, ok, type HrmResult } from "../../shared/types/hrm-result";

export interface CloseDisciplinaryActionInput {
  disciplinaryActionId: string;
  status: "active" | "rescinded";
}

export interface CloseDisciplinaryActionOutput {
  disciplinaryActionId: string;
}

export async function closeDisciplinaryAction(
  db: DbClient,
  orgId: string,
  actorPrincipalId: string | undefined,
  correlationId: string,
  input: CloseDisciplinaryActionInput,
): Promise<HrmResult<CloseDisciplinaryActionOutput>> {
  if (!input.disciplinaryActionId || !input.status) {
    return err(
      HRM_ERROR_CODES.INVALID_INPUT,
      "disciplinaryActionId and status are required",
    );
  }

  if (input.status !== "active" && input.status !== "rescinded") {
    return err(
      HRM_ERROR_CODES.INVALID_INPUT,
      "status must be 'active' or 'rescinded'",
    );
  }

  try {
    const [existing] = await db
      .select({
        id: hrmDisciplinaryActions.id,
        status: hrmDisciplinaryActions.status,
      })
      .from(hrmDisciplinaryActions)
      .where(
        and(
          eq(hrmDisciplinaryActions.orgId, orgId),
          eq(hrmDisciplinaryActions.id, input.disciplinaryActionId),
        ),
      );

    if (!existing) {
      return err(
        HRM_ERROR_CODES.DISCIPLINARY_ACTION_NOT_FOUND,
        "Disciplinary action not found",
        { disciplinaryActionId: input.disciplinaryActionId },
      );
    }

    await db
      .update(hrmDisciplinaryActions)
      .set({
        status: input.status,
        updatedAt: sql`now()`,
      })
      .where(
        and(
          eq(hrmDisciplinaryActions.orgId, orgId),
          eq(hrmDisciplinaryActions.id, input.disciplinaryActionId),
        ),
      );

    await db.insert(auditLog).values({
      orgId,
      actorPrincipalId: actorPrincipalId ?? null,
      action: HRM_EVENTS.DISCIPLINARY_ACTION_CLOSED,
      entityType: "hrm_disciplinary_action",
      entityId: input.disciplinaryActionId,
      correlationId,
      details: {
        disciplinaryActionId: input.disciplinaryActionId,
        status: input.status,
      },
    });

    await db.insert(outboxEvent).values({
      orgId,
      type: "HRM.DISCIPLINARY_ACTION_CLOSED",
      version: "1",
      correlationId,
      payload: {
        disciplinaryActionId: input.disciplinaryActionId,
        status: input.status,
      },
    });

    return ok({ disciplinaryActionId: input.disciplinaryActionId });
  } catch (error) {
    return err(HRM_ERROR_CODES.INTERNAL_ERROR, "Failed to close disciplinary action", {
      cause: error instanceof Error ? error.message : "unknown_error",
    });
  }
}

import type { DbClient } from "@afenda/db";
import { auditLog, hrmPersonDependents, hrmPersons, outboxEvent } from "@afenda/db";
import { and, eq } from "drizzle-orm";
import { HRM_ERROR_CODES } from "../../shared/constants/hrm-error-codes";
import { HRM_EVENTS } from "../../shared/events/hrm-events";
import { err, ok, type HrmResult } from "../../shared/types/hrm-result";

export interface AddDependentInput {
  personId: string;
  dependentName: string;
  relationship: string;
  birthDate?: string;
}

export interface AddDependentOutput {
  dependentId: string;
  personId: string;
}

export async function addDependent(
  db: DbClient,
  orgId: string,
  actorPrincipalId: string | undefined,
  correlationId: string,
  input: AddDependentInput,
): Promise<HrmResult<AddDependentOutput>> {
  if (!input.personId || !input.dependentName || !input.relationship) {
    return err(
      HRM_ERROR_CODES.INVALID_INPUT,
      "personId, dependentName, and relationship are required",
    );
  }

  try {
    const [person] = await db
      .select({ id: hrmPersons.id })
      .from(hrmPersons)
      .where(and(eq(hrmPersons.orgId, orgId), eq(hrmPersons.id, input.personId)));

    if (!person) {
      return err(HRM_ERROR_CODES.PERSON_NOT_FOUND, "Person not found", {
        personId: input.personId,
      });
    }

    const data = await db.transaction(async (tx) => {
      const [dependent] = await tx
        .insert(hrmPersonDependents)
        .values({
          orgId,
          personId: input.personId,
          dependentName: input.dependentName,
          relationship: input.relationship,
          birthDate: input.birthDate ?? null,
        })
        .returning({ id: hrmPersonDependents.id });

      if (!dependent) throw new Error("Failed to insert dependent");

      const payload = { dependentId: dependent.id, personId: input.personId };

      await tx.insert(auditLog).values({
        orgId,
        actorPrincipalId: actorPrincipalId ?? null,
        action: HRM_EVENTS.DEPENDENT_ADDED,
        entityType: "hrm_dependent",
        entityId: dependent.id,
        correlationId,
        details: payload,
      });

      await tx.insert(outboxEvent).values({
        orgId,
        type: "HRM.DEPENDENT_ADDED",
        version: "1",
        correlationId,
        payload,
      });

      return { dependentId: dependent.id, personId: input.personId };
    });

    return ok(data);
  } catch (error) {
    return err(HRM_ERROR_CODES.INTERNAL_ERROR, "Failed to add dependent", {
      cause: error instanceof Error ? error.message : "unknown_error",
    });
  }
}

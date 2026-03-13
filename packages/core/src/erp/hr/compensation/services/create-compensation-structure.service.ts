import type { DbClient } from "@afenda/db";
import { auditLog, hrmCompensationStructures, outboxEvent } from "@afenda/db";
import { HRM_ERROR_CODES } from "../../shared/constants/hrm-error-codes";
import { HRM_EVENTS } from "../../shared/events/hrm-events";
import { err, ok, type HrmResult } from "../../shared/types/hrm-result";
import type {
  CreateCompensationStructureInput,
  CreateCompensationStructureOutput,
} from "../dto/create-compensation-structure.dto";

export async function createCompensationStructure(
  db: DbClient,
  orgId: string,
  actorPrincipalId: string | undefined,
  correlationId: string,
  input: CreateCompensationStructureInput,
): Promise<HrmResult<CreateCompensationStructureOutput>> {
  if (
    !input.structureCode ||
    !input.structureName ||
    !input.payBasis ||
    !input.currencyCode ||
    !input.minAmount
  ) {
    return err(
      HRM_ERROR_CODES.INVALID_INPUT,
      "structureCode, structureName, payBasis, currencyCode and minAmount are required",
    );
  }

  if (input.currencyCode.length !== 3) {
    return err(HRM_ERROR_CODES.INVALID_INPUT, "currencyCode must be exactly 3 characters");
  }

  try {
    const data = await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(hrmCompensationStructures)
        .values({
          orgId,
          structureCode: input.structureCode,
          structureName: input.structureName,
          payBasis: input.payBasis,
          currencyCode: input.currencyCode.toUpperCase(),
          minAmount: input.minAmount,
          maxAmount: input.maxAmount ?? null,
        })
        .returning({
          compensationStructureId: hrmCompensationStructures.id,
          structureCode: hrmCompensationStructures.structureCode,
          structureName: hrmCompensationStructures.structureName,
          payBasis: hrmCompensationStructures.payBasis,
        });

      if (!row) {
        throw new Error("Failed to create compensation structure");
      }

      await tx.insert(auditLog).values({
        orgId,
        actorPrincipalId: actorPrincipalId ?? null,
        action: HRM_EVENTS.COMPENSATION_STRUCTURE_CREATED,
        entityType: "hrm_compensation_structure",
        entityId: row.compensationStructureId,
        correlationId,
        details: {
          compensationStructureId: row.compensationStructureId,
          structureCode: row.structureCode,
          payBasis: row.payBasis,
        },
      });

      await tx.insert(outboxEvent).values({
        orgId,
        type: "HRM.COMPENSATION_STRUCTURE_CREATED",
        version: "1",
        correlationId,
        payload: {
          compensationStructureId: row.compensationStructureId,
          structureCode: row.structureCode,
          payBasis: row.payBasis,
        },
      });

      return ok<CreateCompensationStructureOutput>({
        compensationStructureId: row.compensationStructureId,
        structureCode: row.structureCode,
        structureName: row.structureName,
        payBasis: row.payBasis,
      });
    });

    return data;
  } catch (error) {
    const msg = error instanceof Error ? error.message : "unknown_error";
    if (msg.includes("hrm_comp_structures_org_code_uq")) {
      return err(
        HRM_ERROR_CODES.CONFLICT,
        "A compensation structure with this code already exists",
      );
    }
    return err(HRM_ERROR_CODES.INTERNAL_ERROR, "Failed to create compensation structure", {
      cause: msg,
    });
  }
}

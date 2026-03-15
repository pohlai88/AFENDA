import type { DbClient } from "@afenda/db";
import {
  auditLog,
  hrmEmploymentContracts,
  hrmEmploymentRecords,
  outboxEvent,
} from "@afenda/db";
import { and, eq } from "drizzle-orm";
import { HRM_ERROR_CODES } from "../../shared/constants/hrm-error-codes";
import { HRM_EVENTS } from "../../shared/events/hrm-events";
import { err, ok, type HrmResult } from "../../shared/types/hrm-result";

export interface AddEmploymentContractInput {
  employmentId: string;
  contractNumber: string;
  contractType: string;
  contractStartDate: string;
  contractEndDate?: string;
  documentFileId?: string;
}

export interface AddEmploymentContractOutput {
  contractId: string;
  employmentId: string;
}

export async function addEmploymentContract(
  db: DbClient,
  orgId: string,
  actorPrincipalId: string | undefined,
  correlationId: string,
  performedAt: string,
  input: AddEmploymentContractInput,
): Promise<HrmResult<AddEmploymentContractOutput>> {
  if (!input.employmentId || !input.contractNumber || !input.contractType || !input.contractStartDate) {
    return err(
      HRM_ERROR_CODES.INVALID_INPUT,
      "employmentId, contractNumber, contractType, and contractStartDate are required",
    );
  }

  if (input.contractEndDate && input.contractEndDate < input.contractStartDate) {
    return err(
      HRM_ERROR_CODES.INVALID_INPUT,
      "contractEndDate must be >= contractStartDate",
    );
  }

  try {
    const [employment] = await db
      .select({ id: hrmEmploymentRecords.id, status: hrmEmploymentRecords.employmentStatus })
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

    if (["terminated", "inactive"].includes(employment.status)) {
      return err(
        HRM_ERROR_CODES.INVALID_EMPLOYMENT_STATE,
        "Cannot add contract to terminated or inactive employment",
        { employmentId: input.employmentId, employmentStatus: employment.status },
      );
    }

    const data = await db.transaction(async (tx) => {
      const [contract] = await tx
        .insert(hrmEmploymentContracts)
        .values({
          orgId,
          employmentId: input.employmentId,
          contractNumber: input.contractNumber,
          contractType: input.contractType,
          contractStartDate: input.contractStartDate,
          contractEndDate: input.contractEndDate ?? null,
          documentFileId: input.documentFileId ?? null,
        })
        .returning({ id: hrmEmploymentContracts.id });

      if (!contract) {
        throw new Error("Failed to insert employment contract");
      }

      const payload = {
        contractId: contract.id,
        employmentId: input.employmentId,
        contractNumber: input.contractNumber,
        contractType: input.contractType,
        contractStartDate: input.contractStartDate,
        contractEndDate: input.contractEndDate ?? null,
        documentFileId: input.documentFileId ?? null,
        createdBy: actorPrincipalId ?? null,
        createdAt: performedAt,
        correlationId,
      };

      await tx.insert(auditLog).values({
        orgId,
        actorPrincipalId: actorPrincipalId ?? null,
        action: HRM_EVENTS.EMPLOYMENT_CONTRACT_ADDED,
        entityType: "hrm_employment_contract",
        entityId: contract.id,
        correlationId,
        details: payload,
      });

      await tx.insert(outboxEvent).values({
        orgId,
        type: "HRM.EMPLOYMENT_CONTRACT_ADDED",
        version: "1",
        correlationId,
        payload,
      });

      return {
        contractId: contract.id,
        employmentId: input.employmentId,
      };
    });

    return ok(data);
  } catch (error) {
    return err(HRM_ERROR_CODES.INTERNAL_ERROR, "Failed to add employment contract", {
      cause: error instanceof Error ? error.message : "unknown_error",
    });
  }
}

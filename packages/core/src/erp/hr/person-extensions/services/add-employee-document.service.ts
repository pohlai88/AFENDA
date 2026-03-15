import type { DbClient } from "@afenda/db";
import {
  auditLog,
  hrmEmployeeDocuments,
  hrmEmploymentRecords,
  outboxEvent,
} from "@afenda/db";
import { and, eq } from "drizzle-orm";
import { HRM_ERROR_CODES } from "../../shared/constants/hrm-error-codes";
import { HRM_EVENTS } from "../../shared/events/hrm-events";
import { err, ok, type HrmResult } from "../../shared/types/hrm-result";

export interface AddEmployeeDocumentInput {
  employmentId: string;
  documentType: string;
  fileReference: string;
  issuedAt?: string;
  expiresAt?: string;
}

export interface AddEmployeeDocumentOutput {
  documentId: string;
  employmentId: string;
}

export async function addEmployeeDocument(
  db: DbClient,
  orgId: string,
  actorPrincipalId: string | undefined,
  correlationId: string,
  input: AddEmployeeDocumentInput,
): Promise<HrmResult<AddEmployeeDocumentOutput>> {
  if (!input.employmentId || !input.documentType || !input.fileReference) {
    return err(
      HRM_ERROR_CODES.INVALID_INPUT,
      "employmentId, documentType, and fileReference are required",
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

    const data = await db.transaction(async (tx) => {
      const [doc] = await tx
        .insert(hrmEmployeeDocuments)
        .values({
          orgId,
          employmentId: input.employmentId,
          documentType: input.documentType,
          fileReference: input.fileReference,
          issuedAt: input.issuedAt ?? null,
          expiresAt: input.expiresAt ?? null,
        })
        .returning({ id: hrmEmployeeDocuments.id });

      if (!doc) throw new Error("Failed to insert employee document");

      const payload = { documentId: doc.id, employmentId: input.employmentId };

      await tx.insert(auditLog).values({
        orgId,
        actorPrincipalId: actorPrincipalId ?? null,
        action: HRM_EVENTS.EMPLOYEE_DOCUMENT_ADDED,
        entityType: "hrm_employee_document",
        entityId: doc.id,
        correlationId,
        details: payload,
      });

      await tx.insert(outboxEvent).values({
        orgId,
        type: "HRM.EMPLOYEE_DOCUMENT_ADDED",
        version: "1",
        correlationId,
        payload,
      });

      return { documentId: doc.id, employmentId: input.employmentId };
    });

    return ok(data);
  } catch (error) {
    return err(HRM_ERROR_CODES.INTERNAL_ERROR, "Failed to add employee document", {
      cause: error instanceof Error ? error.message : "unknown_error",
    });
  }
}

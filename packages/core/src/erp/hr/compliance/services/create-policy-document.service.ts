import type { DbClient } from "@afenda/db";
import { auditLog, hrmPolicyDocuments, outboxEvent } from "@afenda/db";
import { and, eq } from "drizzle-orm";
import { HRM_ERROR_CODES } from "../../shared/constants/hrm-error-codes";
import { HRM_EVENTS } from "../../shared/events/hrm-events";
import { err, ok, type HrmResult } from "../../shared/types/hrm-result";

export interface CreatePolicyDocumentInput {
  documentCode: string;
  documentName: string;
  version: string;
  effectiveFrom: string;
  effectiveTo?: string | null;
  requiredRole?: string | null;
}

export interface CreatePolicyDocumentOutput {
  policyDocumentId: string;
}

export async function createPolicyDocument(
  db: DbClient,
  orgId: string,
  actorPrincipalId: string | undefined,
  correlationId: string,
  input: CreatePolicyDocumentInput,
): Promise<HrmResult<CreatePolicyDocumentOutput>> {
  if (!input.documentCode || !input.documentName || !input.version || !input.effectiveFrom) {
    return err(
      HRM_ERROR_CODES.INVALID_INPUT,
      "documentCode, documentName, version, and effectiveFrom are required",
    );
  }

  try {
    const [existing] = await db
      .select({ id: hrmPolicyDocuments.id })
      .from(hrmPolicyDocuments)
      .where(
        and(
          eq(hrmPolicyDocuments.orgId, orgId),
          eq(hrmPolicyDocuments.documentCode, input.documentCode),
        ),
      );

    if (existing) {
      return err(HRM_ERROR_CODES.CONFLICT, "Policy document with this code already exists", {
        documentCode: input.documentCode,
      });
    }

    const [row] = await db
      .insert(hrmPolicyDocuments)
      .values({
        orgId,
        documentCode: input.documentCode,
        documentName: input.documentName,
        version: input.version,
        effectiveFrom: input.effectiveFrom,
        effectiveTo: input.effectiveTo ?? null,
        requiredRole: input.requiredRole ?? null,
      })
      .returning({ id: hrmPolicyDocuments.id });

    if (!row) {
      throw new Error("Failed to create policy document");
    }

    await db.insert(auditLog).values({
      orgId,
      actorPrincipalId: actorPrincipalId ?? null,
      action: HRM_EVENTS.POLICY_DOCUMENT_CREATED,
      entityType: "hrm_policy_document",
      entityId: row.id,
      correlationId,
      details: { policyDocumentId: row.id, documentCode: input.documentCode },
    });

    await db.insert(outboxEvent).values({
      orgId,
      type: "HRM.POLICY_DOCUMENT_CREATED",
      version: "1",
      correlationId,
      payload: { policyDocumentId: row.id, documentCode: input.documentCode },
    });

    return ok({ policyDocumentId: row.id });
  } catch (error) {
    return err(HRM_ERROR_CODES.INTERNAL_ERROR, "Failed to create policy document", {
      cause: error instanceof Error ? error.message : "unknown_error",
    });
  }
}

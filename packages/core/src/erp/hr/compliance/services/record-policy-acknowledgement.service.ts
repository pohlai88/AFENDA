import type { DbClient } from "@afenda/db";
import {
  auditLog,
  hrmEmploymentRecords,
  hrmPolicyAcknowledgements,
  hrmPolicyDocuments,
  outboxEvent,
} from "@afenda/db";
import { and, eq } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { HRM_ERROR_CODES } from "../../shared/constants/hrm-error-codes";
import { HRM_EVENTS } from "../../shared/events/hrm-events";
import { err, ok, type HrmResult } from "../../shared/types/hrm-result";

export interface RecordPolicyAcknowledgementInput {
  employmentId: string;
  policyDocumentId: string;
  ipAddress?: string | null;
}

export interface RecordPolicyAcknowledgementOutput {
  acknowledgementId: string;
}

export async function recordPolicyAcknowledgement(
  db: DbClient,
  orgId: string,
  actorPrincipalId: string | undefined,
  correlationId: string,
  input: RecordPolicyAcknowledgementInput,
): Promise<HrmResult<RecordPolicyAcknowledgementOutput>> {
  if (!input.employmentId || !input.policyDocumentId) {
    return err(
      HRM_ERROR_CODES.INVALID_INPUT,
      "employmentId and policyDocumentId are required",
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

    const [policy] = await db
      .select({ id: hrmPolicyDocuments.id })
      .from(hrmPolicyDocuments)
      .where(
        and(
          eq(hrmPolicyDocuments.orgId, orgId),
          eq(hrmPolicyDocuments.id, input.policyDocumentId),
        ),
      );

    if (!policy) {
      return err(HRM_ERROR_CODES.POLICY_DOCUMENT_NOT_FOUND, "Policy document not found", {
        policyDocumentId: input.policyDocumentId,
      });
    }

    const [existing] = await db
      .select({ id: hrmPolicyAcknowledgements.id })
      .from(hrmPolicyAcknowledgements)
      .where(
        and(
          eq(hrmPolicyAcknowledgements.orgId, orgId),
          eq(hrmPolicyAcknowledgements.employmentId, input.employmentId),
          eq(hrmPolicyAcknowledgements.policyDocumentId, input.policyDocumentId),
        ),
      );

    if (existing) {
      return err(
        HRM_ERROR_CODES.POLICY_ACKNOWLEDGEMENT_ALREADY_EXISTS,
        "Policy already acknowledged by this employee",
        { employmentId: input.employmentId, policyDocumentId: input.policyDocumentId },
      );
    }

    const [row] = await db
      .insert(hrmPolicyAcknowledgements)
      .values({
        orgId,
        employmentId: input.employmentId,
        policyDocumentId: input.policyDocumentId,
        acknowledgedAt: sql`now()`,
        ipAddress: input.ipAddress ?? null,
      })
      .returning({ id: hrmPolicyAcknowledgements.id });

    if (!row) {
      throw new Error("Failed to record policy acknowledgement");
    }

    await db.insert(auditLog).values({
      orgId,
      actorPrincipalId: actorPrincipalId ?? null,
      action: HRM_EVENTS.POLICY_ACKNOWLEDGED,
      entityType: "hrm_policy_acknowledgement",
      entityId: row.id,
      correlationId,
      details: {
        acknowledgementId: row.id,
        employmentId: input.employmentId,
        policyDocumentId: input.policyDocumentId,
      },
    });

    await db.insert(outboxEvent).values({
      orgId,
      type: "HRM.POLICY_ACKNOWLEDGED",
      version: "1",
      correlationId,
      payload: {
        acknowledgementId: row.id,
        employmentId: input.employmentId,
        policyDocumentId: input.policyDocumentId,
      },
    });

    return ok({ acknowledgementId: row.id });
  } catch (error) {
    return err(HRM_ERROR_CODES.INTERNAL_ERROR, "Failed to record policy acknowledgement", {
      cause: error instanceof Error ? error.message : "unknown_error",
    });
  }
}

import type { DbClient } from "@afenda/db";
import {
  hrmPolicyAcknowledgements,
  hrmPolicyDocuments,
} from "@afenda/db";
import { and, desc, eq } from "drizzle-orm";

export interface ListPolicyAcknowledgementsParams {
  orgId: string;
  employmentId?: string;
  policyDocumentId?: string;
  limit: number;
  offset: number;
}

export interface PolicyAcknowledgementView {
  acknowledgementId: string;
  employmentId: string;
  policyDocumentId: string;
  documentCode: string;
  documentName: string;
  acknowledgedAt: string;
  ipAddress: string | null;
}

export async function listPolicyAcknowledgements(
  db: DbClient,
  params: ListPolicyAcknowledgementsParams,
): Promise<PolicyAcknowledgementView[]> {
  const conditions = [eq(hrmPolicyAcknowledgements.orgId, params.orgId)];
  if (params.employmentId) {
    conditions.push(eq(hrmPolicyAcknowledgements.employmentId, params.employmentId));
  }
  if (params.policyDocumentId) {
    conditions.push(
      eq(hrmPolicyAcknowledgements.policyDocumentId, params.policyDocumentId),
    );
  }

  const rows = await db
    .select({
      acknowledgementId: hrmPolicyAcknowledgements.id,
      employmentId: hrmPolicyAcknowledgements.employmentId,
      policyDocumentId: hrmPolicyAcknowledgements.policyDocumentId,
      documentCode: hrmPolicyDocuments.documentCode,
      documentName: hrmPolicyDocuments.documentName,
      acknowledgedAt: hrmPolicyAcknowledgements.acknowledgedAt,
      ipAddress: hrmPolicyAcknowledgements.ipAddress,
    })
    .from(hrmPolicyAcknowledgements)
    .innerJoin(
      hrmPolicyDocuments,
      eq(hrmPolicyAcknowledgements.policyDocumentId, hrmPolicyDocuments.id),
    )
    .where(and(...conditions))
    .orderBy(desc(hrmPolicyAcknowledgements.acknowledgedAt))
    .limit(params.limit)
    .offset(params.offset);

  return rows.map((r) => ({
    acknowledgementId: r.acknowledgementId,
    employmentId: r.employmentId,
    policyDocumentId: r.policyDocumentId,
    documentCode: r.documentCode,
    documentName: r.documentName,
    acknowledgedAt: r.acknowledgedAt.toISOString(),
    ipAddress: r.ipAddress,
  }));
}

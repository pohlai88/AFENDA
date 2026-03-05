/**
 * Evidence linking — attach a registered document to a domain entity.
 *
 * Cross-org guard: the service verifies the document's `orgId` matches
 * the caller's `orgId` before creating the link, preventing document
 * hijacking between organizations.
 */

import type { DbClient } from "@afenda/db";
import { evidence, document } from "@afenda/db";
import { eq, and } from "drizzle-orm";
import type { OrgId, PrincipalId, EntityId, DocumentId } from "@afenda/contracts";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AttachEvidenceParams {
  orgId: OrgId;
  documentId: DocumentId;
  entityType: string;
  entityId: EntityId;
  label?: string;
  attachedByPrincipalId?: PrincipalId;
}

// ── Service ───────────────────────────────────────────────────────────────────

/**
 * Link an uploaded document to a domain entity as evidence.
 *
 * @returns The generated `evidence.id` (UUID).
 * @throws If the referenced document does not exist within the caller's org.
 */
export async function attachEvidence(
  db: DbClient,
  params: AttachEvidenceParams,
): Promise<string> {
  // 1. Verify the document exists AND belongs to the same org.
  //    The orgId guard prevents cross-org document hijacking.
  const docs = await db
    .select({ id: document.id })
    .from(document)
    .where(
      and(
        eq(document.id, params.documentId),
        eq(document.orgId, params.orgId),
      ),
    )
    .limit(1);

  if (docs.length === 0) {
    throw new Error(
      `Document ${params.documentId} not found or does not belong to this organization`,
    );
  }

  // 2. Insert evidence link
  const [row] = await db
    .insert(evidence)
    .values({
      orgId: params.orgId,
      documentId: params.documentId,
      entityType: params.entityType,
      entityId: params.entityId,
      label: params.label ?? null,
      attachedByPrincipalId: params.attachedByPrincipalId ?? null,
    })
    .returning({ id: evidence.id });

  if (!row) throw new Error("Failed to attach evidence");
  return row.id;
}

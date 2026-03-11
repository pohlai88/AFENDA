import { randomUUID } from "node:crypto";
import type { DbClient } from "@afenda/db";
import { auditLog, hrmCandidateApplications, hrmOffers, outboxEvent } from "@afenda/db";
import { and, eq, sql } from "drizzle-orm";
import { HRM_ERROR_CODES } from "../../shared/constants/hrm-error-codes";
import { HRM_EVENTS } from "../../shared/events/hrm-events";
import { err, ok, type HrmResult } from "../../shared/types/hrm-result";
import type { IssueOfferInput, IssueOfferOutput } from "../dto/issue-offer.dto";

function buildOfferNumber(): string {
  return `OFF-${randomUUID().slice(0, 8).toUpperCase()}`;
}

export async function issueOffer(
  db: DbClient,
  orgId: string,
  actorPrincipalId: string | undefined,
  correlationId: string,
  input: IssueOfferInput,
): Promise<HrmResult<IssueOfferOutput>> {
  const [application] = await db
    .select({ id: hrmCandidateApplications.id })
    .from(hrmCandidateApplications)
    .where(and(eq(hrmCandidateApplications.orgId, orgId), eq(hrmCandidateApplications.id, input.applicationId)));

  if (!application) {
    return err(HRM_ERROR_CODES.APPLICATION_NOT_FOUND, "Application not found", {
      applicationId: input.applicationId,
    });
  }

  const offerNumber = input.offerNumber ?? buildOfferNumber();

  try {
    const existing = await db
      .select({ id: hrmOffers.id })
      .from(hrmOffers)
      .where(and(eq(hrmOffers.orgId, orgId), eq(hrmOffers.offerNumber, offerNumber)));

    if (existing[0]) {
      return err(HRM_ERROR_CODES.CONFLICT, "offerNumber already exists", { offerNumber });
    }

    const data = await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(hrmOffers)
        .values({
          orgId,
          applicationId: input.applicationId,
          offerNumber,
          offeredOn: input.offeredOn ? sql`${input.offeredOn}::date` : sql`now()::date`,
          offerExpiryDate: input.offerExpiryDate ? sql`${input.offerExpiryDate}::date` : undefined,
          offeredCompensation: input.offeredCompensation,
          offerStatus: input.offerStatus ?? "issued",
        })
        .returning({ id: hrmOffers.id, offerNumber: hrmOffers.offerNumber });

      if (!row) {
        throw new Error("Failed to insert offer");
      }

      await tx.insert(auditLog).values({
        orgId,
        actorPrincipalId: actorPrincipalId ?? null,
        action: HRM_EVENTS.OFFER_ISSUED,
        entityType: "hrm_offer",
        entityId: row.id,
        correlationId,
        details: { offerId: row.id, offerNumber: row.offerNumber, applicationId: input.applicationId },
      });
      await tx.insert(outboxEvent).values({
        orgId,
        type: "HRM.OFFER_ISSUED",
        version: "1",
        correlationId,
        payload: { offerId: row.id, offerNumber: row.offerNumber, applicationId: input.applicationId },
      });

      return { offerId: row.id, offerNumber: row.offerNumber };
    });

    return ok(data);
  } catch (error) {
    return err(HRM_ERROR_CODES.INTERNAL_ERROR, "Failed to issue offer", {
      cause: error instanceof Error ? error.message : "unknown_error",
    });
  }
}
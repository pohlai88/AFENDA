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
          offeredOn: sql`now()::date`,
          offerExpiryDate: input.proposedStartDate ? sql`${input.proposedStartDate}::date` : undefined,
          offeredCompensation:
            input.baseSalaryAmount && input.currencyCode
              ? `${input.baseSalaryAmount} ${input.currencyCode}`
              : input.baseSalaryAmount,
          offerStatus: "issued",
        })
        .returning({
          id: hrmOffers.id,
          offerNumber: hrmOffers.offerNumber,
          offerStatus: hrmOffers.offerStatus,
        });

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
        details: {
          offerId: row.id,
          offerNumber: row.offerNumber,
          offerStatus: row.offerStatus,
          applicationId: input.applicationId,
          offeredPositionId: input.offeredPositionId ?? null,
        },
      });
      await tx.insert(outboxEvent).values({
        orgId,
        type: "HRM.OFFER_ISSUED",
        version: "1",
        correlationId,
        payload: {
          offerId: row.id,
          offerNumber: row.offerNumber,
          offerStatus: row.offerStatus,
          applicationId: input.applicationId,
          offeredPositionId: input.offeredPositionId ?? null,
        },
      });

      return {
        offerId: row.id,
        offerNumber: row.offerNumber,
        offerStatus: row.offerStatus,
      };
    });

    return ok(data);
  } catch (error) {
    return err(HRM_ERROR_CODES.INTERNAL_ERROR, "Failed to issue offer", {
      cause: error instanceof Error ? error.message : "unknown_error",
    });
  }
}
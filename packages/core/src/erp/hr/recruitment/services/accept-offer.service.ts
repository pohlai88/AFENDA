import type { DbClient } from "@afenda/db";
import { auditLog, hrmOffers, outboxEvent } from "@afenda/db";
import { and, eq, sql } from "drizzle-orm";
import { HRM_ERROR_CODES } from "../../shared/constants/hrm-error-codes";
import { HRM_EVENTS } from "../../shared/events/hrm-events";
import { err, ok, type HrmResult } from "../../shared/types/hrm-result";
import type { AcceptOfferInput, AcceptOfferOutput } from "../dto/accept-offer.dto";

export async function acceptOffer(
  db: DbClient,
  orgId: string,
  actorPrincipalId: string | undefined,
  correlationId: string,
  input: AcceptOfferInput,
): Promise<HrmResult<AcceptOfferOutput>> {
  if (!input.acceptedAt) {
    return err(HRM_ERROR_CODES.INVALID_INPUT, "acceptedAt is required", { offerId: input.offerId });
  }

  const [offer] = await db
    .select({ id: hrmOffers.id, offerStatus: hrmOffers.offerStatus })
    .from(hrmOffers)
    .where(and(eq(hrmOffers.orgId, orgId), eq(hrmOffers.id, input.offerId)));

  if (!offer) {
    return err(HRM_ERROR_CODES.OFFER_NOT_FOUND, "Offer not found", { offerId: input.offerId });
  }

  if (offer.offerStatus === "accepted") {
    return err(HRM_ERROR_CODES.CONFLICT, "Offer has already been accepted", {
      offerId: input.offerId,
    });
  }

  try {
    const data = await db.transaction(async (tx) => {
      await tx
        .update(hrmOffers)
        .set({
          offerStatus: "accepted",
          acceptedAt: sql`${input.acceptedAt}::date`,
          updatedAt: sql`now()`,
        })
        .where(and(eq(hrmOffers.orgId, orgId), eq(hrmOffers.id, input.offerId)));

      const payload = {
        offerId: input.offerId,
        offerStatus: "accepted",
        acceptedAt: input.acceptedAt,
        onboardingPlanId: undefined as string | undefined,
        previousStatus: offer.offerStatus,
      };

      await tx.insert(auditLog).values({
        orgId,
        actorPrincipalId: actorPrincipalId ?? null,
        action: HRM_EVENTS.OFFER_ACCEPTED,
        entityType: "hrm_offer",
        entityId: input.offerId,
        correlationId,
        details: payload,
      });
      await tx.insert(outboxEvent).values({
        orgId,
        type: "HRM.OFFER_ACCEPTED",
        version: "1",
        correlationId,
        payload,
      });

      return payload;
    });

    return ok(data);
  } catch (error) {
    return err(HRM_ERROR_CODES.INTERNAL_ERROR, "Failed to accept offer", {
      cause: error instanceof Error ? error.message : "unknown_error",
    });
  }
}
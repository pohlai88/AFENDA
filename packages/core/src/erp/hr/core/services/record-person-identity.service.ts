import type { DbClient } from "@afenda/db";
import { auditLog, hrmPersonIdentities, hrmPersons, outboxEvent } from "@afenda/db";
import { and, eq } from "drizzle-orm";
import { HRM_ERROR_CODES } from "../../shared/constants/hrm-error-codes";
import { HRM_EVENTS } from "../../shared/events/hrm-events";
import { err, ok, type HrmResult } from "../../shared/types/hrm-result";

export interface RecordPersonIdentityInput {
  personId: string;
  identityType: string;
  identityNumber: string;
  issuingCountryCode?: string;
  issuedAt?: string;
  expiresAt?: string;
  isPrimary?: boolean;
  verificationStatus?: string;
}

export interface RecordPersonIdentityOutput {
  identityId: string;
  personId: string;
}

export async function recordPersonIdentity(
  db: DbClient,
  orgId: string,
  actorPrincipalId: string | undefined,
  correlationId: string,
  input: RecordPersonIdentityInput,
): Promise<HrmResult<RecordPersonIdentityOutput>> {
  if (!input.personId || !input.identityType || !input.identityNumber) {
    return err(
      HRM_ERROR_CODES.INVALID_INPUT,
      "personId, identityType, and identityNumber are required",
    );
  }

  try {
    const [person] = await db
      .select({ id: hrmPersons.id })
      .from(hrmPersons)
      .where(and(eq(hrmPersons.orgId, orgId), eq(hrmPersons.id, input.personId)));

    if (!person) {
      return err(HRM_ERROR_CODES.PERSON_NOT_FOUND, "Person not found", {
        personId: input.personId,
      });
    }

    const data = await db.transaction(async (tx) => {
      const [identity] = await tx
        .insert(hrmPersonIdentities)
        .values({
          orgId,
          personId: input.personId,
          identityType: input.identityType,
          identityNumber: input.identityNumber,
          issuingCountryCode: input.issuingCountryCode ?? null,
          issuedAt: input.issuedAt ?? null,
          expiresAt: input.expiresAt ?? null,
          isPrimary: input.isPrimary ?? false,
          verificationStatus: input.verificationStatus ?? "unverified",
        })
        .returning({ id: hrmPersonIdentities.id });

      if (!identity) {
        throw new Error("Failed to insert person identity");
      }

      const payload = {
        identityId: identity.id,
        personId: input.personId,
        identityType: input.identityType,
      };

      await tx.insert(auditLog).values({
        orgId,
        actorPrincipalId: actorPrincipalId ?? null,
        action: HRM_EVENTS.PERSON_IDENTITY_RECORDED,
        entityType: "hrm_person_identity",
        entityId: identity.id,
        correlationId,
        details: payload,
      });

      await tx.insert(outboxEvent).values({
        orgId,
        type: "HRM.PERSON_IDENTITY_RECORDED",
        version: "1",
        correlationId,
        payload,
      });

      return {
        identityId: identity.id,
        personId: input.personId,
      };
    });

    return ok(data);
  } catch (error) {
    return err(HRM_ERROR_CODES.INTERNAL_ERROR, "Failed to record person identity", {
      cause: error instanceof Error ? error.message : "unknown_error",
    });
  }
}

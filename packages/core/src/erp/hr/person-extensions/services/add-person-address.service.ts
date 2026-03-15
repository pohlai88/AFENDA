import type { DbClient } from "@afenda/db";
import { auditLog, hrmPersonAddresses, hrmPersons, outboxEvent } from "@afenda/db";
import { and, eq } from "drizzle-orm";
import { HRM_ERROR_CODES } from "../../shared/constants/hrm-error-codes";
import { HRM_EVENTS } from "../../shared/events/hrm-events";
import { err, ok, type HrmResult } from "../../shared/types/hrm-result";

export interface AddPersonAddressInput {
  personId: string;
  addressType: string;
  line1: string;
  line2?: string;
  city?: string;
  stateProvince?: string;
  postalCode?: string;
  countryCode: string;
  isPrimary?: boolean;
}

export interface AddPersonAddressOutput {
  addressId: string;
  personId: string;
}

export async function addPersonAddress(
  db: DbClient,
  orgId: string,
  actorPrincipalId: string | undefined,
  correlationId: string,
  input: AddPersonAddressInput,
): Promise<HrmResult<AddPersonAddressOutput>> {
  if (!input.personId || !input.addressType || !input.line1 || !input.countryCode) {
    return err(
      HRM_ERROR_CODES.INVALID_INPUT,
      "personId, addressType, line1, and countryCode are required",
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
      const [address] = await tx
        .insert(hrmPersonAddresses)
        .values({
          orgId,
          personId: input.personId,
          addressType: input.addressType,
          line1: input.line1,
          line2: input.line2 ?? null,
          city: input.city ?? null,
          stateProvince: input.stateProvince ?? null,
          postalCode: input.postalCode ?? null,
          countryCode: input.countryCode,
          isPrimary: input.isPrimary ?? false,
        })
        .returning({ id: hrmPersonAddresses.id });

      if (!address) throw new Error("Failed to insert person address");

      const payload = { addressId: address.id, personId: input.personId };

      await tx.insert(auditLog).values({
        orgId,
        actorPrincipalId: actorPrincipalId ?? null,
        action: HRM_EVENTS.PERSON_ADDRESS_ADDED,
        entityType: "hrm_person_address",
        entityId: address.id,
        correlationId,
        details: payload,
      });

      await tx.insert(outboxEvent).values({
        orgId,
        type: "HRM.PERSON_ADDRESS_ADDED",
        version: "1",
        correlationId,
        payload,
      });

      return { addressId: address.id, personId: input.personId };
    });

    return ok(data);
  } catch (error) {
    return err(HRM_ERROR_CODES.INTERNAL_ERROR, "Failed to add person address", {
      cause: error instanceof Error ? error.message : "unknown_error",
    });
  }
}

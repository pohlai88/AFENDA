import type { DbClient } from "@afenda/db";
import {
  auditLog,
  hrmPersonEmergencyContacts,
  hrmPersons,
  outboxEvent,
} from "@afenda/db";
import { and, eq } from "drizzle-orm";
import { HRM_ERROR_CODES } from "../../shared/constants/hrm-error-codes";
import { HRM_EVENTS } from "../../shared/events/hrm-events";
import { err, ok, type HrmResult } from "../../shared/types/hrm-result";

export interface AddEmergencyContactInput {
  personId: string;
  contactName: string;
  relationship?: string;
  phone: string;
  email?: string;
  isPrimary?: boolean;
}

export interface AddEmergencyContactOutput {
  contactId: string;
  personId: string;
}

export async function addEmergencyContact(
  db: DbClient,
  orgId: string,
  actorPrincipalId: string | undefined,
  correlationId: string,
  input: AddEmergencyContactInput,
): Promise<HrmResult<AddEmergencyContactOutput>> {
  if (!input.personId || !input.contactName || !input.phone) {
    return err(
      HRM_ERROR_CODES.INVALID_INPUT,
      "personId, contactName, and phone are required",
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
      const [contact] = await tx
        .insert(hrmPersonEmergencyContacts)
        .values({
          orgId,
          personId: input.personId,
          contactName: input.contactName,
          relationship: input.relationship ?? null,
          phone: input.phone,
          email: input.email ?? null,
          isPrimary: input.isPrimary ?? false,
        })
        .returning({ id: hrmPersonEmergencyContacts.id });

      if (!contact) throw new Error("Failed to insert emergency contact");

      const payload = { contactId: contact.id, personId: input.personId };

      await tx.insert(auditLog).values({
        orgId,
        actorPrincipalId: actorPrincipalId ?? null,
        action: HRM_EVENTS.EMERGENCY_CONTACT_ADDED,
        entityType: "hrm_emergency_contact",
        entityId: contact.id,
        correlationId,
        details: payload,
      });

      await tx.insert(outboxEvent).values({
        orgId,
        type: "HRM.EMERGENCY_CONTACT_ADDED",
        version: "1",
        correlationId,
        payload,
      });

      return { contactId: contact.id, personId: input.personId };
    });

    return ok(data);
  } catch (error) {
    return err(HRM_ERROR_CODES.INTERNAL_ERROR, "Failed to add emergency contact", {
      cause: error instanceof Error ? error.message : "unknown_error",
    });
  }
}

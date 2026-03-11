import { randomUUID } from "node:crypto";
import type { DbClient } from "@afenda/db";
import { auditLog, hrmPersons, outboxEvent } from "@afenda/db";
import { and, eq } from "drizzle-orm";
import { HRM_ERROR_CODES } from "../../shared/constants/hrm-error-codes";
import { HRM_EVENTS } from "../../shared/events/hrm-events";
import type { HrmCommandContext } from "../../shared/types/hrm-command-context";
import { err, ok, type HrmResult } from "../../shared/types/hrm-result";
import type { CreatePersonInput, CreatePersonOutput } from "../dto/create-person.dto";
import type { PersonRepository } from "../repositories/person.repository";

export interface CreatePersonDeps {
  db: {
    transaction: <T>(fn: (tx: unknown) => Promise<T>) => Promise<T>;
  };
  personRepository: PersonRepository;
  auditService: {
    record: (args: {
      tx?: unknown;
      orgId: string;
      actorUserId: string;
      action: string;
      aggregateType: string;
      aggregateId: string;
      after: Record<string, unknown>;
      meta?: Record<string, unknown>;
    }) => Promise<void>;
  };
  outboxService: {
    enqueue: (args: {
      tx?: unknown;
      orgId: string;
      eventName: string;
      aggregateType: string;
      aggregateId: string;
      payload: Record<string, unknown>;
    }) => Promise<void>;
  };
  codeGenerator: {
    nextPersonCode: (orgId: string) => Promise<string>;
  };
}

export class CreatePersonService {
  constructor(private readonly deps: CreatePersonDeps) {}

  async execute(
    ctx: HrmCommandContext,
    input: CreatePersonInput,
  ): Promise<HrmResult<CreatePersonOutput>> {
    if (!input.legalName || !input.firstName || !input.lastName) {
      return err(
        HRM_ERROR_CODES.INVALID_INPUT,
        "legalName, firstName, and lastName are required",
      );
    }

    try {
      return await this.deps.db.transaction(async (tx) => {
        const personCode =
          input.personCode ?? (await this.deps.codeGenerator.nextPersonCode(ctx.orgId));

        const existing = await this.deps.personRepository.findByPersonCode({
          tx,
          orgId: ctx.orgId,
          personCode,
        });

        if (existing) {
          return err(HRM_ERROR_CODES.CONFLICT, "personCode already exists", { personCode });
        }

        const person = await this.deps.personRepository.insert({
          tx,
          params: {
            orgId: ctx.orgId,
            actorUserId: ctx.actorUserId,
            personCode,
            legalName: input.legalName,
            preferredName: input.preferredName,
            firstName: input.firstName,
            middleName: input.middleName,
            lastName: input.lastName,
            displayName: input.displayName ?? input.legalName,
            birthDate: input.birthDate,
            genderCode: input.genderCode,
            maritalStatusCode: input.maritalStatusCode,
            nationalityCountryCode: input.nationalityCountryCode,
            personalEmail: input.personalEmail,
            mobilePhone: input.mobilePhone,
            metadata: input.metadata,
          },
        });

        await this.deps.auditService.record({
          tx,
          orgId: ctx.orgId,
          actorUserId: ctx.actorUserId,
          action: HRM_EVENTS.PERSON_CREATED,
          aggregateType: "hrm_person",
          aggregateId: person.id,
          after: {
            personId: person.id,
            personCode: person.personCode,
          },
          meta: {
            correlationId: ctx.correlationId,
            idempotencyKey: ctx.idempotencyKey,
          },
        });

        await this.deps.outboxService.enqueue({
          tx,
          orgId: ctx.orgId,
          eventName: HRM_EVENTS.PERSON_CREATED,
          aggregateType: "hrm_person",
          aggregateId: person.id,
          payload: {
            personId: person.id,
            personCode: person.personCode,
          },
        });

        return ok<CreatePersonOutput>({
          personId: person.id,
          personCode: person.personCode,
        });
      });
    } catch (error) {
      return err(HRM_ERROR_CODES.INTERNAL_ERROR, "Failed to create person", {
        cause: error instanceof Error ? error.message : "unknown_error",
      });
    }
  }
}

function buildPersonCode(): string {
  return `PER-${randomUUID().slice(0, 8).toUpperCase()}`;
}

export async function createPerson(
  db: DbClient,
  orgId: string,
  actorPrincipalId: string | undefined,
  correlationId: string,
  input: CreatePersonInput,
): Promise<HrmResult<CreatePersonOutput>> {
  if (!input.legalName || !input.firstName || !input.lastName) {
    return err(HRM_ERROR_CODES.INVALID_INPUT, "legalName, firstName, and lastName are required");
  }

  const personCode = input.personCode ?? buildPersonCode();

  try {
    const existing = await db
      .select({ id: hrmPersons.id })
      .from(hrmPersons)
      .where(and(eq(hrmPersons.orgId, orgId), eq(hrmPersons.personCode, personCode)));

    if (existing[0]) {
      return err(HRM_ERROR_CODES.CONFLICT, "personCode already exists", { personCode });
    }

    const data = await db.transaction(async (tx) => {
      const [person] = await tx
        .insert(hrmPersons)
        .values({
          orgId,
          personCode,
          legalName: input.legalName,
          preferredName: input.preferredName,
          firstName: input.firstName,
          middleName: input.middleName,
          lastName: input.lastName,
          displayName: input.displayName ?? input.legalName,
          birthDate: input.birthDate,
          genderCode: input.genderCode,
          maritalStatusCode: input.maritalStatusCode,
          nationalityCountryCode: input.nationalityCountryCode,
          personalEmail: input.personalEmail,
          mobilePhone: input.mobilePhone,
          metadata: input.metadata,
        })
        .returning({ id: hrmPersons.id, personCode: hrmPersons.personCode });

      if (!person) {
        throw new Error("Failed to insert person");
      }

      await tx.insert(auditLog).values({
        orgId,
        actorPrincipalId: actorPrincipalId ?? null,
        action: HRM_EVENTS.PERSON_CREATED,
        entityType: "hrm_person",
        entityId: person.id,
        correlationId,
        details: {
          personId: person.id,
          personCode: person.personCode,
        },
      });

      await tx.insert(outboxEvent).values({
        orgId,
        type: "HRM.PERSON_CREATED",
        version: "1",
        correlationId,
        payload: {
          personId: person.id,
          personCode: person.personCode,
        },
      });

      return {
        personId: person.id,
        personCode: person.personCode,
      };
    });

    return ok(data);
  } catch (error) {
    return err(HRM_ERROR_CODES.INTERNAL_ERROR, "Failed to create person", {
      cause: error instanceof Error ? error.message : "unknown_error",
    });
  }
}
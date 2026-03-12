import { and, eq } from "drizzle-orm";
import { hrmPersons } from "@afenda/db";
import type {
  CreatePersonParams,
  PersonRecord,
  PersonRepository,
} from "./person.repository";

type DbExecutor = {
  query: {
    hrmPersons: {
      findFirst: (args: unknown) => Promise<unknown>;
    };
  };
  insert: (table: unknown) => {
    values: (values: unknown) => {
      returning: () => Promise<unknown[]>;
    };
  };
};

type PersonRow = {
  id: string;
  orgId: string;
  personCode: string;
  legalName: string;
  preferredName: string | null;
  firstName: string;
  middleName: string | null;
  lastName: string;
  displayName: string | null;
  birthDate: string | null;
  genderCode: string | null;
  maritalStatusCode: string | null;
  nationalityCountryCode: string | null;
  personalEmail: string | null;
  mobilePhone: string | null;
  status: string;
};

function mapPerson(row: PersonRow): PersonRecord {
  return {
    id: row.id,
    orgId: row.orgId,
    personCode: row.personCode,
    legalName: row.legalName,
    preferredName: row.preferredName,
    firstName: row.firstName,
    middleName: row.middleName,
    lastName: row.lastName,
    displayName: row.displayName,
    birthDate: row.birthDate,
    genderCode: row.genderCode,
    maritalStatusCode: row.maritalStatusCode,
    nationalityCountryCode: row.nationalityCountryCode,
    personalEmail: row.personalEmail,
    mobilePhone: row.mobilePhone,
    status: row.status,
  };
}

export class DrizzlePersonRepository implements PersonRepository {
  constructor(private readonly db: DbExecutor) {}

  private getExecutor(tx?: unknown): DbExecutor {
    return (tx as DbExecutor) ?? this.db;
  }

  async findById(args: {
    tx?: unknown;
    orgId: string;
    personId: string;
  }): Promise<PersonRecord | null> {
    const db = this.getExecutor(args.tx);

    const row = (await db.query.hrmPersons.findFirst({
      where: and(eq(hrmPersons.orgId, args.orgId), eq(hrmPersons.id, args.personId)),
    })) as PersonRow | undefined;

    return row ? mapPerson(row) : null;
  }

  async findByPersonCode(args: {
    tx?: unknown;
    orgId: string;
    personCode: string;
  }): Promise<PersonRecord | null> {
    const db = this.getExecutor(args.tx);

    const row = (await db.query.hrmPersons.findFirst({
      where: and(eq(hrmPersons.orgId, args.orgId), eq(hrmPersons.personCode, args.personCode)),
    })) as PersonRow | undefined;

    return row ? mapPerson(row) : null;
  }

  async insert(args: {
    tx?: unknown;
    params: CreatePersonParams;
  }): Promise<PersonRecord> {
    const db = this.getExecutor(args.tx);
    const p = args.params;

    const rows = (await db
      .insert(hrmPersons)
      .values({
        orgId: p.orgId,
        personCode: p.personCode,
        legalName: p.legalName,
        preferredName: p.preferredName,
        firstName: p.firstName,
        middleName: p.middleName,
        lastName: p.lastName,
        displayName: p.displayName,
        birthDate: p.birthDate,
        genderCode: p.genderCode,
        maritalStatusCode: p.maritalStatusCode,
        nationalityCountryCode: p.nationalityCountryCode,
        personalEmail: p.personalEmail,
        mobilePhone: p.mobilePhone,
        metadata: p.metadata,
      })
      .returning()) as PersonRow[];

    const row = rows[0];
    if (!row) {
      throw new Error("Failed to insert person");
    }

    return mapPerson(row);
  }
}

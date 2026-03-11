export interface EmployeeProfileRecord {
  id: string;
  orgId: string;
  personId: string;
  employeeCode: string;
  workerType: "employee" | "contractor" | "intern" | "director";
  currentStatus: string;
  primaryLegalEntityId: string | null;
  primaryEmploymentId: string | null;
}

export interface EmployeeProfileRepository {
  findById(args: {
    tx?: unknown;
    orgId: string;
    employeeId: string;
  }): Promise<EmployeeProfileRecord | null>;

  findByPersonId(args: {
    tx?: unknown;
    orgId: string;
    personId: string;
  }): Promise<EmployeeProfileRecord | null>;

  insert(args: {
    tx?: unknown;
    orgId: string;
    actorUserId: string;
    personId: string;
    employeeCode: string;
    workerType: EmployeeProfileRecord["workerType"];
    legalEntityId: string;
  }): Promise<EmployeeProfileRecord>;

  updatePrimaryEmploymentId(args: {
    tx?: unknown;
    orgId: string;
    employeeId: string;
    primaryEmploymentId: string;
  }): Promise<void>;
}
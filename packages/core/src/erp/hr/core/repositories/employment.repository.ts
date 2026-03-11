export interface EmploymentRecord {
  id: string;
  orgId: string;
  employeeId: string;
  legalEntityId: string;
  employmentNumber: string;
  employmentType: string;
  hireDate: string;
  startDate: string;
  probationEndDate: string | null;
  confirmationDate: string | null;
  terminationDate: string | null;
  terminationReasonCode: string | null;
  employmentStatus: string;
  payrollStatus: string;
  isPrimary: boolean;
}

export interface EmploymentRepository {
  findById(args: {
    tx?: unknown;
    orgId: string;
    employmentId: string;
  }): Promise<EmploymentRecord | null>;

  existsActiveEmploymentForEmployee(args: {
    tx?: unknown;
    orgId: string;
    employeeId: string;
  }): Promise<boolean>;

  insert(args: {
    tx?: unknown;
    orgId: string;
    actorUserId: string;
    employeeId: string;
    legalEntityId: string;
    employmentNumber: string;
    employmentType: string;
    hireDate: string;
    startDate: string;
    probationEndDate?: string;
  }): Promise<EmploymentRecord>;

  updateStatus(args: {
    tx?: unknown;
    orgId: string;
    employmentId: string;
    employmentStatus: string;
    terminationDate?: string;
    terminationReasonCode?: string;
    actorUserId: string;
  }): Promise<void>;

  insertStatusHistory(args: {
    tx?: unknown;
    orgId: string;
    actorUserId: string;
    employmentId: string;
    oldStatus: string | null;
    newStatus: string;
    changedAt: string;
    reasonCode: string;
    comment?: string;
  }): Promise<void>;
}
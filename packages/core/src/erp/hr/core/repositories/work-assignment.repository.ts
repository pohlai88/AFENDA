export interface WorkAssignmentRecord {
  id: string;
  orgId: string;
  employmentId: string;
  legalEntityId: string;
  businessUnitId: string | null;
  departmentId: string | null;
  costCenterId: string | null;
  locationId: string | null;
  positionId: string | null;
  jobId: string | null;
  gradeId: string | null;
  managerEmployeeId: string | null;
  workScheduleId: string | null;
  employmentClass: string | null;
  fteRatio: string;
  assignmentStatus: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  isCurrent: boolean;
  changeReason: string | null;
}

export interface WorkAssignmentRepository {
  findCurrentByEmploymentId(args: {
    tx?: unknown;
    orgId: string;
    employmentId: string;
  }): Promise<WorkAssignmentRecord | null>;

  findOverlappingAssignments(args: {
    tx?: unknown;
    orgId: string;
    employmentId: string;
    effectiveFrom: string;
    effectiveTo?: string | null;
  }): Promise<WorkAssignmentRecord[]>;

  insert(args: {
    tx?: unknown;
    orgId: string;
    actorUserId: string;
    employmentId: string;
    legalEntityId: string;
    businessUnitId?: string;
    departmentId?: string;
    costCenterId?: string;
    locationId?: string;
    positionId?: string;
    jobId?: string;
    gradeId?: string;
    managerEmployeeId?: string;
    workScheduleId?: string;
    employmentClass?: string;
    fteRatio?: string;
    effectiveFrom: string;
    effectiveTo?: string;
    changeReason: string;
  }): Promise<WorkAssignmentRecord>;

  closeCurrentAssignment(args: {
    tx?: unknown;
    orgId: string;
    employmentId: string;
    effectiveTo: string;
    actorUserId: string;
  }): Promise<void>;
}
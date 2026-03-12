export interface CreateRosterAssignmentInput {
  employmentId: string;
  shiftId: string;
  workDate: string;
  status?: string;
}

export interface CreateRosterAssignmentOutput {
  rosterAssignmentId: string;
  employmentId: string;
  shiftId: string;
  workDate: string;
  status: string;
}

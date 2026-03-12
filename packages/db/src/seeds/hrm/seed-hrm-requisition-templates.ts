export interface HrmRequisitionSeed {
  requisitionNumber: string;
  requisitionTitle: string;
  orgUnitCode: string;
  positionCode: string;
  requestedHeadcount: string;
  requestedStartDate: string;
  status: "draft" | "submitted" | "approved";
}

export const hrmRequisitionSeeds: readonly HrmRequisitionSeed[] = [
  {
    requisitionNumber: "REQ-2026-0001",
    requisitionTitle: "Recruiter Expansion",
    orgUnitCode: "DEPT-HR",
    positionCode: "POS-REC-001",
    requestedHeadcount: "1",
    requestedStartDate: "2026-04-01",
    status: "approved",
  },
  {
    requisitionNumber: "REQ-2026-0002",
    requisitionTitle: "Engineer Growth",
    orgUnitCode: "DEPT-IT",
    positionCode: "POS-SWE2-001",
    requestedHeadcount: "2",
    requestedStartDate: "2026-05-01",
    status: "submitted",
  },
];

export interface HrmPositionSeed {
  positionCode: string;
  positionTitle: string;
  orgUnitCode: string;
  jobCode: string;
  gradeCode: string;
  headcountLimit: number;
}

export const hrmPositionSeeds: readonly HrmPositionSeed[] = [
  {
    positionCode: "POS-HRBP-001",
    positionTitle: "HR Business Partner",
    orgUnitCode: "DEPT-HR",
    jobCode: "JOB-HRBP",
    gradeCode: "G09",
    headcountLimit: 1,
  },
  {
    positionCode: "POS-REC-001",
    positionTitle: "Recruiter",
    orgUnitCode: "DEPT-HR",
    jobCode: "JOB-REC",
    gradeCode: "G07",
    headcountLimit: 2,
  },
  {
    positionCode: "POS-SWE2-001",
    positionTitle: "Software Engineer II",
    orgUnitCode: "DEPT-IT",
    jobCode: "JOB-SWE2",
    gradeCode: "G07",
    headcountLimit: 4,
  },
];

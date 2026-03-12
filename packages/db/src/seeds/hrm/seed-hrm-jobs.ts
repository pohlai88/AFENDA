export interface HrmJobSeed {
  jobCode: string;
  jobTitle: string;
}

export const hrmJobSeeds: readonly HrmJobSeed[] = [
  { jobCode: "JOB-HRBP", jobTitle: "HR Business Partner" },
  { jobCode: "JOB-REC", jobTitle: "Recruiter" },
  { jobCode: "JOB-HRA", jobTitle: "HR Administrator" },
  { jobCode: "JOB-SWE2", jobTitle: "Software Engineer II" },
  { jobCode: "JOB-FIN-ANL", jobTitle: "Finance Analyst" },
];

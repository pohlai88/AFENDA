export interface CreateJobInput {
  jobCode?: string;
  jobTitle: string;
  status?: string;
}

export interface CreateJobOutput {
  jobId: string;
  jobCode: string;
}
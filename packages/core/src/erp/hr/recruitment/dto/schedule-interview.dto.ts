export interface ScheduleInterviewInput {
  applicationId: string;
  interviewType: string;
  scheduledAt?: string;
  interviewerEmployeeId?: string;
  status?: string;
}

export interface ScheduleInterviewOutput {
  interviewId: string;
}
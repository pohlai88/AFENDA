export interface ScheduleInterviewInput {
  applicationId: string;
  interviewType: string;
  scheduledAt: string;
  locationOrLink?: string;
  interviewerEmployeeId?: string;
  status?: string;
}

export interface ScheduleInterviewOutput {
  interviewId: string;
  applicationId: string;
  status: string;
}
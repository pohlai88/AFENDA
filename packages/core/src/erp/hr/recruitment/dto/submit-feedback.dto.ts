export interface SubmitInterviewFeedbackInput {
  interviewId: string;
  reviewerEmployeeId?: string;
  recommendation?: string;
  comments?: string;
  submittedAt?: string;
}

export interface SubmitInterviewFeedbackOutput {
  feedbackId: string;
}
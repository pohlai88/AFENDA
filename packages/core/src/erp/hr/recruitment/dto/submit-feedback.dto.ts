export interface SubmitInterviewFeedbackInput {
  interviewId: string;
  reviewerEmployeeId?: string;
  rating?: number;
  recommendation?: string;
  feedbackText?: string;
  comments?: string;
  submittedAt?: string;
}

export interface SubmitInterviewFeedbackOutput {
  interviewFeedbackId: string;
  interviewId: string;
  feedbackId: string;
}
export interface RecordProbationReviewInput {
  employmentId: string;
  reviewDueDate?: string;
  reviewStatus?: string;
  decisionCode?: string;
  confirmedAt?: string;
  reviewDate?: string;
  outcome?: string;
  reviewerEmployeeId?: string;
  comments?: string;
}

export interface RecordProbationReviewOutput {
  probationReviewId: string;
  employmentId: string;
  reviewStatus: string;
}
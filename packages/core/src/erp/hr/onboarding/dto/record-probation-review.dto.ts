export interface RecordProbationReviewInput {
  employmentId: string;
  reviewDate: string;
  outcome: string;
  reviewerEmployeeId?: string;
  comments?: string;
}

export interface RecordProbationReviewOutput {
  probationReviewId: string;
}
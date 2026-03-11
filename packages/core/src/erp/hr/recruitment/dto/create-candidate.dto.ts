export interface CreateCandidateInput {
  candidateCode?: string;
  fullName: string;
  email?: string;
  mobilePhone?: string;
  sourceChannel?: string;
  status?: string;
}

export interface CreateCandidateOutput {
  candidateId: string;
  candidateCode: string;
}
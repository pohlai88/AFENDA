export interface CompleteOnboardingTaskInput {
  onboardingTaskId: string;
  completedAt: string;
}

export interface CompleteOnboardingTaskOutput {
  onboardingTaskId: string;
  status: string;
  completedAt: string;
}
export interface CompleteOnboardingTaskInput {
  taskId: string;
  completedAt?: string;
}

export interface CompleteOnboardingTaskOutput {
  taskId: string;
  previousStatus: string;
  currentStatus: string;
}
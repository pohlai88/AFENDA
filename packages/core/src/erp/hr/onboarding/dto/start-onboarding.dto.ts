export interface StartOnboardingTaskInput {
  taskCode?: string;
  taskTitle: string;
  ownerEmployeeId?: string;
  dueDate?: string;
  mandatory?: boolean;
}

export interface StartOnboardingInput {
  employmentId: string;
  templateId?: string;
  startDate?: string;
  targetCompletionDate?: string;
  tasks?: StartOnboardingTaskInput[];
}

export interface StartOnboardingOutput {
  onboardingPlanId: string;
  taskIds: string[];
}
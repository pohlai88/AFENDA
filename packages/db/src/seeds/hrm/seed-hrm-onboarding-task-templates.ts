export interface HrmOnboardingTaskTemplateSeed {
  taskCode: string;
  taskTitle: string;
  mandatory: boolean;
  dueDaysFromStart: number;
}

export interface HrmExitChecklistTemplateSeed {
  itemCode: string;
  itemLabel: string;
  mandatory: boolean;
}

export const hrmOnboardingTaskTemplateSeeds: readonly HrmOnboardingTaskTemplateSeed[] = [
  { taskCode: "ONB-DOCS", taskTitle: "Submit onboarding documents", mandatory: true, dueDaysFromStart: 2 },
  { taskCode: "ONB-IT", taskTitle: "Provision IT account and access", mandatory: true, dueDaysFromStart: 1 },
  { taskCode: "ONB-POL", taskTitle: "Review HR policies", mandatory: true, dueDaysFromStart: 5 },
  { taskCode: "ONB-TEAM", taskTitle: "Team introduction session", mandatory: false, dueDaysFromStart: 3 },
];

export const hrmExitChecklistTemplateSeeds: readonly HrmExitChecklistTemplateSeed[] = [
  { itemCode: "EXIT-ASSET", itemLabel: "Return company assets", mandatory: true },
  { itemCode: "EXIT-ACCESS", itemLabel: "Deactivate system access", mandatory: true },
  { itemCode: "EXIT-FIN", itemLabel: "Clear finance obligations", mandatory: true },
  { itemCode: "EXIT-INTERVIEW", itemLabel: "Complete exit interview", mandatory: false },
];

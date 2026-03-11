import { GovernanceExecutionRepository } from "./governance-execution.repository";

const repository = new GovernanceExecutionRepository();

export async function createReviewReminder(input: {
  reviewCycleId: string;
  recipientUserId: string;
  reminderType: "upcoming" | "due" | "overdue";
  metadata?: Record<string, unknown>;
}) {
  const [row] = await repository.insertReminder({
    reviewCycleId: input.reviewCycleId,
    recipientUserId: input.recipientUserId,
    reminderType: input.reminderType,
    status: "pending",
    metadata: input.metadata ?? null,
  });

  return row;
}

export async function dispatchReviewReminders() {
  // Scaffold only:
  // 1. query pending reminders
  // 2. send email / inbox notification
  // 3. mark sent / failed
  return { ok: true };
}

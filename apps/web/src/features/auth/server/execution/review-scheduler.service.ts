import { GovernanceExecutionRepository } from "./governance-execution.repository";

const repository = new GovernanceExecutionRepository();

function getQuarterLabel(date = new Date()): string {
  const year = date.getUTCFullYear();
  const quarter = Math.floor(date.getUTCMonth() / 3) + 1;
  return `${year}-Q${quarter}`;
}

export async function scheduleQuarterlyAuthReviews(input: {
  frameworks: ("SOX" | "ISO27001" | "SOC2" | "INTERNAL")[];
  ownerUserId?: string;
  reviewerUserId?: string;
  approverUserId?: string;
}) {
  const periodLabel = getQuarterLabel();
  const dueAt = new Date();
  dueAt.setUTCDate(dueAt.getUTCDate() + 14);

  const results = [];

  for (const framework of input.frameworks) {
    const [row] = await repository.insertReviewCycle({
      framework,
      periodType: "quarterly",
      periodLabel,
      title: `${framework} Auth Review ${periodLabel}`,
      status: "open",
      ownerUserId: input.ownerUserId ?? null,
      reviewerUserId: input.reviewerUserId ?? null,
      approverUserId: input.approverUserId ?? null,
      dueAt,
      openedAt: new Date(),
      metadata: {
        generationMode: "scheduled",
      },
    });

    results.push(row);
  }

  return results;
}

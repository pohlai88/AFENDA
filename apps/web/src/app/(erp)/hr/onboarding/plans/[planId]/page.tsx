import { HrmScreen } from "../../../shared/components/HrmScreen";

export default async function OnboardingPlanDetailPage({
  params,
}: {
  params: Promise<{ planId: string }>;
}) {
  const { planId } = await params;

  return (
    <HrmScreen
      title={`Onboarding Plan Detail - ${planId}`}
      description="Task-by-task onboarding completion, ownership, and mandatory control checks."
      emptyMessage="No onboarding plan details found for this plan ID."
      links={[{ label: "Back to Queue", href: "/hr/onboarding/queue" }]}
    />
  );
}

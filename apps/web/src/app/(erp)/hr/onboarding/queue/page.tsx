import { HrmScreen } from "../../shared/components/HrmScreen";

export default function OnboardingQueuePage() {
  return (
    <HrmScreen
      title="Onboarding Queue"
      description="Operational queue of active onboarding plans and pending mandatory tasks."
      emptyMessage="No pending onboarding plans found."
      links={[
        { label: "Plan Detail", href: "/hr/onboarding/plans/demo-plan" },
        { label: "Probation Reviews", href: "/hr/onboarding/probation-reviews" },
      ]}
    />
  );
}

import { HrmScreen } from "../../shared/components/HrmScreen";

export default function ProbationReviewPage() {
  return (
    <HrmScreen
      title="Probation Review"
      description="Probation outcomes with evidence trail for confirm, extend, or fail decisions."
      emptyMessage="No probation reviews recorded yet."
      links={[{ label: "Onboarding Queue", href: "/hr/onboarding/queue" }]}
    />
  );
}

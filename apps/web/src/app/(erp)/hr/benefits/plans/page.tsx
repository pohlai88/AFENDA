import { HrmScreen } from "../../shared/components/HrmScreen";

export default function BenefitPlansPage() {
  return (
    <HrmScreen
      title="Benefit Plans"
      description="Plan definitions for health, retirement, and supplemental benefits, including eligibility policy metadata."
      emptyMessage="No benefit plans found. Create plans via the benefit plan command endpoint."
      links={[
        { label: "Benefit Enrollments", href: "/hr/benefits/enrollments" },
        { label: "Back to HR", href: "/hr" },
      ]}
    />
  );
}

import { HrmScreen } from "../../shared/components/HrmScreen";

export default function BenefitEnrollmentsPage() {
  return (
    <HrmScreen
      title="Benefit Enrollments"
      description="Employee benefit enrollments with status tracking for active, pending, suspended, and terminated states."
      emptyMessage="No benefit enrollments found. Enroll employees in plans through the benefit enrollment command endpoint."
      links={[
        { label: "Benefit Plans", href: "/hr/benefits/plans" },
        { label: "Back to HR", href: "/hr" },
      ]}
    />
  );
}

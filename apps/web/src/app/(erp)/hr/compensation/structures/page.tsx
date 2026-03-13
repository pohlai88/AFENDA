import { HrmScreen } from "../../shared/components/HrmScreen";

export default function CompensationStructuresPage() {
  return (
    <HrmScreen
      title="Compensation Structures"
      description="Salary bands and pay-basis definitions that standardize compensation policy across roles and grades."
      emptyMessage="No compensation structures found. Create one using the compensation structure command endpoint first."
      links={[
        { label: "Compensation Packages", href: "/hr/compensation/packages" },
        { label: "Salary History", href: "/hr/compensation/salary-history" },
        { label: "Back to HR", href: "/hr" },
      ]}
    />
  );
}

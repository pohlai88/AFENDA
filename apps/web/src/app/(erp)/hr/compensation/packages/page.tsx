import { HrmScreen } from "../../shared/components/HrmScreen";

export default function CompensationPackagesPage() {
  return (
    <HrmScreen
      title="Compensation Packages"
      description="Employee-level compensation assignments with effective dating and current package tracking."
      emptyMessage="No compensation packages found. Assign packages via the compensation package command endpoint."
      links={[
        { label: "Compensation Structures", href: "/hr/compensation/structures" },
        { label: "Salary History", href: "/hr/compensation/salary-history" },
        { label: "Back to HR", href: "/hr" },
      ]}
    />
  );
}

import { HrmScreen } from "../../shared/components/HrmScreen";

export default function SalaryHistoryPage() {
  return (
    <HrmScreen
      title="Salary History"
      description="Append-only salary change timeline for auditability, compensation governance, and trend analysis."
      emptyMessage="No salary history records found. Records are generated when packages are assigned or salary changes are processed."
      links={[
        { label: "Compensation Structures", href: "/hr/compensation/structures" },
        { label: "Compensation Packages", href: "/hr/compensation/packages" },
        { label: "Back to HR", href: "/hr" },
      ]}
    />
  );
}

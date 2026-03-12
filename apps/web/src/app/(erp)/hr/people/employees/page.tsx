import { HrmScreen } from "../../shared/components/HrmScreen";

export default function EmployeeListPage() {
  return (
    <HrmScreen
      title="Employee List"
      description="Operational roster with worker status and assignment visibility."
      emptyMessage="No employee records found yet. Run HR seed data or hire the first employee to populate this view."
      links={[
        { label: "Hire Employee", href: "/hr/people/hire" },
        { label: "Employment Timeline", href: "/hr/people/timeline/demo-employment" },
      ]}
    />
  );
}

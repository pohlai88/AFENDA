import { HrmScreen } from "../../shared/components/HrmScreen";

export default function HireEmployeePage() {
  return (
    <HrmScreen
      title="Hire Employee Wizard"
      description="Create person, employee, employment, and initial assignment as one controlled flow."
      emptyMessage="Hire wizard form scaffold is ready; connect create-person and hire-employee command payloads next."
      links={[{ label: "Employee List", href: "/hr/people/employees" }]}
    />
  );
}

import { HrmScreen } from "../../shared/components/HrmScreen";

export default function TerminateEmployeePage() {
  return (
    <HrmScreen
      title="Terminate Employment"
      description="Controlled lifecycle transition from active employment to separation workflow."
      emptyMessage="No termination action selected. Choose an employment record to continue."
      links={[
        { label: "Employee List", href: "/hr/people/employees" },
        { label: "Separation Cases", href: "/hr/onboarding/separation-cases/demo-case" },
      ]}
    />
  );
}

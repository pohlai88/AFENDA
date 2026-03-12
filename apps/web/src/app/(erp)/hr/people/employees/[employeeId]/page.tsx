import { HrmScreen } from "../../../shared/components/HrmScreen";

export default async function EmployeeDetailPage({
  params,
}: {
  params: Promise<{ employeeId: string }>;
}) {
  const { employeeId } = await params;

  return (
    <HrmScreen
      title={`Employee Detail - ${employeeId}`}
      description="Employee profile truth, employment context, and organization placement."
      emptyMessage="Employee detail payload is not yet available for this record."
      links={[{ label: "Back to Employees", href: "/hr/people/employees" }]}
    />
  );
}

import { HrmScreen } from "../../../shared/components/HrmScreen";

export default async function EmploymentTimelinePage({
  params,
}: {
  params: Promise<{ employmentId: string }>;
}) {
  const { employmentId } = await params;

  return (
    <HrmScreen
      title={`Employment Timeline - ${employmentId}`}
      description="Chronological lifecycle history for employment state and assignment changes."
      emptyMessage="No lifecycle entries found for this employment record yet."
      links={[{ label: "Back to Employees", href: "/hr/people/employees" }]}
    />
  );
}

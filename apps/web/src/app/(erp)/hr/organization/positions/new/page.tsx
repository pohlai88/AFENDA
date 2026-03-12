import { HrmScreen } from "../../../shared/components/HrmScreen";

export default function CreatePositionPage() {
  return (
    <HrmScreen
      title="Create Position"
      description="Define budgeted position, job mapping, grade, and headcount limit."
      emptyMessage="Position creation form scaffold is ready for command binding."
      links={[{ label: "Back to Positions", href: "/hr/organization/positions" }]}
    />
  );
}

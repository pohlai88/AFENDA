import { HrmScreen } from "../../shared/components/HrmScreen";

export default function PositionListPage() {
  return (
    <HrmScreen
      title="Position List"
      description="Budgeted positions with headcount, status, and incumbency context."
      emptyMessage="No positions available. Create a new position to start workforce planning."
      links={[
        { label: "Create Position", href: "/hr/organization/positions/new" },
        { label: "Org Tree", href: "/hr/organization/org-tree" },
      ]}
    />
  );
}

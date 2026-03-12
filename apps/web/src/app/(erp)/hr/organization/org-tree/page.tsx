import { HrmScreen } from "../../shared/components/HrmScreen";

export default function OrgTreePage() {
  return (
    <HrmScreen
      title="Org Tree"
      description="Legal entity and org-unit hierarchy for assignment and approval routing."
      emptyMessage="Organization tree has no units yet. Seed org units to enable reporting lines and structure views."
      links={[{ label: "Positions", href: "/hr/organization/positions" }]}
    />
  );
}

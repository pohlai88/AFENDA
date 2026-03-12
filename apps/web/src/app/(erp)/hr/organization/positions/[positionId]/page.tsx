import { HrmScreen } from "../../../shared/components/HrmScreen";

export default async function PositionDetailPage({
  params,
}: {
  params: Promise<{ positionId: string }>;
}) {
  const { positionId } = await params;

  return (
    <HrmScreen
      title={`Position Detail - ${positionId}`}
      description="Position occupancy, requirements, and assignment history."
      emptyMessage="No incumbency detail found for this position."
      links={[{ label: "Back to Positions", href: "/hr/organization/positions" }]}
    />
  );
}

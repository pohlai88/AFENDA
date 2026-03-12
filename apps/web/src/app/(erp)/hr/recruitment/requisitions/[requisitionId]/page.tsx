import { HrmScreen } from "../../../shared/components/HrmScreen";

export default async function RequisitionDetailPage({
  params,
}: {
  params: Promise<{ requisitionId: string }>;
}) {
  const { requisitionId } = await params;

  return (
    <HrmScreen
      title={`Requisition Detail - ${requisitionId}`}
      description="Approval status, headcount intent, and linked candidate applications."
      emptyMessage="No requisition detail available for this record."
      links={[{ label: "Back to Requisitions", href: "/hr/recruitment/requisitions" }]}
    />
  );
}

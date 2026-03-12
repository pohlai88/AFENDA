import { HrmScreen } from "../../../shared/components/HrmScreen";

export default async function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ applicationId: string }>;
}) {
  const { applicationId } = await params;

  return (
    <HrmScreen
      title={`Application Detail - ${applicationId}`}
      description="Application dossier with candidate, requisition, and interview decision context."
      emptyMessage="No application payload found for this ID yet."
      links={[{ label: "Back to Requisitions", href: "/hr/recruitment/requisitions" }]}
    />
  );
}

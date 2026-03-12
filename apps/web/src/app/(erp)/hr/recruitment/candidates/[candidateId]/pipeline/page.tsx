import { HrmScreen } from "../../../../shared/components/HrmScreen";

export default async function CandidatePipelinePage({
  params,
}: {
  params: Promise<{ candidateId: string }>;
}) {
  const { candidateId } = await params;

  return (
    <HrmScreen
      title={`Candidate Pipeline - ${candidateId}`}
      description="Stage-by-stage hiring journey with interview and offer readiness status."
      emptyMessage="No pipeline stages found for this candidate yet."
      links={[
        { label: "Requisitions", href: "/hr/recruitment/requisitions" },
        { label: "Offers", href: "/hr/recruitment/offers" },
      ]}
    />
  );
}

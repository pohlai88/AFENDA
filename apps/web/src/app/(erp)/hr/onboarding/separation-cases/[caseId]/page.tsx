import { HrmScreen } from "../../../shared/components/HrmScreen";

export default async function SeparationCasePage({
  params,
}: {
  params: Promise<{ caseId: string }>;
}) {
  const { caseId } = await params;

  return (
    <HrmScreen
      title={`Separation Case - ${caseId}`}
      description="Leaver workflow with case status, mandatory clearance items, and finalization controls."
      emptyMessage="No separation-case payload available for this case yet."
      links={[
        { label: "Exit Clearance", href: "/hr/onboarding/exit-clearance" },
        { label: "Onboarding Queue", href: "/hr/onboarding/queue" },
      ]}
    />
  );
}

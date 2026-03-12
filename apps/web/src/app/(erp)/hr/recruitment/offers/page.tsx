import { HrmScreen } from "../../shared/components/HrmScreen";

export default function OfferPanelPage() {
  return (
    <HrmScreen
      title="Offer Panel"
      description="Offer issuance and acceptance state tracking before onboarding handoff."
      emptyMessage="No offer records are available yet."
      links={[
        { label: "Requisitions", href: "/hr/recruitment/requisitions" },
        { label: "Onboarding Queue", href: "/hr/onboarding/queue" },
      ]}
    />
  );
}

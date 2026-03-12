import { HrmScreen } from "../../shared/components/HrmScreen";

export default function RequisitionListPage() {
  return (
    <HrmScreen
      title="Requisition List"
      description="Workforce demand pipeline from draft requisition through approved hiring request."
      emptyMessage="No requisitions available. Create requisitions to open recruitment pipeline."
      links={[
        { label: "Offers", href: "/hr/recruitment/offers" },
        { label: "Candidate Pipeline", href: "/hr/recruitment/candidates/demo-candidate/pipeline" },
      ]}
    />
  );
}

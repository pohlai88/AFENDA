import { HrmScreen } from "../../shared/components/HrmScreen";

export default function ExitClearancePage() {
  return (
    <HrmScreen
      title="Exit Clearance Tracker"
      description="Cross-functional clearance tracker controlling eligibility for separation finalization."
      emptyMessage="No exit-clearance items currently pending."
      links={[{ label: "Separation Case", href: "/hr/onboarding/separation-cases/demo-case" }]}
    />
  );
}

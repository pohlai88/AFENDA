import { HrmScreen } from "../../shared/components/HrmScreen";

export default function TransferEmployeePage() {
  return (
    <HrmScreen
      title="Transfer Employee"
      description="Effective-dated assignment transfer preserving historical truth."
      emptyMessage="No transfer records queued. Submit transfer commands from this screen once form binding is enabled."
      links={[
        { label: "Employee List", href: "/hr/people/employees" },
        { label: "Employment Timeline", href: "/hr/people/timeline/demo-employment" },
      ]}
    />
  );
}

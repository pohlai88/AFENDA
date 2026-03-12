import { HrmScreen } from "../../shared/components/HrmScreen";

export default function LeaveRequestsPage() {
  return (
    <HrmScreen
      title="My Leave Requests"
      description="ESS view — submit and track your personal leave requests across all leave types."
      emptyMessage="No leave requests found. Submit a leave request via the Create Leave Request API or wait for the self-service form to be connected."
      links={[
        { label: "Leave Approvals", href: "/hr/leave/approvals" },
        { label: "Leave Balances", href: "/hr/leave/balances" },
        { label: "Back to HR", href: "/hr" },
      ]}
    />
  );
}

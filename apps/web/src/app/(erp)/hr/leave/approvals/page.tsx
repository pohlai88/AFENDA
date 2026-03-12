import { HrmScreen } from "../../shared/components/HrmScreen";

export default function LeaveApprovalsPage() {
  return (
    <HrmScreen
      title="Leave Approval Queue"
      description="MSS view — review and action pending leave requests submitted by your direct reports."
      emptyMessage="No pending leave requests for approval. Requests will appear here once employees submit leave via the ESS portal."
      links={[
        { label: "My Leave Requests", href: "/hr/leave/requests" },
        { label: "Leave Balances", href: "/hr/leave/balances" },
        { label: "Back to HR", href: "/hr" },
      ]}
    />
  );
}

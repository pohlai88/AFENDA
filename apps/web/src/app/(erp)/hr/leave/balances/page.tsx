import { HrmScreen } from "../../shared/components/HrmScreen";

export default function LeaveBalancesPage() {
  return (
    <HrmScreen
      title="Leave Balances"
      description="Accrual ledger — opening balance, accrued, consumed, and closing balance per employee per leave type per period."
      emptyMessage="No leave balances found. Balances are calculated per accrual period. Use the Recalculate Balance command to compute balances for a given employee, leave type, and period."
      links={[
        { label: "My Leave Requests", href: "/hr/leave/requests" },
        { label: "Leave Approvals", href: "/hr/leave/approvals" },
        { label: "Back to HR", href: "/hr" },
      ]}
    />
  );
}

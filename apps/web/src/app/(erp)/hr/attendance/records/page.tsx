import { HrmScreen } from "../../shared/components/HrmScreen";

export default function AttendanceRecordsPage() {
  return (
    <HrmScreen
      title="Attendance Records"
      description="Daily attendance log — clock-in/out records, status, and work hour summaries by employee."
      emptyMessage="No attendance records found. Records are created when employees clock in or when supervisors record attendance manually via the API."
      links={[
        { label: "Roster Assignments", href: "/hr/attendance/roster" },
        { label: "Back to HR", href: "/hr" },
      ]}
    />
  );
}

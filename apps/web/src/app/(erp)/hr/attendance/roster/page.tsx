import { HrmScreen } from "../../shared/components/HrmScreen";

export default function RosterAssignmentsPage() {
  return (
    <HrmScreen
      title="Roster Assignments"
      description="Shift schedule assignments — links employees to shifts and work calendars for attendance tracking."
      emptyMessage="No roster assignments found. Create assignments by linking employee roles to shifts via the Record Attendance API endpoint."
      links={[
        { label: "Attendance Records", href: "/hr/attendance/records" },
        { label: "Back to HR", href: "/hr" },
      ]}
    />
  );
}

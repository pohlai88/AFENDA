import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, Button } from "@afenda/ui";

const groups = [
  {
    title: "People",
    href: "/hr/people/employees",
    links: [
      { label: "Employee List", href: "/hr/people/employees" },
      { label: "Hire Employee", href: "/hr/people/hire" },
      { label: "Transfer Employee", href: "/hr/people/transfer" },
      { label: "Terminate Employee", href: "/hr/people/terminate" },
    ],
  },
  {
    title: "Organization",
    href: "/hr/organization/org-tree",
    links: [
      { label: "Org Tree", href: "/hr/organization/org-tree" },
      { label: "Positions", href: "/hr/organization/positions" },
      { label: "Jobs", href: "/hr/organization/jobs" },
      { label: "Grades", href: "/hr/organization/grades" },
    ],
  },
  {
    title: "Recruitment",
    href: "/hr/recruitment/requisitions",
    links: [
      { label: "Requisitions", href: "/hr/recruitment/requisitions" },
      { label: "Offers", href: "/hr/recruitment/offers" },
    ],
  },
  {
    title: "Onboarding",
    href: "/hr/onboarding/queue",
    links: [
      { label: "Onboarding Queue", href: "/hr/onboarding/queue" },
      { label: "Probation Reviews", href: "/hr/onboarding/probation-reviews" },
      { label: "Exit Clearance", href: "/hr/onboarding/exit-clearance" },
    ],
  },
  {
    title: "Attendance",
    href: "/hr/attendance/records",
    links: [
      { label: "Attendance Records", href: "/hr/attendance/records" },
      { label: "Roster Assignments", href: "/hr/attendance/roster" },
    ],
  },
  {
    title: "Leave",
    href: "/hr/leave/requests",
    links: [
      { label: "My Leave Requests", href: "/hr/leave/requests" },
      { label: "Leave Approvals", href: "/hr/leave/approvals" },
      { label: "Leave Balances", href: "/hr/leave/balances" },
    ],
  },
];

export default function HrmHomePage() {
  if (groups.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-8">
        <Card>
          <CardHeader>
            <CardTitle>No HR modules available</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            HR modules are not configured for this environment yet.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-6 space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Human Resources</h1>
        <p className="text-sm text-muted-foreground">
          Workforce truth-first workspace for people, organization, recruitment, onboarding/offboarding, attendance, and leave.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {groups.map((group) => (
          <Card key={group.title}>
            <CardHeader>
              <CardTitle>{group.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" size="sm" asChild>
                <Link href={group.href}>Open {group.title}</Link>
              </Button>
              <div className="flex flex-wrap gap-2">
                {group.links.map((link) => (
                  <Button key={link.href} variant="ghost" size="sm" asChild>
                    <Link href={link.href}>{link.label}</Link>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

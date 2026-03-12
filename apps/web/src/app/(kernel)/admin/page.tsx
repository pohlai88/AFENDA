import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@afenda/ui";
import { Users } from "lucide-react";

/** Admin overview — links to admin tools. */
export default function AdminOverview() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <Card>
        <CardHeader>
          <CardTitle>Admin</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Internal admin and observability tools.
          </p>
          <ul className="space-y-2 text-sm">
            <li>
              <Link
                href="/admin/users"
                className="flex items-center gap-2 text-primary hover:underline"
              >
                <Users className="h-4 w-4" />
                Users
              </Link>
              <span className="text-muted-foreground"> — List all users (Neon Auth admin API)</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

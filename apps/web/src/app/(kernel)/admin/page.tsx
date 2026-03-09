import { Card, CardContent, CardHeader, CardTitle } from "@afenda/ui";

/** Admin overview — placeholder. */
export default function AdminOverview() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <Card>
        <CardHeader>
          <CardTitle>Admin</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Admin overview placeholder. Component examination in progress.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

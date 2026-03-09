import { Card, CardContent, CardHeader, CardTitle } from "@afenda/ui";

/** Separation of Duties — placeholder. */
export default function PolicySodPage() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <Card>
        <CardHeader>
          <CardTitle>Separation of Duties</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            SoD policy and access control — coming soon.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

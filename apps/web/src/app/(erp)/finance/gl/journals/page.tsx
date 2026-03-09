import { Card, CardContent, CardHeader, CardTitle } from "@afenda/ui";

/** GL Journals — placeholder. */
export default function JournalsPage() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <Card>
        <CardHeader>
          <CardTitle>Journals</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            General ledger journal entries — coming soon.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

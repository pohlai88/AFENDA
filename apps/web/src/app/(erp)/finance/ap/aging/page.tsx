import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  AnalyticsWorkspace,
} from "@afenda/ui";

/** AP Aging Report — AnalyticsWorkspace scaffold. */
export default function AgingPage() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <AnalyticsWorkspace>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Current
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">—</p>
              <p className="text-xs text-muted-foreground">0–30 days</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                31–60 days
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">—</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                61–90 days
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">—</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                90+ days
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">—</p>
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Aging Report</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Accounts payable aging — scaffold. Wire to aging API.
            </p>
          </CardContent>
        </Card>
      </AnalyticsWorkspace>
    </div>
  );
}

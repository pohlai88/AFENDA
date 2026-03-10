import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@afenda/ui";

export default function InvestorPortalPage() {
  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Investor Portal</CardTitle>
          <CardDescription>
            Access financial statements, portfolio analytics, and investment performance data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold mb-2">Portal Capabilities</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>View consolidated financial statements across portfolio</li>
              <li>Track investment performance metrics and KPIs</li>
              <li>Access quarterly and annual reports</li>
              <li>Review cap table and equity distribution</li>
              <li>Download investor documentation and presentations</li>
              <li>Receive notifications on material events</li>
            </ul>
          </div>
          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              This portal is accessible by invitation only. Investors receive access to their
              specific portfolio entities and aggregated reporting views.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

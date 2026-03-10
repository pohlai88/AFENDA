import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@afenda/ui";

export default function CidPortalHomePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>AFENDA Central Intelligence Portal</CardTitle>
          <CardDescription>
            You are signed in to the CID portal. The Central Intelligence Team workspace provides
            multi-tenant administration, system monitoring, and cross-organizational insights.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>
            This portal serves as the central administrative facade for AFENDA operations,
            enabling communication and oversight across all tenant organizations.
          </p>
          <div className="rounded-lg border bg-muted/50 p-4">
            <h3 className="mb-2 font-semibold text-foreground">CID Capabilities</h3>
            <ul className="list-inside list-disc space-y-1">
              <li>Multi-tenant administration and governance</li>
              <li>System-wide monitoring and analytics</li>
              <li>Cross-organizational reporting</li>
              <li>Audit trail inspection and compliance oversight</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

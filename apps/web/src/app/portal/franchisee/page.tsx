import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@afenda/ui";

export default function FranchiseePortalPage() {
  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Franchisee Portal</CardTitle>
          <CardDescription>
            Manage your franchise location operations, inventory, and compliance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold mb-2">Portal Capabilities</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Access franchise operations dashboard and analytics</li>
              <li>Manage local inventory and procurement</li>
              <li>Submit royalty reports and financial statements</li>
              <li>Track compliance with franchise standards</li>
              <li>View marketing materials and brand guidelines</li>
              <li>Access training resources and support documentation</li>
              <li>Communicate with franchisor support team</li>
            </ul>
          </div>
          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              This portal is accessible by franchisees with active franchise agreements.
              Each franchisee has access to their specific location(s) and can manage
              operations within their granted permissions.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

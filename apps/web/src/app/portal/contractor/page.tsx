import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@afenda/ui";

export default function ContractorPortalPage() {
  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Contractor Portal</CardTitle>
          <CardDescription>
            Access work orders, project documentation, and submit timesheets
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold mb-2">Portal Capabilities</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>View assigned work orders and project details</li>
              <li>Submit timesheets and track hours worked</li>
              <li>Upload completion documentation and photos</li>
              <li>Access project specifications and blueprints</li>
              <li>Track payment status and invoice history</li>
              <li>View safety protocols and compliance requirements</li>
              <li>Communicate with project managers</li>
            </ul>
          </div>
          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              This portal is accessible by contractors with active service agreements.
              Contractors can view and update work orders assigned to them and submit
              documentation for completed projects.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

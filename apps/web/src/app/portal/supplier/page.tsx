import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@afenda/ui";

export default function SupplierPortalHomePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>Supplier Portal</CardTitle>
          <CardDescription>
            You are signed in to the supplier portal. The supplier workspace modules can be
            mounted from this route group.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          This page provides a stable landing route for supplier portal sign-ins.
        </CardContent>
      </Card>
    </div>
  );
}

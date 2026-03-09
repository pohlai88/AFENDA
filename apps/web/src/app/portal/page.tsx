import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@afenda/ui";

export default function PortalEntryPage() {
  return (
    <Card className="max-w-3xl border-border/60 shadow-sm">
      <CardHeader>
        <CardTitle>Choose a portal</CardTitle>
        <CardDescription>
          Supplier and customer portals are isolated. Continue with the matching sign-in route.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-muted-foreground">
        <div>
          <Link className="underline-offset-4 hover:underline" href="/auth/portal/supplier/signin">
            Supplier sign in
          </Link>
        </div>
        <div>
          <Link className="underline-offset-4 hover:underline" href="/auth/portal/customer/signin">
            Customer sign in
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
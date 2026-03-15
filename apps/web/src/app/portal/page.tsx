import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@afenda/ui";

export default function PortalEntryPage() {
  return (
    <Card className="max-w-3xl border-border/60 shadow-sm">
      <CardHeader>
        <CardTitle>Choose a portal</CardTitle>
        <CardDescription>
          Portal authentication routes have been removed. Rebuild portal access flows before
          enabling these entries.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-muted-foreground">
        <div>
          <Link className="underline-offset-4 hover:underline" href="/app">
            Supplier portal coming back later
          </Link>
        </div>
        <div>
          <Link className="underline-offset-4 hover:underline" href="/app">
            Customer portal coming back later
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

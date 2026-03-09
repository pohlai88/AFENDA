import Link from "next/link";
import { getServerSession } from "next-auth";
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@afenda/ui";
import { authOptions } from "@/lib/auth";

type PortalLabel = "app" | "supplier" | "customer";

function toPortalLabel(portal: string | undefined): PortalLabel {
  if (portal === "supplier" || portal === "customer") {
    return portal;
  }
  return "app";
}

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  const portal = toPortalLabel(session?.user?.portal);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4 py-8">
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="space-y-2">
            <div className="flex items-center justify-between gap-4">
              <CardTitle>AFENDA Portal</CardTitle>
              <Badge variant="secondary">{portal} session</Badge>
            </div>
            <CardDescription>
              Secure portal access is enforced by route middleware. Use your invitation and portal-specific
              sign-in route to continue.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span>Signed in as {session?.user?.email ?? "guest"}</span>
            <span aria-hidden>•</span>
            <Link className="underline-offset-4 hover:underline" href="/auth/signout">
              Sign out
            </Link>
          </CardContent>
        </Card>

        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}
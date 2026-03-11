import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@afenda/ui";
import Link from "next/link";

import { auth } from "@/auth";

/**
 * Portal layout — defence-in-depth session check.
 *
 * First line of defence: middleware (proxy.ts) blocks unauthenticated requests.
 * Second line of defence: this layout verifies the session server-side before
 * rendering any portal content.
 *
 * Redirects to /auth/signin if session is missing or invalid.
 * Portal-specific access checks (correct portal role) are performed in the
 * individual portal sub-layouts or pages.
 */
export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4 py-8">
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="space-y-2">
            <div className="flex items-center justify-between gap-4">
              <CardTitle>AFENDA Portal</CardTitle>
            </div>
            <CardDescription>
              Authenticated as {session.user.email}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span>{session.user.email}</span>
            <span aria-hidden>•</span>
            <Link className="underline-offset-4 hover:underline" href="/">
              Home
            </Link>
          </CardContent>
        </Card>

        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}

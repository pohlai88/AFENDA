import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@afenda/ui";

import { auth } from "@/auth";

export const dynamic = "force-dynamic";

export default async function AppHomePage() {
  const session = await auth();

  return (
    <main className="space-y-4 p-4 md:p-6">
      <Card>
        <CardHeader>
          <CardTitle>Enterprise Workspace</CardTitle>
          <CardDescription>Neon Auth is now the active session layer for this app.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p className="text-foreground">
            Signed in as {session?.user.email ?? "an authenticated operator"}.
          </p>
          <p className="text-muted-foreground">
            Middleware protects the top-level workspace routes before server layouts perform their defence-in-depth checks.
          </p>
          <p>
            <Link className="font-medium text-primary underline-offset-4 hover:underline" href="/auth/sign-out">
              Sign out
            </Link>
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Communication Module Next</CardTitle>
          <CardDescription>
            Todo will be delivered as one application inside a larger Communication suite.
          </CardDescription>
        </CardHeader>
      </Card>
    </main>
  );
}

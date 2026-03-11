import { Card, CardContent, CardHeader, CardTitle } from "@afenda/ui";
import { auth } from "@/auth";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getRecentSecurityChallenges } from "@/features/auth/server/ops/auth-ops.service";
import { ChallengeRow } from "../_components/ChallengeRow";

export default async function AdminSecurityChallengesPage() {
  const session = await auth();

  if (!session?.user || !session.user.roles.includes("admin")) {
    redirect("/auth/signin");
  }

  const challenges = await getRecentSecurityChallenges(100);

  return (
    <div className="space-y-6 p-6">
      <div>
        <Link
          href="/app/admin/security"
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Security Ops
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Auth Challenges
        </h1>
        <p className="text-sm text-muted-foreground">
          Review MFA, invite, and reset challenge lifecycle.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Challenges</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {challenges.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                No challenges found.
              </div>
            ) : (
              challenges.map((item) => (
                <ChallengeRow key={item.id} item={item} />
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

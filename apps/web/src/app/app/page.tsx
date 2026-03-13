import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@afenda/ui";

import { auth } from "@/auth";
import { publishAuthAuditEvent } from "@/features/auth/server/audit/audit.helpers";
import {
  clearActiveOrganizationCookie,
  getEffectiveActiveOrganizationId,
  listOrganizationsForCurrentUser,
  setActiveOrganization,
} from "@/lib/auth/tenant-context";
import { isTenantRoutingV2Enabled } from "@/lib/feature-flags";

/** Session depends on cookies — force dynamic (Neon Auth). */
export const dynamic = "force-dynamic";

async function safePublishRoutingTelemetry(
  event: "auth.signin.success" | "auth.signin.failure",
  payload: Parameters<typeof publishAuthAuditEvent>[1],
) {
  try {
    await publishAuthAuditEvent(event, payload);
  } catch {
    // Best-effort telemetry only.
  }
}

export default async function AppHomePage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  if (!isTenantRoutingV2Enabled()) {
    return (
      <main className="space-y-4 p-4 md:p-6">
        <Card>
          <CardHeader>
            <CardTitle>Enterprise Workspace</CardTitle>
            <CardDescription>
              Tenant routing v2 is disabled. Enable it to enforce org-scoped post-login flow.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Signed in as {session.user.email}
          </CardContent>
        </Card>
      </main>
    );
  }

  const organizations = await listOrganizationsForCurrentUser();
  if (!organizations?.length) {
    await safePublishRoutingTelemetry("auth.signin.failure", {
      email: session.user.email,
      portal: "app",
      errorCode: "SIGNIN_NO_ORG",
      metadata: {
        metric: "signin_no_org",
      },
    });
    redirect("/auth/onboarding");
  }

  const activeOrgId = await getEffectiveActiveOrganizationId();
  let resolvedActiveOrgId = activeOrgId;
  if (!activeOrgId) {
    if (organizations.length === 1) {
      resolvedActiveOrgId = organizations[0]!.id;
      await setActiveOrganization(resolvedActiveOrgId);
    } else {
      redirect("/auth/select-organization?callback=/app");
    }
  } else {
    const activeOrgExists = organizations.some((organization) => organization.id === activeOrgId);
    if (!activeOrgExists) {
      await clearActiveOrganizationCookie();
      redirect("/auth/select-organization?callback=/app&error=inactive_org");
    }
  }

  const activeOrganization = organizations.find(
    (organization) => organization.id === resolvedActiveOrgId,
  );

  return (
    <main className="space-y-4 p-4 md:p-6">
      <Card>
        <CardHeader>
          <CardTitle>Enterprise Workspace</CardTitle>
          <CardDescription>Stable post-login landing with tenant context resolved.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p className="text-foreground">Organization: {activeOrganization?.name ?? "Workspace"}</p>
          <p className="text-muted-foreground">User: {session.user.email}</p>
          <p className="text-muted-foreground">
            Organization ID: {resolvedActiveOrgId ?? "unresolved"}
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

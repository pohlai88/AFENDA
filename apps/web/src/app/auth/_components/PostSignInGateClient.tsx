"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Spinner } from "@afenda/ui";

import { resolveSafeRedirectPath } from "@/lib/auth/redirects";
import { useActiveOrganization, useListOrganizations, useSession } from "@/lib/auth/client";
import { authCardSurfaceStyle } from "@/app/auth/_components/surface-styles";

type PostSignInGateClientProps = {
  nextPath: string;
};

function buildSignInPath(nextPath: string): string {
  return `/auth/sign-in?next=${encodeURIComponent(nextPath)}`;
}

function buildSelectOrganizationPath(nextPath: string): string {
  return `/auth/select-organization?next=${encodeURIComponent(nextPath)}`;
}

export function PostSignInGateClient({ nextPath }: PostSignInGateClientProps) {
  const router = useRouter();
  const destination = resolveSafeRedirectPath(nextPath, "/app");
  const { data: session, isPending: isSessionPending } = useSession();
  const { data: activeOrganization, isPending: isActivePending } = useActiveOrganization();
  const { data: organizations, isPending: isListPending } = useListOrganizations();

  useEffect(() => {
    if (isSessionPending || isActivePending || isListPending) {
      return;
    }

    if (!session?.user) {
      router.replace(buildSignInPath(destination));
      return;
    }

    const count = (organizations ?? []).length;
    if (activeOrganization?.id || count <= 1) {
      router.replace(destination);
      return;
    }

    router.replace(buildSelectOrganizationPath(destination));
  }, [
    activeOrganization?.id,
    destination,
    isActivePending,
    isListPending,
    isSessionPending,
    organizations,
    router,
    session?.user,
  ]);

  return (
    <Card className="border" style={authCardSurfaceStyle}>
      <CardHeader>
        <CardTitle>Finalizing sign-in</CardTitle>
        <CardDescription>
          We are preparing your organization context and redirecting you now.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner className="size-4" />
          Loading your workspace access...
        </p>
      </CardContent>
    </Card>
  );
}

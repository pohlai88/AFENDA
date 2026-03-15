"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Spinner,
} from "@afenda/ui";
import { Building2, CheckCircle2 } from "lucide-react";

import { resolveSafeRedirectPath } from "@/lib/auth/redirects";
import {
  organization,
  useActiveOrganization,
  useListOrganizations,
  useSession,
} from "@/lib/auth/client";
import {
  authCardSurfaceStyle,
  authFeedbackErrorStyle,
} from "@/app/auth/_components/surface-styles";

type OrganizationSelectorClientProps = {
  nextPath: string;
};

function getErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "message" in error) {
    const message = error.message;
    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }

  return fallback;
}

export function OrganizationSelectorClient({ nextPath }: OrganizationSelectorClientProps) {
  const router = useRouter();
  const destination = resolveSafeRedirectPath(nextPath, "/app");
  const { data: session, isPending: isSessionPending } = useSession();
  const {
    data: activeOrganization,
    isPending: isActivePending,
    refetch: refetchActive,
  } = useActiveOrganization();
  const {
    data: organizations,
    isPending: isListPending,
    refetch: refetchOrganizations,
  } = useListOrganizations();

  const [error, setError] = useState<string | null>(null);
  const [pendingOrganizationId, setPendingOrganizationId] = useState<string | null>(null);
  const [isMutating, startMutating] = useTransition();

  useEffect(() => {
    if (isSessionPending || isActivePending || isListPending) {
      return;
    }

    if (!session?.user) {
      router.replace(`/auth/sign-in?next=${encodeURIComponent(destination)}`);
      return;
    }

    const count = (organizations ?? []).length;
    if (activeOrganization?.id || count <= 1) {
      router.replace(destination);
    }
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

  function handleSelectOrganization(organizationId: string) {
    setError(null);
    setPendingOrganizationId(organizationId);

    startMutating(async () => {
      const response = await organization.setActive({ organizationId });
      if (response.error) {
        setError(getErrorMessage(response.error, "Unable to set active organization."));
        setPendingOrganizationId(null);
        return;
      }

      await Promise.all([refetchActive(), refetchOrganizations()]);
      router.replace(destination);
      router.refresh();
    });
  }

  const isLoading = isSessionPending || isActivePending || isListPending;
  const items = organizations ?? [];

  return (
    <Card className="border" style={authCardSurfaceStyle}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="size-5" />
          Choose an organization
        </CardTitle>
        <CardDescription>
          You belong to multiple organizations. Choose one to continue into your workspace.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <Spinner className="size-4" />
            Loading organizations...
          </p>
        ) : null}

        {error ? (
          <Alert variant="destructive" style={authFeedbackErrorStyle}>
            <AlertTitle>Could not switch organization</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {!isLoading && items.length > 1
          ? items.map((item) => {
              const isPending = pendingOrganizationId === item.id;

              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-xl border px-3 py-2"
                  style={{
                    background: "var(--surface-250)",
                    borderColor: "var(--border-subtle)",
                  }}
                >
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium text-foreground">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{item.slug}</p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => handleSelectOrganization(item.id)}
                    disabled={isMutating}
                  >
                    {isPending ? (
                      <span className="inline-flex items-center gap-2">
                        <Spinner className="size-4" />
                        Switching...
                      </span>
                    ) : (
                      "Use organization"
                    )}
                  </Button>
                </div>
              );
            })
          : null}

        {!isLoading && items.length <= 1 ? (
          <Alert>
            <CheckCircle2 className="size-4" />
            <AlertTitle>No selection needed</AlertTitle>
            <AlertDescription>Redirecting to your destination.</AlertDescription>
          </Alert>
        ) : null}
      </CardContent>
    </Card>
  );
}

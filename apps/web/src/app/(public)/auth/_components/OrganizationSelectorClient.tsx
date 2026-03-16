"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Alert, AlertDescription, AlertTitle, Button, Spinner } from "@afenda/ui";
import { CheckCircle2 } from "lucide-react";

import { resolveSafeRedirectPath } from "@/lib/auth/redirects";
import {
  organization,
  useActiveOrganization,
  useListOrganizations,
  useSession,
} from "@/lib/auth/client";

import { AuthFeedback } from "./AuthFormPrimitives";
import { AuthPanelFrame } from "./AuthPanelFrame";
import { usePanelTitleFocus } from "./usePanelTitleFocus";

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
  const panelTitleRef = useRef<HTMLDivElement | null>(null);
  usePanelTitleFocus(panelTitleRef);

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
    <AuthPanelFrame
      title="Choose an organization"
      titleRef={panelTitleRef}
      description="You belong to multiple organizations. Choose one to continue into your workspace."
      contentClassName="space-y-3"
    >
      {isLoading ? (
        <p
          className="inline-flex items-center gap-2 text-sm text-muted-foreground"
          role="status"
          aria-live="polite"
        >
          <Spinner className="size-4" />
          Loading organizations...
        </p>
      ) : null}

      {error ? (
        <AuthFeedback tone="error" role="alert" ariaLive="assertive">
          <strong>Could not switch organization</strong>
          <span>{error}</span>
        </AuthFeedback>
      ) : null}

      {!isLoading && items.length > 1
        ? items.map((item) => {
            const isPending = pendingOrganizationId === item.id;

            return (
              <div key={item.id} className="auth-org-tile">
                <div className="auth-org-tile-meta">
                  <span className="auth-org-tile-name">{item.name}</span>
                  <span className="auth-org-tile-slug">{item.slug}</span>
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
    </AuthPanelFrame>
  );
}

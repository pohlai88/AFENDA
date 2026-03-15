"use client";

import { useState, useTransition } from "react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Skeleton,
  Spinner,
  toast,
} from "@afenda/ui";
import { Building2, CheckCircle2, RefreshCcw } from "lucide-react";

import {
  organization,
  useActiveOrganization,
  useListOrganizations,
} from "@/lib/auth/client";

function getErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "message" in error) {
    const message = error.message;
    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }

  return fallback;
}

export function OrganizationContextClient() {
  const {
    data: activeOrganization,
    isPending: isActivePending,
    refetch: refetchActive,
  } = useActiveOrganization();
  const {
    data: organizations,
    isPending: isListPending,
    refetch: refetchList,
  } = useListOrganizations();

  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pendingOrgId, setPendingOrgId] = useState<string | null>(null);
  const [isMutating, startMutating] = useTransition();
  const [isRefreshing, startRefreshing] = useTransition();

  const activeId = activeOrganization?.id;

  function handleRefresh() {
    setError(null);
    startRefreshing(async () => {
      await Promise.all([refetchActive(), refetchList()]);
    });
  }

  function handleSetActiveOrganization(organizationId: string) {
    setError(null);
    setFeedback(null);
    setPendingOrgId(organizationId);

    startMutating(async () => {
      const response = await organization.setActive({ organizationId });
      if (response.error) {
        setError(getErrorMessage(response.error, "Unable to set active organization."));
        setPendingOrgId(null);
        return;
      }

      toast.success("Active organization updated.");
      setFeedback("Organization context updated for this session.");
      await Promise.all([refetchActive(), refetchList()]);
      setPendingOrgId(null);
    });
  }

  return (
    <section>
      <h2 className="mb-0.5 text-sm font-semibold text-foreground">Organization context</h2>
      <p className="mb-4 text-xs text-muted-foreground">
        Review and switch your active organization when you belong to multiple orgs.
      </p>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Building2 className="h-4 w-4" />
            Active organization
          </CardTitle>
          <CardDescription className="text-xs">
            Neon organization state enriches your current AFENDA tenant context.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing || isMutating || isActivePending || isListPending}
          >
            {isRefreshing ? (
              <span className="inline-flex items-center gap-2">
                <Spinner className="size-4" />
                Refreshing...
              </span>
            ) : (
              <span className="inline-flex items-center gap-2">
                <RefreshCcw className="size-4" />
                Refresh organizations
              </span>
            )}
          </Button>

          {feedback ? (
            <Alert>
              <CheckCircle2 className="size-4" />
              <AlertTitle>Organization updated</AlertTitle>
              <AlertDescription>{feedback}</AlertDescription>
            </Alert>
          ) : null}

          {error ? (
            <Alert variant="destructive">
              <AlertTitle>Unable to switch organization</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          {isActivePending || isListPending ? (
            <div className="space-y-2">
              <Skeleton className="h-16 w-full rounded-xl" />
              <Skeleton className="h-16 w-full rounded-xl" />
            </div>
          ) : (
            <div className="space-y-2">
              {activeOrganization ? (
                <div className="rounded-xl border border-border/70 bg-background/70 p-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">Current</Badge>
                    <span className="text-sm font-medium text-foreground">{activeOrganization.name}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">Slug: {activeOrganization.slug}</p>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-border/70 px-4 py-6 text-sm text-muted-foreground">
                  No active organization is currently selected.
                </div>
              )}

              {(organizations ?? []).length > 0 ? (
                (organizations ?? []).map((item) => {
                  const isActive = item.id === activeId;
                  const isPending = pendingOrgId === item.id;

                  return (
                    <div key={item.id} className="flex items-center justify-between rounded-xl border border-border/70 px-3 py-2">
                      <div className="space-y-0.5">
                        <p className="text-sm font-medium text-foreground">{item.name}</p>
                        <p className="text-xs text-muted-foreground">{item.slug}</p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant={isActive ? "secondary" : "outline"}
                        onClick={() => handleSetActiveOrganization(item.id)}
                        disabled={isActive || isMutating}
                      >
                        {isPending ? (
                          <span className="inline-flex items-center gap-2">
                            <Spinner className="size-4" />
                            Switching...
                          </span>
                        ) : isActive ? (
                          "Active"
                        ) : (
                          "Set active"
                        )}
                      </Button>
                    </div>
                  );
                })
              ) : (
                <div className="rounded-xl border border-dashed border-border/70 px-4 py-6 text-sm text-muted-foreground">
                  No organizations were returned for this account.
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

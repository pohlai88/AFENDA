"use client";

import { useEffect, useState, useTransition } from "react";
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
  Spinner,
  toast,
} from "@afenda/ui";
import { Building2, RefreshCcw } from "lucide-react";

import {
  listNeonClientOrganizations,
  neonClientCapabilities,
  setNeonClientActiveOrganization,
  useActiveOrganization,
} from "@/lib/auth/client";

type OrganizationListItem = {
  id: string;
  name: string;
  slug: string;
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

function normalizeOrganizations(input: unknown): OrganizationListItem[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return input
    .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
    .map((item) => {
      const id = typeof item.id === "string" ? item.id : "";
      const name = typeof item.name === "string" && item.name.trim() ? item.name : "Organization";
      const slug = typeof item.slug === "string" ? item.slug : "";

      return {
        id,
        name,
        slug,
      };
    })
    .filter((item) => item.id.length > 0);
}

/**
 * List current user's organizations (Neon Auth auth.organization.list) — Settings > Organizations.
 */
export function ListOrganizationsClient({ refreshNonce = 0 }: { refreshNonce?: number }) {
  const canListOrganizations = neonClientCapabilities.organization.list;
  const canSetActiveOrganization = neonClientCapabilities.organization.setActive;

  const {
    data: activeOrganization,
    isPending: isActivePending,
    refetch: refetchActive,
  } = useActiveOrganization();

  const [organizations, setOrganizations] = useState<OrganizationListItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingOrgId, setPendingOrgId] = useState<string | null>(null);
  const [isMutating, startMutating] = useTransition();

  async function loadOrganizations() {
    if (!canListOrganizations) {
      setOrganizations([]);
      setIsLoading(false);
      return;
    }

    setError(null);
    setIsLoading(true);

    const response = await listNeonClientOrganizations();
    if (response.error) {
      setError(getErrorMessage(response.error, "Unable to load organizations."));
      setIsLoading(false);
      return;
    }

    setOrganizations(normalizeOrganizations(response.data));
    setIsLoading(false);
  }

  useEffect(() => {
    void loadOrganizations();
    void refetchActive();
  }, [refreshNonce]);

  function handleSetActiveOrganization(organizationId: string) {
    if (!canSetActiveOrganization) {
      setError("Active organization switching is unavailable in this environment.");
      return;
    }

    setError(null);
    setPendingOrgId(organizationId);

    startMutating(async () => {
      const response = await setNeonClientActiveOrganization({ organizationId });
      if (response.error) {
        setError(getErrorMessage(response.error, "Unable to set active organization."));
        setPendingOrgId(null);
        return;
      }

      toast.success("Active organization updated.");
      await Promise.all([loadOrganizations(), refetchActive()]);
      setPendingOrgId(null);
    });
  }

  const activeId = activeOrganization?.id ?? null;

  return (
    <section>
      <h2 className="mb-0.5 text-sm font-semibold text-foreground">Your organizations</h2>
      <p className="mb-4 text-xs text-muted-foreground">
        Organizations you belong to. Switch between them from the workspace selector.
      </p>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Building2 className="h-4 w-4" />
            Organizations
          </CardTitle>
          <CardDescription className="text-xs">
            Organizations returned by Neon Auth for your current account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {!canListOrganizations ? (
            <Alert>
              <AlertTitle>Organization listing unavailable</AlertTitle>
              <AlertDescription>
                Neon organization.list is not available in this environment.
              </AlertDescription>
            </Alert>
          ) : null}

          {error ? (
            <Alert variant="destructive">
              <AlertTitle>Unable to load organizations</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!canListOrganizations || isLoading || isMutating || isActivePending}
            onClick={() => {
              void loadOrganizations();
            }}
          >
            {isLoading ? (
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

          {isLoading ? (
            <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <Spinner className="size-4" />
              Loading organizations...
            </p>
          ) : null}

          {!isLoading && organizations.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/70 px-4 py-6 text-sm text-muted-foreground">
              No organizations were returned for this account.
            </div>
          ) : null}

          {!isLoading
            ? organizations.map((organization) => {
                const isActive = organization.id === activeId;
                const isPending = pendingOrgId === organization.id;

                return (
                  <div
                    key={organization.id}
                    className="flex items-center justify-between rounded-xl border border-border/70 px-3 py-3"
                  >
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium text-foreground">{organization.name}</p>
                      {organization.slug ? (
                        <p className="text-xs text-muted-foreground">Slug: {organization.slug}</p>
                      ) : null}
                    </div>

                    <div className="flex items-center gap-2">
                      {isActive ? <Badge variant="secondary">Active</Badge> : null}
                      <Button
                        type="button"
                        size="sm"
                        variant={isActive ? "secondary" : "outline"}
                        onClick={() => handleSetActiveOrganization(organization.id)}
                        disabled={!canSetActiveOrganization || isActive || isMutating}
                      >
                        {isPending ? (
                          <span className="inline-flex items-center gap-2">
                            <Spinner className="size-4" />
                            Switching...
                          </span>
                        ) : !canSetActiveOrganization ? (
                          "Unavailable"
                        ) : isActive ? (
                          "Current"
                        ) : (
                          "Set active"
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })
            : null}
        </CardContent>
      </Card>
    </section>
  );
}

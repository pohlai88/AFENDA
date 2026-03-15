"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
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
import { CalendarClock, MailOpen } from "lucide-react";

import { organization, useSession } from "@/lib/auth/client";

type InvitationItem = {
  id: string;
  organizationId: string;
  organizationName: string;
  email: string;
  role: "admin" | "member" | "owner";
  status: string;
  createdAt: Date;
  expiresAt: Date;
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

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

function normalizeInvitations(input: unknown): InvitationItem[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return input
    .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
    .map((item) => {
      const role = item.role;
      const status = item.status;
      const normalizedRole: InvitationItem["role"] =
        role === "admin" || role === "owner" ? role : "member";

      return {
        id: typeof item.id === "string" ? item.id : "",
        organizationId: typeof item.organizationId === "string" ? item.organizationId : "",
        organizationName:
          typeof item.organizationName === "string" ? item.organizationName : "Organization",
        email: typeof item.email === "string" ? item.email : "",
        role: normalizedRole,
        status: typeof status === "string" ? status : "pending",
        createdAt:
          item.createdAt instanceof Date ? item.createdAt : new Date(String(item.createdAt ?? "")),
        expiresAt:
          item.expiresAt instanceof Date ? item.expiresAt : new Date(String(item.expiresAt ?? "")),
      };
    })
    .filter((item) => item.id.length > 0);
}

export function OrganizationInvitationsClient() {
  const { data: session, isPending: isSessionPending } = useSession();
  const [invitations, setInvitations] = useState<InvitationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);
  const [isMutating, startMutating] = useTransition();

  async function loadInvitations() {
    setError(null);
    setIsLoading(true);

    const response = await organization.listUserInvitations();
    if (response.error) {
      setError(getErrorMessage(response.error, "Unable to load invitations."));
      setIsLoading(false);
      return;
    }

    setInvitations(normalizeInvitations(response.data));
    setIsLoading(false);
  }

  useEffect(() => {
    if (isSessionPending) {
      return;
    }

    if (!session?.user) {
      setInvitations([]);
      setIsLoading(false);
      return;
    }

    void loadInvitations();
  }, [isSessionPending, session?.user]);

  function handleAccept(invitationId: string) {
    setPendingActionId(invitationId);
    setError(null);

    startMutating(async () => {
      const response = await organization.acceptInvitation({ invitationId });
      if (response.error) {
        setError(getErrorMessage(response.error, "Unable to accept invitation."));
        setPendingActionId(null);
        return;
      }

      toast.success("Invitation accepted.");
      await loadInvitations();
      setPendingActionId(null);
    });
  }

  function handleReject(invitationId: string) {
    setPendingActionId(invitationId);
    setError(null);

    startMutating(async () => {
      const response = await organization.rejectInvitation({ invitationId });
      if (response.error) {
        setError(getErrorMessage(response.error, "Unable to reject invitation."));
        setPendingActionId(null);
        return;
      }

      toast.success("Invitation declined.");
      await loadInvitations();
      setPendingActionId(null);
    });
  }

  const pendingInvitations = useMemo(
    () => invitations.filter((invitation) => invitation.status === "pending"),
    [invitations],
  );

  return (
    <section>
      <h2 className="mb-0.5 text-sm font-semibold text-foreground">Organization invitations</h2>
      <p className="mb-4 text-xs text-muted-foreground">
        Review pending invitations and accept or decline membership requests.
      </p>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <MailOpen className="h-4 w-4" />
            Pending invitations
          </CardTitle>
          <CardDescription className="text-xs">
            Invitations are sent to your signed-in email and require explicit approval.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {error ? (
            <Alert variant="destructive">
              <AlertTitle>Unable to load invitations</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isLoading || isMutating || isSessionPending}
            onClick={() => {
              void loadInvitations();
            }}
          >
            {isLoading ? (
              <span className="inline-flex items-center gap-2">
                <Spinner className="size-4" />
                Refreshing...
              </span>
            ) : (
              "Refresh invitations"
            )}
          </Button>

          {isLoading ? (
            <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <Spinner className="size-4" />
              Loading invitations...
            </p>
          ) : null}

          {!isLoading && pendingInvitations.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/70 px-4 py-6 text-sm text-muted-foreground">
              No pending invitations for this account.
            </div>
          ) : null}

          {!isLoading
            ? pendingInvitations.map((invitation) => {
                const isPending = pendingActionId === invitation.id;

                return (
                  <div
                    key={invitation.id}
                    className="space-y-3 rounded-xl border border-border/70 px-3 py-3"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-foreground">{invitation.organizationName}</p>
                      <Badge variant="secondary">{invitation.role}</Badge>
                    </div>

                    <div className="space-y-1 text-xs text-muted-foreground">
                      <p className="inline-flex items-center gap-1.5">
                        <CalendarClock className="size-3.5" />
                        Expires {formatDate(invitation.expiresAt)}
                      </p>
                      {invitation.email ? <p>Invited as {invitation.email}</p> : null}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleAccept(invitation.id)}
                        disabled={isMutating}
                      >
                        {isPending ? (
                          <span className="inline-flex items-center gap-2">
                            <Spinner className="size-4" />
                            Accepting...
                          </span>
                        ) : (
                          "Accept"
                        )}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => handleReject(invitation.id)}
                        disabled={isMutating}
                      >
                        {isPending ? (
                          <span className="inline-flex items-center gap-2">
                            <Spinner className="size-4" />
                            Declining...
                          </span>
                        ) : (
                          "Decline"
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

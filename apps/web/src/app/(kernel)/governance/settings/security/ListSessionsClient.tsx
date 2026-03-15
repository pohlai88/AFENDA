"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
import { LaptopMinimal, LogOut, Monitor, RefreshCcw, ShieldX, Smartphone } from "lucide-react";

import {
  listSessions,
  revokeOtherSessions,
  revokeSession,
  revokeSessions,
  signOut,
  useSession,
} from "@/lib/auth/client";

type AuthSessionRecord = {
  id: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  userId: string;
  expiresAt: Date | string;
  token: string;
  ipAddress?: string | null;
  userAgent?: string | null;
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

function toDate(value: Date | string): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDateTime(value: Date | string): string {
  const date = toDate(value);
  if (!date) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatRelative(value: Date | string): string {
  const date = toDate(value);
  if (!date) {
    return "Unknown";
  }

  const diffMs = date.getTime() - Date.now();
  const diffMinutes = Math.round(diffMs / 60_000);
  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });

  if (Math.abs(diffMinutes) < 60) {
    return formatter.format(diffMinutes, "minute");
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 48) {
    return formatter.format(diffHours, "hour");
  }

  const diffDays = Math.round(diffHours / 24);
  return formatter.format(diffDays, "day");
}

function getDeviceLabel(userAgent?: string | null): string {
  const raw = userAgent?.trim();
  if (!raw) {
    return "Unknown device";
  }

  if (/iPhone|Android.+Mobile|Mobile/i.test(raw)) {
    return "Mobile browser";
  }

  if (/iPad|Tablet/i.test(raw)) {
    return "Tablet browser";
  }

  if (/Edg\//i.test(raw)) {
    return "Microsoft Edge";
  }

  if (/Chrome\//i.test(raw)) {
    return "Google Chrome";
  }

  if (/Firefox\//i.test(raw)) {
    return "Mozilla Firefox";
  }

  if (/Safari\//i.test(raw) && !/Chrome\//i.test(raw)) {
    return "Safari";
  }

  return "Browser session";
}

function isMobileSession(userAgent?: string | null): boolean {
  return Boolean(userAgent && /iPhone|Android.+Mobile|Mobile/i.test(userAgent));
}

function sortSessions(sessions: AuthSessionRecord[], currentToken?: string): AuthSessionRecord[] {
  return [...sessions].sort((left, right) => {
    const leftIsCurrent = left.token === currentToken;
    const rightIsCurrent = right.token === currentToken;

    if (leftIsCurrent !== rightIsCurrent) {
      return leftIsCurrent ? -1 : 1;
    }

    const leftUpdatedAt = toDate(left.updatedAt)?.getTime() ?? 0;
    const rightUpdatedAt = toDate(right.updatedAt)?.getTime() ?? 0;
    return rightUpdatedAt - leftUpdatedAt;
  });
}

/**
 * List active sessions (Neon Auth auth.listSessions) — Security settings.
 */
export function ListSessionsClient() {
  const router = useRouter();
  const { data: session, refetch: refetchSession } = useSession();
  const [sessions, setSessions] = useState<AuthSessionRecord[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [isRefreshing, startRefreshing] = useTransition();
  const [isMutating, startMutating] = useTransition();

  const currentToken = session?.session.token;
  const hasOtherSessions = sessions.some((item) => item.token !== currentToken);

  async function loadSessions(options?: { preserveFeedback?: boolean }) {
    if (!options?.preserveFeedback) {
      setFeedback(null);
    }

    setError(null);
    const response = await listSessions();

    if (response.error) {
      setSessions([]);
      setError(getErrorMessage(response.error, "Unable to load active sessions."));
      return;
    }

    setSessions(sortSessions((response.data ?? []) as AuthSessionRecord[], currentToken));
  }

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const response = await listSessions();
        if (cancelled) {
          return;
        }

        if (response.error) {
          setSessions([]);
          setError(getErrorMessage(response.error, "Unable to load active sessions."));
          return;
        }

        setSessions(
          sortSessions((response.data ?? []) as AuthSessionRecord[], session?.session.token),
        );
      } finally {
        if (!cancelled) {
          setIsInitialLoad(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [session?.session.token]);

  function handleRefresh() {
    startRefreshing(async () => {
      await loadSessions({ preserveFeedback: true });
      await refetchSession();
    });
  }

  function handleRevoke(token: string) {
    setPendingAction(token);
    setError(null);
    setFeedback(null);

    startMutating(async () => {
      const response = await revokeSession({ token });

      if (response.error) {
        setError(getErrorMessage(response.error, "Unable to revoke the selected session."));
        setPendingAction(null);
        return;
      }

      setFeedback("Session revoked.");
      toast.success("Session revoked.");
      await Promise.all([loadSessions({ preserveFeedback: true }), refetchSession()]);
      setPendingAction(null);
    });
  }

  function handleRevokeOthers() {
    setPendingAction("others");
    setError(null);
    setFeedback(null);

    startMutating(async () => {
      const response = await revokeOtherSessions();

      if (response.error) {
        setError(getErrorMessage(response.error, "Unable to revoke other sessions."));
        setPendingAction(null);
        return;
      }

      setFeedback("Other sessions revoked.");
      toast.success("Other sessions revoked.");
      await Promise.all([loadSessions({ preserveFeedback: true }), refetchSession()]);
      setPendingAction(null);
    });
  }

  function handleSignOutCurrentSession() {
    setPendingAction("current");
    setError(null);
    setFeedback(null);

    startMutating(async () => {
      const response = await signOut();

      if (response.error) {
        setError(getErrorMessage(response.error, "Unable to sign out the current session."));
        setPendingAction(null);
        return;
      }

      toast.success("Signed out of this device.");
      router.replace("/auth/sign-in");
      router.refresh();
    });
  }

  function handleRevokeAll() {
    setPendingAction("all");
    setError(null);
    setFeedback(null);

    startMutating(async () => {
      const response = await revokeSessions();

      if (response.error) {
        setError(getErrorMessage(response.error, "Unable to revoke active sessions."));
        setPendingAction(null);
        return;
      }

      toast.success("All sessions revoked.");
      router.replace("/auth/sign-in");
      router.refresh();
    });
  }

  return (
    <section>
      <h2 className="mb-0.5 text-sm font-semibold text-foreground">Active sessions</h2>
      <p className="mb-4 text-xs text-muted-foreground">
        View all devices or browsers where you are currently signed in.
      </p>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Monitor className="h-4 w-4" />
            Your sessions
          </CardTitle>
          <CardDescription className="text-xs">
            Review current devices, revoke unfamiliar browsers, or clear every active session.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isInitialLoad || isRefreshing || isMutating}
            >
              {isRefreshing ? (
                <span className="inline-flex items-center gap-2">
                  <Spinner className="size-4" />
                  Refreshing...
                </span>
              ) : (
                <span className="inline-flex items-center gap-2">
                  <RefreshCcw className="size-4" />
                  Refresh sessions
                </span>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRevokeOthers}
              disabled={!hasOtherSessions || isInitialLoad || isRefreshing || isMutating}
            >
              {pendingAction === "others" ? "Revoking other sessions..." : "Revoke other sessions"}
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleRevokeAll}
              disabled={sessions.length === 0 || isInitialLoad || isRefreshing || isMutating}
            >
              {pendingAction === "all" ? "Revoking all sessions..." : "Revoke all sessions"}
            </Button>
          </div>

          {feedback ? (
            <Alert>
              <Monitor className="size-4" />
              <AlertTitle>Session update complete</AlertTitle>
              <AlertDescription>{feedback}</AlertDescription>
            </Alert>
          ) : null}

          {error ? (
            <Alert variant="destructive">
              <ShieldX className="size-4" />
              <AlertTitle>Session action failed</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          {isInitialLoad ? (
            <div className="space-y-3">
              <Skeleton className="h-24 w-full rounded-xl" />
              <Skeleton className="h-24 w-full rounded-xl" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/70 px-4 py-6 text-sm text-muted-foreground">
              No active sessions were returned for this account.
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map((item) => {
                const isCurrentSession = item.token === currentToken;
                const isRowPending = pendingAction === item.token;
                const DeviceIcon = isMobileSession(item.userAgent) ? Smartphone : LaptopMinimal;

                return (
                  <div
                    key={item.id}
                    className="rounded-xl border border-border/70 bg-background/70 p-4"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <DeviceIcon className="size-4 text-muted-foreground" />
                          <p className="text-sm font-medium text-foreground">
                            {getDeviceLabel(item.userAgent)}
                          </p>
                          {isCurrentSession ? <Badge variant="secondary">This device</Badge> : null}
                        </div>

                        <div className="space-y-1 text-xs text-muted-foreground">
                          <p>{item.userAgent?.trim() || "User agent unavailable"}</p>
                          <p>IP address: {item.ipAddress?.trim() || "Unknown"}</p>
                          <p>
                            Last active: {formatDateTime(item.updatedAt)} (
                            {formatRelative(item.updatedAt)})
                          </p>
                          <p>
                            Expires: {formatDateTime(item.expiresAt)} (
                            {formatRelative(item.expiresAt)})
                          </p>
                        </div>
                      </div>

                      <div className="flex shrink-0 flex-col gap-2 sm:items-end">
                        {isCurrentSession ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleSignOutCurrentSession}
                            disabled={isRefreshing || isMutating}
                          >
                            {pendingAction === "current" ? (
                              <span className="inline-flex items-center gap-2">
                                <Spinner className="size-4" />
                                Signing out...
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-2">
                                <LogOut className="size-4" />
                                Sign out this device
                              </span>
                            )}
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleRevoke(item.token)}
                            disabled={isRefreshing || isMutating}
                          >
                            {isRowPending ? (
                              <span className="inline-flex items-center gap-2">
                                <Spinner className="size-4" />
                                Revoking...
                              </span>
                            ) : (
                              "Revoke session"
                            )}
                          </Button>
                        )}
                        <p className="text-right text-[11px] text-muted-foreground">
                          Created {formatDateTime(item.createdAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

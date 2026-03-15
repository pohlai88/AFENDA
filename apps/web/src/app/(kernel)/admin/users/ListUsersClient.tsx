"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  Alert,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Spinner,
  toast,
} from "@afenda/ui";
import {
  Ban,
  KeyRound,
  RefreshCcw,
  ShieldCheck,
  ShieldX,
  Trash2,
  UserCog,
  UserRoundCheck,
  Users,
} from "lucide-react";

type AdminUser = {
  id: string;
  email?: string | null;
  name?: string | null;
  createdAt?: string | Date;
  banned?: boolean;
  banReason?: string | null;
};

type AdminUserSession = {
  id: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  expiresAt?: string | Date;
};

type SessionPayload = {
  sessions?: AdminUserSession[];
  total?: number;
  message?: string;
};

type ListUsersClientProps = {
  /** Current user id — Ban button hidden for this user. */
  currentUserId?: string | null;
};

function getErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }

  return fallback;
}

function formatDate(value: Date | string | undefined): string {
  if (!value) {
    return "Unknown";
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

/**
 * List users (Neon Auth auth.admin.listUsers) — Admin > Users.
 */
export function ListUsersClient({ currentUserId }: ListUsersClientProps = {}) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const [limit] = useState(25);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [sessionMap, setSessionMap] = useState<Record<string, AdminUserSession[]>>({});
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [roleDialogUser, setRoleDialogUser] = useState<AdminUser | null>(null);
  const [roleInput, setRoleInput] = useState("member");
  const [roleValidationError, setRoleValidationError] = useState<string | null>(null);
  const [passwordDialogUser, setPasswordDialogUser] = useState<AdminUser | null>(null);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordValidationError, setPasswordValidationError] = useState<string | null>(null);
  const [removeDialogUser, setRemoveDialogUser] = useState<AdminUser | null>(null);
  const [isRefreshing, startRefreshing] = useTransition();
  const [isMutating, startMutating] = useTransition();

  const pageNumber = Math.floor(offset / limit) + 1;
  const hasPrev = offset > 0;
  const hasNext = offset + limit < total;

  const visibleUsers = useMemo(() => {
    return users.filter((user) => user.id !== currentUserId);
  }, [currentUserId, users]);

  async function loadUsers(options?: { preserveLoading?: boolean }) {
    if (!options?.preserveLoading) {
      setIsLoading(true);
    }

    setError(null);

    try {
      const query = new URLSearchParams({
        limit: String(limit),
        offset: String(offset),
      });
      if (search.trim()) {
        query.set("search", search.trim());
      }

      const response = await fetch(`/api/internal/admin/users?${query.toString()}`, {
        method: "GET",
      });
      const payload = (await response.json()) as {
        users?: AdminUser[];
        total?: number;
        message?: string;
      };

      if (!response.ok) {
        setUsers([]);
        setTotal(0);
        setError(payload.message ?? "Unable to load users.");
        return;
      }

      setUsers(Array.isArray(payload.users) ? payload.users : []);
      setTotal(typeof payload.total === "number" ? payload.total : 0);
    } catch (loadError) {
      setUsers([]);
      setTotal(0);
      setError(getErrorMessage(loadError, "Unable to load users."));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadUsers();
  }, [offset, search]);

  function handleRefresh() {
    startRefreshing(async () => {
      await loadUsers({ preserveLoading: true });
    });
  }

  function handleBanToggle(user: AdminUser, action: "ban" | "unban") {
    setPendingUserId(user.id);
    setError(null);

    startMutating(async () => {
      try {
        const response = await fetch(`/api/internal/admin/users/${encodeURIComponent(user.id)}/ban`, {
          method: action === "ban" ? "POST" : "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: action === "ban" ? JSON.stringify({ reason: "Admin action" }) : undefined,
        });

        const payload = (await response.json()) as { message?: string };
        if (!response.ok) {
          setError(payload.message ?? `Unable to ${action} user.`);
          setPendingUserId(null);
          return;
        }

        toast.success(action === "ban" ? "User banned." : "User unbanned.");
        await loadUsers({ preserveLoading: true });
      } catch (mutationError) {
        setError(getErrorMessage(mutationError, `Unable to ${action} user.`));
      } finally {
        setPendingUserId(null);
      }
    });
  }

  async function loadUserSessions(userId: string) {
    try {
      const response = await fetch(
        `/api/internal/admin/users/${encodeURIComponent(userId)}/sessions?limit=10&offset=0`,
        { method: "GET" },
      );
      const payload = (await response.json()) as SessionPayload;
      if (!response.ok) {
        setError(payload.message ?? "Unable to load user sessions.");
        return;
      }

      setSessionMap((current) => ({
        ...current,
        [userId]: Array.isArray(payload.sessions) ? payload.sessions : [],
      }));
    } catch (sessionError) {
      setError(getErrorMessage(sessionError, "Unable to load user sessions."));
    }
  }

  function handleToggleSessions(userId: string) {
    if (expandedUserId === userId) {
      setExpandedUserId(null);
      return;
    }

    setExpandedUserId(userId);
    void loadUserSessions(userId);
  }

  function handleRevokeAllSessions(user: AdminUser) {
    setPendingAction(`revoke-all:${user.id}`);
    setError(null);

    startMutating(async () => {
      try {
        const response = await fetch(
          `/api/internal/admin/users/${encodeURIComponent(user.id)}/sessions/revoke`,
          { method: "POST" },
        );
        const payload = (await response.json()) as { message?: string };

        if (!response.ok) {
          setError(payload.message ?? "Unable to revoke all sessions.");
          setPendingAction(null);
          return;
        }

        toast.success("All user sessions revoked.");
        await loadUserSessions(user.id);
      } catch (mutationError) {
        setError(getErrorMessage(mutationError, "Unable to revoke all sessions."));
      } finally {
        setPendingAction(null);
      }
    });
  }

  function handleRevokeOneSession(userId: string, sessionId: string) {
    setPendingAction(`revoke-one:${userId}:${sessionId}`);
    setError(null);

    startMutating(async () => {
      try {
        const response = await fetch(
          `/api/internal/admin/users/${encodeURIComponent(userId)}/sessions/${encodeURIComponent(sessionId)}/revoke`,
          { method: "POST" },
        );
        const payload = (await response.json()) as { message?: string };

        if (!response.ok) {
          setError(payload.message ?? "Unable to revoke session.");
          setPendingAction(null);
          return;
        }

        toast.success("User session revoked.");
        await loadUserSessions(userId);
      } catch (mutationError) {
        setError(getErrorMessage(mutationError, "Unable to revoke session."));
      } finally {
        setPendingAction(null);
      }
    });
  }

  function openSetRoleDialog(user: AdminUser) {
    setRoleDialogUser(user);
    setRoleInput("member");
    setRoleValidationError(null);
  }

  function submitSetRole() {
    if (!roleDialogUser) {
      return;
    }

    const role = roleInput.trim();
    if (!role) {
      setRoleValidationError("Role is required.");
      return;
    }

    setRoleValidationError(null);

    setPendingAction(`role:${roleDialogUser.id}`);
    setError(null);

    startMutating(async () => {
      try {
        const response = await fetch(
          `/api/internal/admin/users/${encodeURIComponent(roleDialogUser.id)}/role`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ role }),
          },
        );
        const payload = (await response.json()) as { message?: string };

        if (!response.ok) {
          setError(payload.message ?? "Unable to set role.");
          setPendingAction(null);
          return;
        }

        toast.success("User role updated.");
        setRoleDialogUser(null);
        setRoleInput("member");
      } catch (mutationError) {
        setError(getErrorMessage(mutationError, "Unable to set role."));
      } finally {
        setPendingAction(null);
      }
    });
  }

  function openSetPasswordDialog(user: AdminUser) {
    setPasswordDialogUser(user);
    setPasswordInput("");
    setPasswordValidationError(null);
  }

  function submitSetPassword() {
    if (!passwordDialogUser) {
      return;
    }

    const newPassword = passwordInput.trim();
    if (!newPassword) {
      setPasswordValidationError("Temporary password is required.");
      return;
    }

    if (newPassword.length < 8) {
      setPasswordValidationError("Temporary password must be at least 8 characters.");
      return;
    }

    setPasswordValidationError(null);

    setPendingAction(`password:${passwordDialogUser.id}`);
    setError(null);

    startMutating(async () => {
      try {
        const response = await fetch(
          `/api/internal/admin/users/${encodeURIComponent(passwordDialogUser.id)}/password`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ newPassword }),
          },
        );
        const payload = (await response.json()) as { message?: string };

        if (!response.ok) {
          setError(payload.message ?? "Unable to set password.");
          setPendingAction(null);
          return;
        }

        toast.success("User password updated.");
        setPasswordDialogUser(null);
        setPasswordInput("");
      } catch (mutationError) {
        setError(getErrorMessage(mutationError, "Unable to set password."));
      } finally {
        setPendingAction(null);
      }
    });
  }

  function handleImpersonate(user: AdminUser) {
    setPendingAction(`impersonate:${user.id}`);
    setError(null);

    startMutating(async () => {
      try {
        const response = await fetch(
          `/api/internal/admin/users/${encodeURIComponent(user.id)}/impersonate`,
          { method: "POST" },
        );
        const payload = (await response.json()) as { message?: string };

        if (!response.ok) {
          setError(payload.message ?? "Unable to impersonate user.");
          setPendingAction(null);
          return;
        }

        toast.success("Impersonation started.");
      } catch (mutationError) {
        setError(getErrorMessage(mutationError, "Unable to impersonate user."));
      } finally {
        setPendingAction(null);
      }
    });
  }

  function handleStopImpersonation() {
    setPendingAction("impersonation:stop");
    setError(null);

    startMutating(async () => {
      try {
        const response = await fetch("/api/internal/admin/impersonation", { method: "DELETE" });
        const payload = (await response.json()) as { message?: string };

        if (!response.ok) {
          setError(payload.message ?? "Unable to stop impersonation.");
          setPendingAction(null);
          return;
        }

        toast.success("Impersonation stopped.");
      } catch (mutationError) {
        setError(getErrorMessage(mutationError, "Unable to stop impersonation."));
      } finally {
        setPendingAction(null);
      }
    });
  }

  function openRemoveUserDialog(user: AdminUser) {
    setRemoveDialogUser(user);
  }

  function submitRemoveUser() {
    if (!removeDialogUser) {
      return;
    }

    setPendingAction(`remove:${removeDialogUser.id}`);
    setError(null);

    startMutating(async () => {
      try {
        const response = await fetch(
          `/api/internal/admin/users/${encodeURIComponent(removeDialogUser.id)}`,
          {
            method: "DELETE",
          },
        );
        const payload = (await response.json()) as { message?: string };

        if (!response.ok) {
          setError(payload.message ?? "Unable to remove user.");
          setPendingAction(null);
          return;
        }

        toast.success("User removed.");
        setRemoveDialogUser(null);
        await loadUsers({ preserveLoading: true });
      } catch (mutationError) {
        setError(getErrorMessage(mutationError, "Unable to remove user."));
      } finally {
        setPendingAction(null);
      }
    });
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Users className="h-4 w-4" />
            All users
          </CardTitle>
          <CardDescription className="text-xs">
            Manage Neon Auth users. You can search, paginate, and toggle ban state.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search by email or name"
              className="min-w-[220px] flex-1"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setOffset(0);
                setSearch(searchInput.trim());
              }}
              disabled={isLoading || isMutating}
            >
              Search
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleStopImpersonation}
              disabled={isMutating}
            >
              {pendingAction === "impersonation:stop" ? (
                <span className="inline-flex items-center gap-2">
                  <Spinner className="size-4" />
                  Stopping impersonation...
                </span>
              ) : (
                <span className="inline-flex items-center gap-2">
                  <ShieldX className="size-4" />
                  Stop impersonation
                </span>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleRefresh}
              disabled={isLoading || isRefreshing || isMutating}
            >
              {isRefreshing ? (
                <span className="inline-flex items-center gap-2">
                  <Spinner className="size-4" />
                  Refreshing...
                </span>
              ) : (
                <span className="inline-flex items-center gap-2">
                  <RefreshCcw className="size-4" />
                  Refresh
                </span>
              )}
            </Button>
          </div>

          {error ? (
            <Alert variant="destructive">
              <AlertTitle>Unable to load users</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          {isLoading ? (
            <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <Spinner className="size-4" />
              Loading users...
            </p>
          ) : null}

          {!isLoading && visibleUsers.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/70 px-4 py-6 text-sm text-muted-foreground">
              No users found for this query.
            </div>
          ) : null}

          {!isLoading
            ? visibleUsers.map((user) => {
                const isPending = pendingUserId === user.id;
                const isBanned = Boolean(user.banned);

                return (
                  <div
                    key={user.id}
                    className="space-y-2 rounded-xl border border-border/70 px-3 py-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-foreground">{user.name ?? "Unnamed user"}</p>
                        <p className="text-xs text-muted-foreground">{user.email ?? "No email"}</p>
                      </div>
                      <Badge variant={isBanned ? "destructive" : "secondary"}>
                        {isBanned ? "Banned" : "Active"}
                      </Badge>
                    </div>

                    <div className="space-y-1 text-xs text-muted-foreground">
                      <p>User ID: {user.id}</p>
                      <p>Created: {formatDate(user.createdAt)}</p>
                      {isBanned && user.banReason ? <p>Reason: {user.banReason}</p> : null}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {isBanned ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => handleBanToggle(user, "unban")}
                          disabled={isMutating}
                        >
                          {isPending ? (
                            <span className="inline-flex items-center gap-2">
                              <Spinner className="size-4" />
                              Updating...
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-2">
                              <ShieldCheck className="size-4" />
                              Unban user
                            </span>
                          )}
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          onClick={() => handleBanToggle(user, "ban")}
                          disabled={isMutating}
                        >
                          {isPending ? (
                            <span className="inline-flex items-center gap-2">
                              <Spinner className="size-4" />
                              Updating...
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-2">
                              <Ban className="size-4" />
                              Ban user
                            </span>
                          )}
                        </Button>
                      )}

                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => handleToggleSessions(user.id)}
                        disabled={isMutating}
                      >
                        {expandedUserId === user.id ? "Hide sessions" : "View sessions"}
                      </Button>

                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => handleRevokeAllSessions(user)}
                        disabled={isMutating}
                      >
                        {pendingAction === `revoke-all:${user.id}` ? (
                          <span className="inline-flex items-center gap-2">
                            <Spinner className="size-4" />
                            Revoking...
                          </span>
                        ) : (
                          "Revoke all sessions"
                        )}
                      </Button>

                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => openSetRoleDialog(user)}
                        disabled={isMutating}
                      >
                        <span className="inline-flex items-center gap-2">
                          <UserCog className="size-4" />
                          Set role
                        </span>
                      </Button>

                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => openSetPasswordDialog(user)}
                        disabled={isMutating}
                      >
                        <span className="inline-flex items-center gap-2">
                          <KeyRound className="size-4" />
                          Set password
                        </span>
                      </Button>

                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => handleImpersonate(user)}
                        disabled={isMutating}
                      >
                        {pendingAction === `impersonate:${user.id}` ? (
                          <span className="inline-flex items-center gap-2">
                            <Spinner className="size-4" />
                            Starting...
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-2">
                            <UserRoundCheck className="size-4" />
                            Impersonate
                          </span>
                        )}
                      </Button>

                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        onClick={() => openRemoveUserDialog(user)}
                        disabled={isMutating}
                      >
                        {pendingAction === `remove:${user.id}` ? (
                          <span className="inline-flex items-center gap-2">
                            <Spinner className="size-4" />
                            Removing...
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-2">
                            <Trash2 className="size-4" />
                            Remove
                          </span>
                        )}
                      </Button>
                    </div>

                    {expandedUserId === user.id ? (
                      <div className="space-y-2 rounded-lg border border-border/60 bg-background/60 p-2">
                        {(sessionMap[user.id] ?? []).length === 0 ? (
                          <p className="text-xs text-muted-foreground">No sessions returned for this user.</p>
                        ) : (
                          (sessionMap[user.id] ?? []).map((sessionItem) => {
                            const revokeKey = `revoke-one:${user.id}:${sessionItem.id}`;

                            return (
                              <div
                                key={sessionItem.id}
                                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/70 px-2 py-2"
                              >
                                <div className="space-y-0.5 text-xs text-muted-foreground">
                                  <p>Session: {sessionItem.id}</p>
                                  <p>IP: {sessionItem.ipAddress ?? "Unknown"}</p>
                                  <p>User agent: {sessionItem.userAgent ?? "Unknown"}</p>
                                </div>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleRevokeOneSession(user.id, sessionItem.id)}
                                  disabled={isMutating}
                                >
                                  {pendingAction === revokeKey ? (
                                    <span className="inline-flex items-center gap-2">
                                      <Spinner className="size-4" />
                                      Revoking...
                                    </span>
                                  ) : (
                                    "Revoke"
                                  )}
                                </Button>
                              </div>
                            );
                          })
                        )}
                      </div>
                    ) : null}
                  </div>
                );
              })
            : null}

          <div className="flex items-center justify-between gap-2 border-t border-border/60 pt-3">
            <p className="text-xs text-muted-foreground">
              Page {pageNumber} · Showing {visibleUsers.length} of {total}
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!hasPrev || isLoading || isMutating}
                onClick={() => setOffset((value) => Math.max(0, value - limit))}
              >
                Previous
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!hasNext || isLoading || isMutating}
                onClick={() => setOffset((value) => value + limit)}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={Boolean(roleDialogUser)}
        onOpenChange={(open) => {
          if (!open) {
            setRoleDialogUser(null);
            setRoleValidationError(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Set user role</DialogTitle>
            <DialogDescription>
              Update role for {roleDialogUser?.email ?? roleDialogUser?.id ?? "selected user"}.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              submitSetRole();
            }}
            className="space-y-3"
          >
            <div className="space-y-1">
              <Label htmlFor="admin-role-input">Role</Label>
              <Input
                id="admin-role-input"
                value={roleInput}
                onChange={(event) => setRoleInput(event.target.value)}
                placeholder="member"
                autoComplete="off"
              />
              {roleValidationError ? (
                <p className="text-xs text-destructive">{roleValidationError}</p>
              ) : null}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setRoleDialogUser(null)}
                disabled={isMutating}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isMutating || !roleDialogUser}
              >
                {pendingAction === `role:${roleDialogUser?.id}` ? (
                  <span className="inline-flex items-center gap-2">
                    <Spinner className="size-4" />
                    Saving...
                  </span>
                ) : (
                  "Save role"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(passwordDialogUser)}
        onOpenChange={(open) => {
          if (!open) {
            setPasswordDialogUser(null);
            setPasswordValidationError(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Set temporary password</DialogTitle>
            <DialogDescription>
              Set a temporary password for {passwordDialogUser?.email ?? passwordDialogUser?.id ?? "selected user"}.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              submitSetPassword();
            }}
            className="space-y-3"
          >
            <div className="space-y-1">
              <Label htmlFor="admin-password-input">Temporary password</Label>
              <Input
                id="admin-password-input"
                type="password"
                value={passwordInput}
                onChange={(event) => setPasswordInput(event.target.value)}
                placeholder="Minimum 8 characters"
                autoComplete="new-password"
              />
              {passwordValidationError ? (
                <p className="text-xs text-destructive">{passwordValidationError}</p>
              ) : null}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setPasswordDialogUser(null)}
                disabled={isMutating}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isMutating || !passwordDialogUser}
              >
                {pendingAction === `password:${passwordDialogUser?.id}` ? (
                  <span className="inline-flex items-center gap-2">
                    <Spinner className="size-4" />
                    Saving...
                  </span>
                ) : (
                  "Save password"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(removeDialogUser)}
        onOpenChange={(open) => {
          if (!open) {
            setRemoveDialogUser(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove user</AlertDialogTitle>
            <AlertDialogDescription>
              Remove {removeDialogUser?.email ?? removeDialogUser?.id ?? "this user"}? This action cannot be easily undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isMutating}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isMutating || !removeDialogUser}
              onClick={(event) => {
                event.preventDefault();
                submitRemoveUser();
              }}
            >
              {pendingAction === `remove:${removeDialogUser?.id}` ? (
                <span className="inline-flex items-center gap-2">
                  <Spinner className="size-4" />
                  Removing...
                </span>
              ) : (
                "Remove user"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

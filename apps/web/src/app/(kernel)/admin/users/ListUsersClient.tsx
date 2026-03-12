"use client";

import { useState } from "react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
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
  Textarea,
} from "@afenda/ui";
import { listUsersAction, banUserAction, setRoleAction, type ListUserItem } from "@/app/auth/_actions/list-users";
import { Users, Ban, Shield } from "lucide-react";

function formatDate(value: Date | string | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleString();
}

type ListUsersClientProps = {
  /** Current user id — Ban button hidden for this user. */
  currentUserId?: string | null;
};

/**
 * List users (Neon Auth auth.admin.listUsers) — Admin > Users.
 */
export function ListUsersClient({ currentUserId }: ListUsersClientProps = {}) {
  const [users, setUsers] = useState<ListUserItem[] | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [limit, setLimit] = useState(100);
  const [offset, setOffset] = useState(0);

  const [banTarget, setBanTarget] = useState<ListUserItem | null>(null);
  const [banReason, setBanReason] = useState("");
  const [banStatus, setBanStatus] = useState<"idle" | "loading" | "error">("idle");
  const [banError, setBanError] = useState<string | null>(null);

  const [roleTarget, setRoleTarget] = useState<ListUserItem | null>(null);
  const [roleValue, setRoleValue] = useState("");
  const [roleStatus, setRoleStatus] = useState<"idle" | "loading" | "error">("idle");
  const [roleError, setRoleError] = useState<string | null>(null);

  async function handleLoad() {
    setStatus("loading");
    setError(null);
    const result = await listUsersAction({ limit, offset });
    if (result.ok) {
      setUsers(result.users);
      setStatus("idle");
    } else {
      setError(result.error);
      setUsers(null);
      setStatus("error");
    }
  }

  function openBanDialog(user: ListUserItem) {
    setBanTarget(user);
    setBanReason("");
    setBanError(null);
    setBanStatus("idle");
  }

  function closeBanDialog() {
    setBanTarget(null);
    setBanReason("");
    setBanError(null);
    setBanStatus("idle");
  }

  async function handleBanSubmit() {
    if (!banTarget?.id || !banReason.trim()) return;
    setBanStatus("loading");
    setBanError(null);
    const result = await banUserAction(banTarget.id, banReason.trim());
    setBanStatus("idle");
    if (result.ok) {
      closeBanDialog();
      setUsers((prev) => (prev ?? []).filter((u) => u.id !== banTarget.id));
    } else {
      setBanError(result.error);
    }
  }

  function openSetRoleDialog(user: ListUserItem) {
    setRoleTarget(user);
    setRoleValue("");
    setRoleError(null);
    setRoleStatus("idle");
  }

  function closeSetRoleDialog() {
    setRoleTarget(null);
    setRoleValue("");
    setRoleError(null);
    setRoleStatus("idle");
  }

  async function handleSetRoleSubmit() {
    if (!roleTarget?.id || !roleValue.trim()) return;
    setRoleStatus("loading");
    setRoleError(null);
    const result = await setRoleAction(roleTarget.id, roleValue.trim());
    setRoleStatus("idle");
    if (result.ok) {
      closeSetRoleDialog();
    } else {
      setRoleError(result.error);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Users className="h-4 w-4" />
            All users
          </CardTitle>
          <CardDescription className="text-xs">
            List users (admin only). Optional limit and offset for pagination.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-4">
            <div className="space-y-2">
              <Label htmlFor="list-users-limit">Limit</Label>
              <Input
                id="list-users-limit"
                type="number"
                min={1}
                max={500}
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value) || 100)}
                disabled={status === "loading"}
                className="w-24"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="list-users-offset">Offset</Label>
              <Input
                id="list-users-offset"
                type="number"
                min={0}
                value={offset}
                onChange={(e) => setOffset(Math.max(0, Number(e.target.value) || 0))}
                disabled={status === "loading"}
                className="w-24"
              />
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleLoad}
            disabled={status === "loading"}
          >
            {status === "loading" ? "Loading…" : "Load users"}
          </Button>
          {users !== null && (
            <div className="rounded-md border bg-muted/30 overflow-hidden">
              {users.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">No users found.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="px-4 py-2 text-left font-medium text-muted-foreground">Email</th>
                        <th className="px-4 py-2 text-left font-medium text-muted-foreground">Name</th>
                        <th className="px-4 py-2 text-left font-medium text-muted-foreground">Created</th>
                        <th className="px-4 py-2 text-right font-medium text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u, i) => {
                        const isCurrentUser = currentUserId != null && u.id === currentUserId;
                        return (
                          <tr key={u.id ?? i} className="border-b last:border-b-0">
                            <td className="px-4 py-2 text-foreground">{u.email ?? "—"}</td>
                            <td className="px-4 py-2 text-muted-foreground">{u.name ?? "—"}</td>
                            <td className="px-4 py-2 text-muted-foreground">{formatDate(u.createdAt)}</td>
                            <td className="px-4 py-2 text-right">
                              {u.id && (
                                <span className="flex items-center justify-end gap-1">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-7"
                                    onClick={() => openSetRoleDialog(u)}
                                  >
                                    <Shield className="h-3.5 w-3.5 mr-1" />
                                    Set role
                                  </Button>
                                  {!isCurrentUser && (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 text-destructive hover:text-destructive"
                                      onClick={() => openBanDialog(u)}
                                    >
                                      <Ban className="h-3.5 w-3.5 mr-1" />
                                      Ban
                                    </Button>
                                  )}
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
          {roleTarget && (
            <Dialog open={!!roleTarget} onOpenChange={(open) => !open && closeSetRoleDialog()}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Set role</DialogTitle>
                  <DialogDescription>
                    Set role for {roleTarget.email ?? roleTarget.name ?? roleTarget.id}. Example: admin, member.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-2 py-2">
                  <Label htmlFor="set-role-value">Role</Label>
                  <Input
                    id="set-role-value"
                    value={roleValue}
                    onChange={(e) => setRoleValue(e.target.value)}
                    placeholder="e.g. admin, member"
                    maxLength={64}
                    disabled={roleStatus === "loading"}
                  />
                  {roleError && <p className="text-sm text-destructive">{roleError}</p>}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={closeSetRoleDialog} disabled={roleStatus === "loading"}>
                    Cancel
                  </Button>
                  <Button
                    disabled={!roleValue.trim() || roleStatus === "loading"}
                    onClick={handleSetRoleSubmit}
                  >
                    {roleStatus === "loading" ? "Setting…" : "Set role"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
          {banTarget && (
            <AlertDialog open={!!banTarget} onOpenChange={(open) => !open && closeBanDialog()}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Ban user</AlertDialogTitle>
                  <AlertDialogDescription>
                    Ban {banTarget.email ?? banTarget.name ?? banTarget.id}. This action restricts the user&apos;s access. Provide a reason (required).
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="space-y-2 py-2">
                  <Label htmlFor="ban-reason">Reason</Label>
                  <Textarea
                    id="ban-reason"
                    value={banReason}
                    onChange={(e) => setBanReason(e.target.value)}
                    placeholder="e.g. Violation of terms"
                    maxLength={500}
                    rows={3}
                    disabled={banStatus === "loading"}
                  />
                  {banError && <p className="text-sm text-destructive">{banError}</p>}
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={banStatus === "loading"}>Cancel</AlertDialogCancel>
                  <Button
                    variant="destructive"
                    disabled={!banReason.trim() || banStatus === "loading"}
                    onClick={handleBanSubmit}
                  >
                    {banStatus === "loading" ? "Banning…" : "Ban user"}
                  </Button>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

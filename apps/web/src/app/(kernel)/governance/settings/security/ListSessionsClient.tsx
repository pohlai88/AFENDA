"use client";

import { useState } from "react";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@afenda/ui";
import { listSessionsAction, revokeOtherSessionsAction, revokeSessionAction, type ListSessionItem } from "@/app/auth/_actions/list-sessions";
import { Monitor } from "lucide-react";

function formatExpiresAt(expiresAt: Date | string | undefined): string {
  if (!expiresAt) return "—";
  const d = typeof expiresAt === "string" ? new Date(expiresAt) : expiresAt;
  return d.toLocaleString();
}

/**
 * List active sessions (Neon Auth auth.listSessions) — Security settings.
 */
export function ListSessionsClient() {
  const [sessions, setSessions] = useState<ListSessionItem[] | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [revokingOther, setRevokingOther] = useState(false);

  async function handleLoad() {
    setStatus("loading");
    setError(null);
    const result = await listSessionsAction();
    if (result.ok) {
      setSessions(result.sessions);
      setStatus("idle");
    } else {
      setError(result.error);
      setSessions(null);
      setStatus("error");
    }
  }

  async function handleRevoke(session: ListSessionItem) {
    const tokenOrId = session.token ?? session.id;
    if (!tokenOrId) return;
    setRevokingId(String(session.id ?? tokenOrId));
    setError(null);
    const result = await revokeSessionAction(tokenOrId);
    setRevokingId(null);
    if (result.ok) {
      setSessions((prev) => (prev ?? []).filter((s) => (s.token ?? s.id) !== tokenOrId));
    } else {
      setError(result.error);
    }
  }

  async function handleRevokeOther() {
    setRevokingOther(true);
    setError(null);
    const result = await revokeOtherSessionsAction();
    setRevokingOther(false);
    if (result.ok) {
      setSessions([]);
    } else {
      setError(result.error);
    }
  }

  return (
    <section>
      <h2 className="mb-0.5 text-sm font-semibold text-foreground">
        Active sessions
      </h2>
      <p className="mb-4 text-xs text-muted-foreground">
        View all devices or browsers where you are currently signed in.
      </p>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Monitor className="h-4 w-4" />
            Your sessions
          </CardTitle>
          <CardDescription className="text-xs">
            Load the list of active sessions for your account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleLoad}
              disabled={status === "loading"}
            >
              {status === "loading" ? "Loading…" : "Load sessions"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={handleRevokeOther}
              disabled={revokingOther}
            >
              {revokingOther ? "Revoking…" : "Revoke all other sessions"}
            </Button>
          </div>
          {sessions !== null && (
            <div className="rounded-md border bg-muted/30 p-3 text-xs">
              {sessions.length === 0 ? (
                <p className="text-muted-foreground">No sessions found.</p>
              ) : (
                <ul className="space-y-2">
                  {sessions.map((s, i) => {
                    const tokenOrId = s.token ?? s.id;
                    const key = s.id ?? tokenOrId ?? i;
                    return (
                      <li key={key} className="flex flex-wrap items-center gap-x-4 gap-y-1">
                        <span className="font-mono text-muted-foreground">
                          {s.id ? `${String(s.id).slice(0, 8)}…` : `Session ${i + 1}`}
                        </span>
                        <span>Expires: {formatExpiresAt(s.expiresAt)}</span>
                        {tokenOrId && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 text-destructive hover:text-destructive"
                            onClick={() => handleRevoke(s)}
                            disabled={revokingId === String(key)}
                          >
                            {revokingId === String(key) ? "Revoking…" : "Revoke"}
                          </Button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

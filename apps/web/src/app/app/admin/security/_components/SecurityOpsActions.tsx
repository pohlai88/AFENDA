"use client";

import { useState } from "react";
import { Button } from "@afenda/ui";
import { Loader2 } from "lucide-react";
import Link from "next/link";

async function postAction(
  url: string,
  body?: Record<string, unknown>
): Promise<{ ok: boolean; message?: string; purged?: number; deleted?: number }> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error((data.message as string) ?? `Request failed: ${res.status}`);
  }
  return data as { ok: boolean; message?: string; purged?: number; deleted?: number };
}

export function PurgeChallengesButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function handlePurge() {
    setLoading(true);
    setResult(null);
    try {
      const data = await postAction("/api/internal/security/purge-challenges");
      setResult(
        data.purged !== undefined
          ? `Purged ${data.purged} expired challenges.`
          : "Done."
      );
    } catch (e) {
      setResult(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handlePurge}
        disabled={loading}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          "Purge Expired Challenges"
        )}
      </Button>
      {result && (
        <span className="text-sm text-muted-foreground">{result}</span>
      )}
    </div>
  );
}

export function ArchiveAuditButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function handleArchive() {
    setLoading(true);
    setResult(null);
    try {
      const data = await postAction("/api/internal/security/archive-auth-audit");
      setResult(
        data.deleted !== undefined
          ? `Archived ${data.deleted} old audit events.`
          : "Done."
      );
    } catch (e) {
      setResult(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleArchive}
        disabled={loading}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          "Archive Old Audit (90d)"
        )}
      </Button>
      {result && (
        <span className="text-sm text-muted-foreground">{result}</span>
      )}
    </div>
  );
}

export function SecurityOpsNav() {
  return (
    <div className="flex flex-wrap gap-2">
      <Link href="/app/admin/security/challenges">
        <Button variant="outline" size="sm">
          Challenges
        </Button>
      </Link>
      <Link href="/app/admin/security/audit-events">
        <Button variant="outline" size="sm">
          Audit Events
        </Button>
      </Link>
      <Link href="/app/admin/security/risk">
        <Button variant="outline" size="sm">
          Risk Findings
        </Button>
      </Link>
      <Link href="/app/admin/security/incidents">
        <Button variant="outline" size="sm">
          Incidents
        </Button>
      </Link>
      <Link href="/app/admin/security/compliance">
        <Button variant="outline" size="sm">
          Compliance
        </Button>
      </Link>
    </div>
  );
}

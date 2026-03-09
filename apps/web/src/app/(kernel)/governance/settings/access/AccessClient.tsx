"use client";

import type { OrgMember } from "@afenda/contracts";

// ── Types ──────────────────────────────────────────────────────────────────────

type Props = {
  members: OrgMember[];
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
}

function roleLabel(role: string): string {
  const labels: Record<string, string> = {
    admin: "Admin",
    member: "Member",
    approver: "Approver",
    operator: "Operator",
    viewer: "Viewer",
  };
  return labels[role] ?? role;
}

// ── Badge ──────────────────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: string }) {
  const isAdmin = role === "admin";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
        isAdmin
          ? "bg-primary/10 text-primary"
          : "bg-muted text-muted-foreground"
      }`}
    >
      {roleLabel(role)}
    </span>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function AccessClient({ members }: Props) {
  return (
    <div className="px-8 py-6">
      {/* ── Members table ───────────────────────────────────────────────────── */}
      {members.length === 0 ? (
        <div className="rounded border border-border py-12 text-center text-sm text-muted-foreground">
          No members found for this organisation.
        </div>
      ) : (
        <div className="overflow-x-auto rounded border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Email</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Role</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Joined</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr
                  key={member.principalId}
                  className="border-b border-border last:border-b-0 hover:bg-muted/20"
                >
                  <td className="px-4 py-3 text-foreground">
                    {member.email ?? <span className="text-muted-foreground italic">—</span>}
                  </td>
                  <td className="px-4 py-3 text-foreground">
                    {member.name ?? <span className="text-muted-foreground italic">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <RoleBadge role={member.role} />
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatDate(member.joinedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Invite placeholder ──────────────────────────────────────────────── */}
      <div className="mt-6 flex items-center gap-3">
        <button
          type="button"
          disabled
          title="Invitation flow coming soon"
          className="rounded border border-border px-3 py-1.5 text-sm text-muted-foreground opacity-50 cursor-not-allowed"
        >
          Invite Member
        </button>
        <p className="text-xs text-muted-foreground">Invitation flow coming soon.</p>
      </div>
    </div>
  );
}

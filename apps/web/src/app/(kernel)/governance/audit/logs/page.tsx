import { fetchAuditLogs } from "@/lib/api-client";
import { AuditLogsClient } from "./AuditLogsClient";

export const dynamic = "force-dynamic";

/** Audit logs — compliance trail with cursor pagination. */
export default async function AuditLogsPage() {
  const { data, cursor, hasMore } = await fetchAuditLogs({ limit: 20 });

  return (
    <div>
      <div className="border-b px-8 py-5">
        <h1 className="text-base font-semibold text-foreground">Audit Logs</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Compliance trail of actions and events.
        </p>
      </div>
      <AuditLogsClient
        initialData={data}
        initialCursor={cursor}
        initialHasMore={hasMore}
      />
    </div>
  );
}

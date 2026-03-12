"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@afenda/ui";

/**
 * Intercompany Transfer Board Component
 * Displays pending and settled intercompany transfers with status indicators
 */
export function IntercompanyTransferBoard({
  transfers,
}: {
  transfers: Array<{
    id: string;
    transferNumber: string;
    fromLegalEntityId: string;
    toLegalEntityId: string;
    transferAmountMinor: string;
    currencyCode: string;
    status: string;
    requestedExecutionDate: string;
  }>;
}) {
  const statusColors: Record<string, string> = {
    draft: "bg-muted text-muted-foreground",
    pending_approval: "bg-secondary text-secondary-foreground",
    approved: "bg-primary/10 text-primary",
    rejected: "bg-destructive/10 text-destructive",
    pending_settlement: "bg-accent text-accent-foreground",
    settled: "bg-primary/10 text-primary",
    failed: "bg-destructive/10 text-destructive",
    cancelled: "bg-muted text-muted-foreground",
  };

  return (
    <div className="space-y-4">
      {transfers.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">No intercompany transfers found.</p>
          </CardContent>
        </Card>
      ) : (
        transfers.map((transfer) => (
          <Card key={transfer.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{transfer.transferNumber}</CardTitle>
                <span
                  className={`px-2 py-1 rounded text-sm font-medium ${statusColors[transfer.status]}`}
                >
                  {transfer.status.replace(/_/g, " ")}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">From Entity</p>
                  <p className="font-medium">{transfer.fromLegalEntityId}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">To Entity</p>
                  <p className="font-medium">{transfer.toLegalEntityId}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Amount</p>
                  <p className="font-medium">
                    {(BigInt(transfer.transferAmountMinor) / BigInt(100)).toString()}{" "}
                    {transfer.currencyCode}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Execution Date</p>
                  <p className="font-medium">{transfer.requestedExecutionDate}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}

/**
 * Transfer List Skeleton
 */
export function IntercompanyTransferBoardSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <Card key={i}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="h-5 w-24 rounded bg-muted animate-pulse" />
              <div className="h-6 w-20 rounded bg-muted animate-pulse" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="h-4 w-32 rounded bg-muted animate-pulse" />
              <div className="h-4 w-40 rounded bg-muted animate-pulse" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

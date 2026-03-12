"use server";

import Link from "next/link";
import { Suspense } from "react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@afenda/ui";
import { minorToMajorDecimalString } from "@afenda/ui";
import {
  fetchTreasuryBankStatement,
  fetchTreasuryBankStatementLines,
  type TreasuryBankStatementRow,
  type TreasuryBankStatementLineRow,
} from "@/lib/api-client";

interface PageProps {
  params: {
    id: string;
  };
}

const statusBadgeColor: Record<string, string> = {
  pending: "bg-warning/10 text-warning",
  processing: "bg-primary/10 text-primary",
  processed: "bg-success/10 text-success",
  failed: "bg-destructive/10 text-destructive",
};

const lineStatusBadgeColor: Record<string, string> = {
  unmatched: "bg-muted text-muted-foreground",
  matched: "bg-success/10 text-success",
  excluded: "bg-warning/10 text-warning",
};

export async function generateMetadata({ params }: PageProps) {
  return {
    title: `Bank Statement ${params.id} — AFENDA`,
    description: "Bank statement detail view with transaction lines",
  };
}

async function BankStatementContent({ id }: { id: string }) {
  let statement: TreasuryBankStatementRow | null = null;
  let lines: TreasuryBankStatementLineRow[] = [];
  let error = null;

  try {
    const statementResult = await fetchTreasuryBankStatement(id);
    statement = statementResult.data;

    const linesResult = await fetchTreasuryBankStatementLines(id, {
      limit: 1000,
    });
    lines = linesResult.data;
  } catch (err) {
    error =
      err instanceof Error ? err.message : "Failed to load bank statement";
  }

  if (error || !statement) {
    return (
      <div className="space-y-6 px-6 py-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight">
            Bank Statement
          </h1>
          <Button asChild variant="ghost">
            <Link href="/finance/treasury/bank-statements">
              Back to Statements
            </Link>
          </Button>
        </div>

        <Card className="border-destructive bg-destructive/5">
          <CardContent className="pt-6">
            <p className="text-destructive">
              {error || "Bank statement not found"}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 px-6 py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">
          Bank Statement — {statement.sourceRef}
        </h1>
        <Button asChild variant="ghost">
          <Link href="/finance/treasury/bank-statements">
            Back to Statements
          </Link>
        </Button>
      </div>

      {/* Statement Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-lg">Statement Details</CardTitle>
              <CardDescription>
                {new Date(statement.statementDate).toLocaleDateString(
                  "en-US",
                  {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  },
                )}
              </CardDescription>
            </div>
            <Badge
              variant="secondary"
              className={statusBadgeColor[statement.status] || ""}
            >
              {statement.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Source Reference
              </p>
              <p className="mt-1 font-mono text-sm">{statement.sourceRef}</p>
            </div>

            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Currency
              </p>
              <p className="mt-1 text-sm">{statement.currencyCode}</p>
            </div>

            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Opening Balance
              </p>
              <p className="mt-1 text-sm font-mono">
                {statement.currencyCode}{" "}
                {minorToMajorDecimalString(
                  BigInt(statement.openingBalance),
                  statement.currencyCode,
                )}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Closing Balance
              </p>
              <p className="mt-1 text-sm font-mono font-bold">
                {statement.currencyCode}{" "}
                {minorToMajorDecimalString(
                  BigInt(statement.closingBalance),
                  statement.currencyCode,
                )}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Transaction Lines
              </p>
              <p className="mt-1 text-sm">{statement.lineCount}</p>
            </div>

            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Created
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {new Date(statement.createdAt).toLocaleString()}
              </p>
            </div>
          </div>

          {statement.failureReason && (
            <div className="rounded border border-destructive bg-destructive/5 p-3">
              <p className="text-xs font-medium text-destructive">
                Failure Reason
              </p>
              <p className="mt-1 text-sm text-destructive">
                {statement.failureReason}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transaction Lines */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Transaction Lines</CardTitle>
          <CardDescription>
            {lines.length} line{lines.length !== 1 ? "s" : ""} in this statement
          </CardDescription>
        </CardHeader>
        <CardContent>
          {lines.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No transaction lines found.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">#</TableHead>
                    <TableHead className="text-xs">Transaction Date</TableHead>
                    <TableHead className="text-xs">Value Date</TableHead>
                    <TableHead className="text-xs">Description</TableHead>
                    <TableHead className="text-xs">Reference</TableHead>
                    <TableHead className="text-xs text-right">Amount</TableHead>
                    <TableHead className="text-xs">Direction</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.map((line) => (
                    <TableRow key={line.id}>
                      <TableCell className="text-xs font-mono">
                        {line.lineNumber}
                      </TableCell>
                      <TableCell className="text-xs">
                        {new Date(line.transactionDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-xs">
                        {line.valueDate
                          ? new Date(line.valueDate).toLocaleDateString()
                          : "-"}
                      </TableCell>
                      <TableCell className="text-xs">
                        {line.description}
                      </TableCell>
                      <TableCell className="text-xs font-mono">
                        {line.reference || "—"}
                      </TableCell>
                      <TableCell className="text-xs text-right font-mono">
                        <span
                          className={
                            line.direction === "inflow"
                              ? "text-success"
                              : "text-destructive"
                          }
                        >
                          {line.direction === "inflow" ? "+" : "−"}
                          {minorToMajorDecimalString(
                            BigInt(line.amount),
                            statement.currencyCode,
                          )}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs">
                        <span
                          className={
                            line.direction === "inflow"
                              ? "text-success"
                              : "text-destructive"
                          }
                        >
                          {line.direction === "inflow"
                            ? "Inflow"
                            : "Outflow"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={
                            lineStatusBadgeColor[line.status] || ""
                          }
                        >
                          {line.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function BankStatementDetailPage({ params }: PageProps) {
  return (
    <Suspense fallback={<BankStatementLoadingSkeleton />}>
      <BankStatementContent id={params.id} />
    </Suspense>
  );
}

// Loading skeleton
function BankStatementLoadingSkeleton() {
  return (
    <div className="space-y-6 px-6 py-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-8 w-48 bg-muted rounded" />
        <div className="h-10 w-32 bg-muted rounded" />
      </div>

      {/* Statement Header Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="h-5 w-32 bg-muted rounded mb-2" />
              <div className="h-4 w-48 bg-muted rounded" />
            </div>
            <div className="h-6 w-20 bg-muted rounded" />
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            {[...Array(6)].map((_, i) => (
              <div key={i}>
                <div className="h-3 w-24 bg-muted rounded mb-2" />
                <div className="h-4 w-40 bg-muted rounded" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Transaction Lines Card */}
      <Card>
        <CardHeader>
          <div className="h-5 w-32 bg-muted rounded mb-2" />
          <div className="h-4 w-48 bg-muted rounded" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-10 bg-muted rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

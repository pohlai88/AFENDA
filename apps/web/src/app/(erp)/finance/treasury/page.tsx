import type { Metadata } from "next";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Badge,
} from "@afenda/ui";
import { fetchTreasuryBankAccounts, fetchTreasuryBankStatements } from "@/lib/api-client";

export const metadata: Metadata = {
  title: "Treasury — AFENDA",
  description: "Cash management, bank statements, reconciliation, and payment controls",
};

/** Treasury overview dashboard with bank accounts and statements. */
export default async function TreasuryPage() {
  let accountCount = 0;
  let statementCount = 0;
  let activeAccountCount = 0;

  try {
    const accounts = await fetchTreasuryBankAccounts({ limit: 100 });
    accountCount = accounts.data.length;
    activeAccountCount = accounts.data.filter((a) => a.status === "active").length;
  } catch {
    // Render the page with safe zero-state values when fetch fails.
  }

  try {
    const statements = await fetchTreasuryBankStatements({
      limit: 100,
      status: "processed",
    });
    statementCount = statements.data.length;
  } catch {
    // Render the page with safe zero-state values when fetch fails.
  }

  // Empty state when no data
  const hasNoData = accountCount === 0 && statementCount === 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Treasury</h1>
        <p className="mt-2 text-muted-foreground">
          Manage bank accounts and statements for your organization.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Bank Accounts</CardTitle>
            <CardDescription className="text-xs">Total in organization</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{accountCount}</div>
            <p className="mt-1 text-xs text-muted-foreground">{activeAccountCount} active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Bank Statements</CardTitle>
            <CardDescription className="text-xs">Processed statements</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statementCount}</div>
            <p className="mt-1 text-xs text-muted-foreground">Ready for reconciliation</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
            <CardDescription className="text-xs">System health</CardDescription>
          </CardHeader>
          <CardContent>
            <Badge variant="default">Operational</Badge>
            <p className="mt-2 text-xs text-muted-foreground">All systems running</p>
          </CardContent>
        </Card>
      </div>

      {hasNoData ? (
        // Empty state
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4 rounded-lg bg-muted p-4">
              <svg
                className="h-8 w-8 text-muted-foreground"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h3 className="mb-2 text-lg font-semibold">Get Started with Treasury</h3>
            <p className="mb-6 max-w-sm text-sm text-muted-foreground">
              Set up your first bank account and import statements to start managing cash flow and
              reconciliation.
            </p>
            <Button asChild>
              <Link href="/finance/treasury/bank-accounts">Create Bank Account</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Bank Accounts</CardTitle>
                <CardDescription>
                  Manage your organization's bank accounts and routing information.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Create, activate, and manage bank account connections.
                </p>
                <Button asChild className="w-full" variant="outline">
                  <Link href="/finance/treasury/bank-accounts">Manage Accounts</Link>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Bank Statements</CardTitle>
                <CardDescription>
                  Ingest and reconcile bank statements from your financial institutions.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Upload statements and track reconciliation progress.
                </p>
                <Button asChild className="w-full" variant="outline">
                  <Link href="/finance/treasury/bank-statements">View Statements</Link>
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Reconciliation</CardTitle>
                <CardDescription>
                  Match statement lines to transactions and close reconciliation sessions.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Open sessions, add matches, and close when complete.
                </p>
                <Button asChild className="w-full" variant="outline">
                  <Link href="/finance/treasury/reconciliation">Manage Reconciliation</Link>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Payment Factory</CardTitle>
                <CardDescription>
                  Create payment instructions, submit for approval, and release in batches.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Full segregation of duties: maker-checker payment workflow.
                </p>
                <Button asChild className="w-full" variant="outline">
                  <Link href="/finance/treasury/payments">Manage Payments</Link>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Cash Position</CardTitle>
                <CardDescription>
                  Generate as-of cash snapshots to monitor available liquidity.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Wave 3 baseline: reproducible snapshot with source versioning.
                </p>
                <Button asChild className="w-full" variant="outline">
                  <Link href="/finance/treasury/cash-position">View Cash Position</Link>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Liquidity Forecast</CardTitle>
                <CardDescription>
                  Build scenario-based liquidity projections from validated cash snapshots.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Wave 3.2: scenario management and forecast buckets for forward planning.
                </p>
                <Button asChild className="w-full" variant="outline">
                  <Link href="/finance/treasury/liquidity-forecast">View Liquidity Forecast</Link>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">FX Snapshots</CardTitle>
                <CardDescription>
                  Maintain currency conversion rates used by Wave 3.1 normalization.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Seed or update FX rates by date, pair, and source version.
                </p>
                <Button asChild className="w-full" variant="outline">
                  <Link href="/finance/treasury/fx-rates">Manage FX Snapshots</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

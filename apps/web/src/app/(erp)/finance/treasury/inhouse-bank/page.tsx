import { Card, CardContent, CardHeader, CardTitle } from "@afenda/ui";
import { Suspense } from "react";
import { IntercompanyTransferBoard, IntercompanyTransferBoardSkeleton } from "../components/intercompany-transfer-board";

const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:3000";

interface InternalBankAccount {
  id: string;
  code: string;
  accountName: string;
  accountType: string;
  currencyCode: string;
  status: string;
  isPrimaryFundingAccount: boolean;
}

interface IntercompanyTransfer {
  id: string;
  transferNumber: string;
  fromLegalEntityId: string;
  toLegalEntityId: string;
  transferAmountMinor: string;
  currencyCode: string;
  status: string;
  requestedExecutionDate: string;
}

/**
 * Fetch internal bank accounts
 */
async function getInternalAccounts(orgId: string): Promise<InternalBankAccount[]> {
  try {
    const res = await fetch(
      `${API_BASE_URL}/v1/treasury/internal-bank-accounts?orgId=${orgId}`,
      {
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${process.env.API_TOKEN || ""}`,
        },
      }
    );

    if (!res.ok) {
      console.error("Failed to fetch internal accounts", res.status);
      return [];
    }

    const data = await res.json();
    return data.data ?? [];
  } catch (err) {
    console.error("Error fetching internal accounts:", err);
    return [];
  }
}

/**
 * Fetch intercompany transfers
 */
async function getTransfers(orgId: string): Promise<IntercompanyTransfer[]> {
  try {
    const res = await fetch(
      `${API_BASE_URL}/v1/treasury/intercompany-transfers?orgId=${orgId}`,
      {
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${process.env.API_TOKEN || ""}`,
        },
      }
    );

    if (!res.ok) {
      console.error("Failed to fetch transfers", res.status);
      return [];
    }

    const data = await res.json();
    return data.data ?? [];
  } catch (err) {
    console.error("Error fetching transfers:", err);
    return [];
  }
}

/**
 * In-House Banking Dashboard
 * Displays internal bank accounts and intercompany transfers
 */
export default async function InHouseBankPage({
  searchParams,
}: {
  searchParams: Promise<{ orgId?: string }>;
}) {
  const params = await searchParams;
  const orgId = params.orgId || "unknown";

  const [accounts, transfers] = await Promise.all([
    getInternalAccounts(orgId),
    getTransfers(orgId),
  ]);

  const accountStatusColors: Record<string, string> = {
    draft: "bg-muted text-muted-foreground",
    active: "bg-primary/10 text-primary",
    inactive: "bg-accent text-accent-foreground",
    closed: "bg-destructive/10 text-destructive",
  };

  const accountTypeLabels: Record<string, string> = {
    operating: "Operating",
    funding: "Funding",
    settlement: "Settlement",
    sweep: "Sweep",
    clearing: "Clearing",
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">In-House Banking</h1>
        <p className="text-muted-foreground mt-2">
          Manage internal treasury accounts and intercompany transfers
        </p>
      </div>

      {/* Internal Bank Accounts Section */}
      <section>
        <h2 className="text-2xl font-bold mb-4">Internal Bank Accounts</h2>
        {accounts.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground">No internal bank accounts configured.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {accounts.map((account) => (
              <Card key={account.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{account.code}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">{account.accountName}</p>
                    </div>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${accountStatusColors[account.status]}`}
                    >
                      {account.status}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="text-sm">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Type:</span>
                      <span className="font-medium">{accountTypeLabels[account.accountType]}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Currency:</span>
                      <span className="font-medium">{account.currencyCode}</span>
                    </div>
                    {account.isPrimaryFundingAccount && (
                      <div className="pt-2 border-t">
                        <span className="rounded bg-secondary px-2 py-1 text-xs text-secondary-foreground">
                          Primary Funding Account
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Intercompany Transfers Section */}
      <section>
        <h2 className="text-2xl font-bold mb-4">Intercompany Transfers</h2>
        <Suspense fallback={<IntercompanyTransferBoardSkeleton />}>
          <IntercompanyTransferBoard transfers={transfers} />
        </Suspense>
      </section>
    </div>
  );
}

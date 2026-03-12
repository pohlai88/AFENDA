import type { Metadata } from "next";
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@afenda/ui";
import {
  fetchApDuePaymentProjections,
  fetchArExpectedReceiptProjections,
  type ApDuePaymentProjectionRow,
  type ArExpectedReceiptProjectionRow,
} from "@/lib/api-client";

export const metadata: Metadata = {
  title: "Liquidity Bridge — Treasury — AFENDA",
  description: "AP due payments and AR expected receipts feeding treasury liquidity projections",
};

function formatMinor(minor: string, currency: string): string {
  try {
    const units = Number(BigInt(minor)) / 100;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
    }).format(units);
  } catch {
    return `${minor} ${currency}`;
  }
}

function statusVariant(
  status: string,
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "open":
      return "default";
    case "partially_paid":
    case "partially_received":
      return "secondary";
    case "fully_paid":
    case "fully_received":
      return "outline";
    case "cancelled":
      return "destructive";
    default:
      return "secondary";
  }
}

function ApProjectionTable({
  rows,
}: {
  rows: ApDuePaymentProjectionRow[];
}) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        No AP due payment projections found.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-muted-foreground">
            <th className="text-left py-2 pr-4 font-medium">Supplier</th>
            <th className="text-left py-2 pr-4 font-medium">Due Date</th>
            <th className="text-left py-2 pr-4 font-medium">Expected Payment</th>
            <th className="text-right py-2 pr-4 font-medium">Open Amount</th>
            <th className="text-left py-2 pr-4 font-medium">Currency</th>
            <th className="text-left py-2 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b last:border-0 hover:bg-muted/30">
              <td className="py-2 pr-4 font-medium">{row.supplierName}</td>
              <td className="py-2 pr-4 text-muted-foreground">{row.dueDate}</td>
              <td className="py-2 pr-4 text-muted-foreground">{row.expectedPaymentDate}</td>
              <td className="py-2 pr-4 text-right font-mono text-destructive">
                {formatMinor(row.openAmountMinor, row.currencyCode)}
              </td>
              <td className="py-2 pr-4 text-muted-foreground">{row.currencyCode}</td>
              <td className="py-2">
                <Badge variant={statusVariant(row.status)}>
                  {row.status.replace(/_/g, " ")}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ArProjectionTable({
  rows,
}: {
  rows: ArExpectedReceiptProjectionRow[];
}) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        No AR expected receipt projections found.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-muted-foreground">
            <th className="text-left py-2 pr-4 font-medium">Customer</th>
            <th className="text-left py-2 pr-4 font-medium">Due Date</th>
            <th className="text-left py-2 pr-4 font-medium">Expected Receipt</th>
            <th className="text-right py-2 pr-4 font-medium">Open Amount</th>
            <th className="text-left py-2 pr-4 font-medium">Currency</th>
            <th className="text-left py-2 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b last:border-0 hover:bg-muted/30">
              <td className="py-2 pr-4 font-medium">{row.customerName}</td>
              <td className="py-2 pr-4 text-muted-foreground">{row.dueDate}</td>
              <td className="py-2 pr-4 text-muted-foreground">{row.expectedReceiptDate}</td>
              <td className="py-2 pr-4 text-right font-mono text-success">
                {formatMinor(row.openAmountMinor, row.currencyCode)}
              </td>
              <td className="py-2 pr-4 text-muted-foreground">{row.currencyCode}</td>
              <td className="py-2">
                <Badge variant={statusVariant(row.status)}>
                  {row.status.replace(/_/g, " ")}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function TreasuryLiquidityBridgePage() {
  let apRows: ApDuePaymentProjectionRow[] = [];
  let arRows: ArExpectedReceiptProjectionRow[] = [];
  let apError = false;
  let arError = false;

  const [apResult, arResult] = await Promise.allSettled([
    fetchApDuePaymentProjections({ status: "open" }),
    fetchArExpectedReceiptProjections({ status: "open" }),
  ]);

  if (apResult.status === "fulfilled") {
    apRows = apResult.value.data;
  } else {
    apError = true;
  }

  if (arResult.status === "fulfilled") {
    arRows = arResult.value.data;
  } else {
    arError = true;
  }

  // Summary aggregates
  const totalOutflowsByCurrency = apRows.reduce<Record<string, bigint>>((acc, row) => {
    acc[row.currencyCode] = (acc[row.currencyCode] ?? 0n) + BigInt(row.openAmountMinor);
    return acc;
  }, {});

  const totalInflowsByCurrency = arRows.reduce<Record<string, bigint>>((acc, row) => {
    acc[row.currencyCode] = (acc[row.currencyCode] ?? 0n) + BigInt(row.openAmountMinor);
    return acc;
  }, {});

  return (
    <div className="space-y-6 px-6 py-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Liquidity Bridge</h1>
        <p className="text-sm text-muted-foreground">
          AP due payments (outflows) and AR expected receipts (inflows) feeding treasury
          liquidity projections.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Open AP Outflows
            </CardTitle>
            <CardDescription className="text-xs">Pending due payments to suppliers</CardDescription>
          </CardHeader>
          <CardContent>
            {Object.entries(totalOutflowsByCurrency).length === 0 ? (
              <p className="text-2xl font-bold text-muted-foreground">—</p>
            ) : (
              <div className="space-y-1">
                {Object.entries(totalOutflowsByCurrency).map(([ccy, minor]) => (
                  <p key={ccy} className="text-2xl font-bold text-destructive">
                    {formatMinor(minor.toString(), ccy)}
                  </p>
                ))}
              </div>
            )}
            <p className="mt-1 text-xs text-muted-foreground">{apRows.length} open projections</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Open AR Inflows
            </CardTitle>
            <CardDescription className="text-xs">
              Expected receipts from customers
            </CardDescription>
          </CardHeader>
          <CardContent>
            {Object.entries(totalInflowsByCurrency).length === 0 ? (
              <p className="text-2xl font-bold text-muted-foreground">—</p>
            ) : (
              <div className="space-y-1">
                {Object.entries(totalInflowsByCurrency).map(([ccy, minor]) => (
                  <p key={ccy} className="text-2xl font-bold text-success">
                    {formatMinor(minor.toString(), ccy)}
                  </p>
                ))}
              </div>
            )}
            <p className="mt-1 text-xs text-muted-foreground">{arRows.length} open projections</p>
          </CardContent>
        </Card>
      </div>

      {/* AP Due Payment Projections */}
      <Card>
        <CardHeader>
          <CardTitle>AP Due Payment Projections</CardTitle>
          <CardDescription>
            Accounts payable obligations projected as treasury outflows.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {apError ? (
            <p className="text-sm text-destructive">
              Failed to load AP projections. Check API connectivity.
            </p>
          ) : (
            <ApProjectionTable rows={apRows} />
          )}
        </CardContent>
      </Card>

      {/* AR Expected Receipt Projections */}
      <Card>
        <CardHeader>
          <CardTitle>AR Expected Receipt Projections</CardTitle>
          <CardDescription>
            Accounts receivable expected collections projected as treasury inflows.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {arError ? (
            <p className="text-sm text-destructive">
              Failed to load AR projections. Check API connectivity.
            </p>
          ) : (
            <ArProjectionTable rows={arRows} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

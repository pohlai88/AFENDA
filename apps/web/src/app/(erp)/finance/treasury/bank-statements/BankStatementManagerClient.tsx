"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Textarea,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@afenda/ui";
import { minorToMajorDecimalString } from "@afenda/ui";
import {
  fetchTreasuryBankAccounts,
  fetchTreasuryBankStatements,
  ingestTreasuryBankStatement,
  type TreasuryBankAccountRow,
  type TreasuryBankStatementRow,
} from "@/lib/api-client";

const EMPTY_FORM = {
  bankAccountId: "",
  sourceRef: "",
  statementDate: "",
  openingBalance: "",
  closingBalance: "",
  currencyCode: "USD",
  linesJson: "",
};

type IngestLineInput = {
  lineNumber: number;
  transactionDate: string;
  valueDate?: string | null;
  amount: string;
  direction: "inflow" | "outflow";
  description: string;
  reference?: string;
};

function toUtcIsoDateTime(input: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
    return `${input}T00:00:00.000Z`;
  }
  return input;
}

export function BankStatementManagerClient() {
  const [statements, setStatements] = useState<TreasuryBankStatementRow[]>([]);
  const [accounts, setAccounts] = useState<TreasuryBankAccountRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [accountFilter, setAccountFilter] = useState<string>("");
  const [form, setForm] = useState(EMPTY_FORM);
  const [ingesting, setIngesting] = useState(false);
  const [ingestError, setIngestError] = useState<string | null>(null);

  // Load accounts on mount
  useEffect(() => {
    (async () => {
      try {
        const result = await fetchTreasuryBankAccounts({ limit: 100 });
        setAccounts(result.data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load treasury bank accounts",
        );
      }
    })();
  }, []);

  // Load statements on mount and when filters change
  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await fetchTreasuryBankStatements({
          limit: 100,
          status: statusFilter ? (statusFilter as any) : undefined,
          bankAccountId: accountFilter || undefined,
        });
        setStatements(result.data);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load bank statements",
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [statusFilter, accountFilter]);

  const handleIngest = async (e: React.FormEvent) => {
    e.preventDefault();
    setIngesting(true);
    setIngestError(null);

    try {
      let lines: IngestLineInput[] = [];
      if (form.linesJson.trim()) {
        lines = JSON.parse(form.linesJson) as IngestLineInput[];
      }

      if (!Array.isArray(lines)) {
        throw new Error("Lines must be a JSON array");
      }

      await ingestTreasuryBankStatement({
        bankAccountId: form.bankAccountId,
        sourceRef: form.sourceRef,
        statementDate: toUtcIsoDateTime(form.statementDate),
        openingBalance: form.openingBalance,
        closingBalance: form.closingBalance,
        currencyCode: form.currencyCode,
        lines: lines.map((line) => ({
          ...line,
          transactionDate: toUtcIsoDateTime(line.transactionDate),
          valueDate: line.valueDate ? toUtcIsoDateTime(line.valueDate) : null,
        })),
      });

      setForm(EMPTY_FORM);
      // Reload statements
      const result = await fetchTreasuryBankStatements({
        limit: 100,
        status: statusFilter ? (statusFilter as any) : undefined,
        bankAccountId: accountFilter || undefined,
      });
      setStatements(result.data);
    } catch (err) {
      setIngestError(
        err instanceof Error ? err.message : "Failed to ingest statement",
      );
    } finally {
      setIngesting(false);
    }
  };

  const statusBadgeColor: Record<string, string> = {
    pending: "bg-warning/10 text-warning",
    processing: "bg-primary/10 text-primary",
    processed: "bg-success/10 text-success",
    failed: "bg-destructive/10 text-destructive",
  };

  const sampleLines = JSON.stringify(
    [
      {
        lineNumber: 1,
        transactionDate: "2026-03-01",
        valueDate: "2026-03-01",
        amount: "100000",
        direction: "inflow",
        description: "Customer payment A",
        reference: "INV-001",
      },
      {
        lineNumber: 2,
        transactionDate: "2026-03-02",
        valueDate: "2026-03-02",
        amount: "50000",
        direction: "outflow",
        description: "Supplier payment B",
        reference: "PO-123",
      },
    ],
    null,
    2,
  );

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="status-filter" className="text-sm">
                Status
              </Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger id="status-filter">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="processed">Processed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="account-filter" className="text-sm">
                Bank Account
              </Label>
              <Select value={accountFilter} onValueChange={setAccountFilter}>
                <SelectTrigger id="account-filter">
                  <SelectValue placeholder="All accounts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All accounts</SelectItem>
                  {accounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.accountName} ({acc.currencyCode})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ingest Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ingest Bank Statement</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleIngest} className="space-y-4">
            {ingestError && (
              <div className="p-3 bg-destructive/5 text-destructive rounded text-sm">
                {ingestError}
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="bank-account-id" className="text-sm">
                  Bank Account
                </Label>
                <Select
                  value={form.bankAccountId}
                  onValueChange={(val) =>
                    setForm({ ...form, bankAccountId: val })
                  }
                >
                  <SelectTrigger id="bank-account-id">
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.accountName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="source-ref" className="text-sm">
                  Source Reference
                </Label>
                <Input
                  id="source-ref"
                  placeholder="STMT-20260312-001"
                  value={form.sourceRef}
                  onChange={(e) =>
                    setForm({ ...form, sourceRef: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="statement-date" className="text-sm">
                  Statement Date
                </Label>
                <Input
                  id="statement-date"
                  type="date"
                  value={form.statementDate}
                  onChange={(e) =>
                    setForm({ ...form, statementDate: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="currency" className="text-sm">
                  Currency
                </Label>
                <Input
                  id="currency"
                  placeholder="USD"
                  value={form.currencyCode}
                  onChange={(e) =>
                    setForm({ ...form, currencyCode: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="opening-balance" className="text-sm">
                  Opening Balance (minor units)
                </Label>
                <Input
                  id="opening-balance"
                  placeholder="1000000"
                  value={form.openingBalance}
                  onChange={(e) =>
                    setForm({ ...form, openingBalance: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="closing-balance" className="text-sm">
                  Closing Balance (minor units)
                </Label>
                <Input
                  id="closing-balance"
                  placeholder="1150000"
                  value={form.closingBalance}
                  onChange={(e) =>
                    setForm({ ...form, closingBalance: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="lines-json" className="text-sm">
                Transaction Lines (JSON)
              </Label>
              <Textarea
                id="lines-json"
                placeholder={sampleLines}
                value={form.linesJson}
                onChange={(e) =>
                  setForm({ ...form, linesJson: e.target.value })
                }
                className="font-mono text-xs"
                rows={8}
              />
              <p className="text-xs text-muted-foreground">
                Array of objects with: lineNumber, transactionDate, valueDate,
                amount, direction (inflow/outflow), description, reference
              </p>
            </div>

            <Button
              type="submit"
              disabled={
                ingesting ||
                !form.bankAccountId ||
                !form.sourceRef ||
                !form.statementDate
              }
              className="w-full"
            >
              {ingesting ? "Ingesting..." : "Ingest Statement"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Statements List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Bank Statements ({statements.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : statements.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No bank statements found.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Statement Date</TableHead>
                    <TableHead className="text-xs">Source Ref</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs text-right">
                      Closing Balance
                    </TableHead>
                    <TableHead className="text-xs">Lines</TableHead>
                    <TableHead className="text-xs">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {statements.map((stmt) => (
                    <TableRow key={stmt.id}>
                      <TableCell className="text-xs">
                        {new Date(stmt.statementDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-xs font-mono">
                        {stmt.sourceRef}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={statusBadgeColor[stmt.status] || ""}
                        >
                          {stmt.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-right">
                        {stmt.currencyCode}{" "}
                        {minorToMajorDecimalString(
                          BigInt(stmt.closingBalance),
                          stmt.currencyCode,
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        {stmt.lineCount}
                      </TableCell>
                      <TableCell>
                        <Button
                          asChild
                          variant="ghost"
                          size="sm"
                          className="text-xs"
                        >
                          <Link href={`/finance/treasury/bank-statements/${stmt.id}`}>
                            View
                          </Link>
                        </Button>
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

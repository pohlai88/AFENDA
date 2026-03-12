"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@afenda/ui";
import {
  closeReconciliationSession,
  fetchTreasuryBankAccounts,
  fetchTreasuryBankStatements,
  fetchTreasuryReconciliationSessions,
  openTreasuryReconciliationSession,
  type TreasuryBankAccountRow,
  type TreasuryBankStatementRow,
  type TreasuryReconciliationSessionRow,
} from "@/lib/api-client";

const STATUS_VARIANTS: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  open: "default",
  matching: "secondary",
  closed: "outline",
  voided: "destructive",
};

export function ReconciliationManagerClient() {
  const [sessions, setSessions] = useState<TreasuryReconciliationSessionRow[]>([]);
  const [accounts, setAccounts] = useState<TreasuryBankAccountRow[]>([]);
  const [statements, setStatements] = useState<TreasuryBankStatementRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [closingId, setClosingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    bankAccountId: "",
    bankStatementId: "",
    toleranceMinor: "0",
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [sessionsResult, accountsResult, statementsResult] = await Promise.all([
        fetchTreasuryReconciliationSessions({ limit: 50 }),
        fetchTreasuryBankAccounts({ limit: 100 }),
        fetchTreasuryBankStatements({ limit: 100 }),
      ]);
      setSessions(sessionsResult.data ?? []);
      setAccounts(accountsResult.data ?? []);
      setStatements(statementsResult.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load reconciliation data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleOpen(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await openTreasuryReconciliationSession({
        bankAccountId: form.bankAccountId,
        bankStatementId: form.bankStatementId,
        toleranceMinor: form.toleranceMinor,
      });
      setForm({ bankAccountId: "", bankStatementId: "", toleranceMinor: "0" });
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to open reconciliation session");
    } finally {
      setSaving(false);
    }
  }

  async function handleClose(sessionId: string) {
    setClosingId(sessionId);
    setError(null);
    try {
      await closeReconciliationSession(sessionId);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to close session");
    } finally {
      setClosingId(null);
    }
  }

  function setField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Loading reconciliation sessions…
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-md border border-destructive bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* New session form */}
      {showForm ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Open Reconciliation Session</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={(e) => void handleOpen(e)} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="bankAccountId">Bank Account</Label>
                  <Select
                    value={form.bankAccountId}
                    onValueChange={(v) => setField("bankAccountId", v)}
                    required
                  >
                    <SelectTrigger id="bankAccountId">
                      <SelectValue placeholder="Select account" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.accountName} ({a.currencyCode})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="bankStatementId">Bank Statement</Label>
                  <Select
                    value={form.bankStatementId}
                    onValueChange={(v) => setField("bankStatementId", v)}
                    required
                  >
                    <SelectTrigger id="bankStatementId">
                      <SelectValue placeholder="Select statement" />
                    </SelectTrigger>
                    <SelectContent>
                      {statements.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.sourceRef ?? s.id} — {s.statementDate}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="toleranceMinor">Tolerance (minor units)</Label>
                  <Input
                    id="toleranceMinor"
                    type="number"
                    min="0"
                    value={form.toleranceMinor}
                    onChange={(e) => setField("toleranceMinor", e.target.value)}
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={saving || !form.bankAccountId || !form.bankStatementId}>
                  {saving ? "Opening…" : "Open Session"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : (
        <div className="flex justify-end">
          <Button onClick={() => setShowForm(true)}>Open Session</Button>
        </div>
      )}

      {/* Sessions table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Reconciliation Sessions</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {sessions.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-muted-foreground">
              No reconciliation sessions yet. Open one to begin matching transactions.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Session ID</TableHead>
                  <TableHead>Bank Account</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Tolerance</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono text-xs">{s.id.slice(0, 8)}…</TableCell>
                    <TableCell className="font-mono text-xs">{s.bankAccountId.slice(0, 8)}…</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANTS[s.status] ?? "outline"}>
                        {s.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{s.toleranceMinor}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(s.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {(s.status === "open" || s.status === "matching") && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={closingId === s.id}
                          onClick={() => void handleClose(s.id)}
                        >
                          {closingId === s.id ? "Closing…" : "Close"}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Checkbox,
  Input,
  Label,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@afenda/ui";
import {
  activateTreasuryBankAccount,
  createTreasuryBankAccount,
  deactivateTreasuryBankAccount,
  fetchTreasuryBankAccounts,
  type TreasuryBankAccountRow,
  updateTreasuryBankAccount,
} from "@/lib/api-client";

type EditableBankAccount = {
  id: string;
  accountName: string;
  bankName: string;
  accountNumber: string;
  currencyCode: string;
  bankIdentifierCode: string;
  externalBankRef: string;
  isPrimary: boolean;
};

const EMPTY_FORM: Omit<EditableBankAccount, "id"> = {
  accountName: "",
  bankName: "",
  accountNumber: "",
  currencyCode: "USD",
  bankIdentifierCode: "",
  externalBankRef: "",
  isPrimary: false,
};

export function BankAccountManagerClient() {
  const [accounts, setAccounts] = useState<TreasuryBankAccountRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<EditableBankAccount, "id">>(EMPTY_FORM);

  async function loadAccounts() {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchTreasuryBankAccounts({ limit: 50 });
      setAccounts(result.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load treasury bank accounts");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAccounts();
  }, []);

  const submitLabel = useMemo(() => (editingId ? "Save Changes" : "Create Account"), [editingId]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      if (editingId) {
        await updateTreasuryBankAccount({
          id: editingId,
          accountName: form.accountName,
          bankName: form.bankName,
          accountNumber: form.accountNumber,
          currencyCode: form.currencyCode,
          bankIdentifierCode: form.bankIdentifierCode || null,
          externalBankRef: form.externalBankRef || null,
          isPrimary: form.isPrimary,
        });
      } else {
        await createTreasuryBankAccount({
          accountName: form.accountName,
          bankName: form.bankName,
          accountNumber: form.accountNumber,
          currencyCode: form.currencyCode,
          bankIdentifierCode: form.bankIdentifierCode || undefined,
          externalBankRef: form.externalBankRef || undefined,
          isPrimary: form.isPrimary,
        });
      }

      setEditingId(null);
      setForm(EMPTY_FORM);
      await loadAccounts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save bank account");
    } finally {
      setSaving(false);
    }
  }

  function startEdit(row: TreasuryBankAccountRow) {
    setEditingId(row.id);
    setForm({
      accountName: row.accountName,
      bankName: row.bankName,
      accountNumber: row.accountNumber,
      currencyCode: row.currencyCode,
      bankIdentifierCode: row.bankIdentifierCode ?? "",
      externalBankRef: row.externalBankRef ?? "",
      isPrimary: row.isPrimary,
    });
  }

  function resetForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  async function toggleActivation(row: TreasuryBankAccountRow) {
    setError(null);
    try {
      if (row.status === "active") {
        await deactivateTreasuryBankAccount(row.id);
      } else {
        await activateTreasuryBankAccount(row.id);
      }
      await loadAccounts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update bank account status");
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
      <Card>
        <CardHeader>
          <CardTitle>Treasury Bank Accounts</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="px-6 py-5 text-sm text-muted-foreground">Loading bank accounts...</div>
          ) : accounts.length === 0 ? (
            <div className="px-6 py-5 text-sm text-muted-foreground">
              No bank accounts yet. Add your first account using the form.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account</TableHead>
                  <TableHead>Bank</TableHead>
                  <TableHead>Currency</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <div className="font-medium">{row.accountName}</div>
                      <div className="text-xs text-muted-foreground">{row.accountNumber}</div>
                    </TableCell>
                    <TableCell>
                      <div>{row.bankName}</div>
                      <div className="text-xs text-muted-foreground">{row.bankIdentifierCode ?? "—"}</div>
                    </TableCell>
                    <TableCell>{row.currencyCode}</TableCell>
                    <TableCell>
                      <Badge variant={row.status === "active" ? "default" : "secondary"}>{row.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => startEdit(row)}>
                          Edit
                        </Button>
                        <Button
                          variant={row.status === "active" ? "secondary" : "default"}
                          size="sm"
                          onClick={() => void toggleActivation(row)}
                        >
                          {row.status === "active" ? "Deactivate" : "Activate"}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{editingId ? "Edit Bank Account" : "Create Bank Account"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label htmlFor="accountName">Account Name</Label>
              <Input
                id="accountName"
                value={form.accountName}
                onChange={(e) => setForm((prev) => ({ ...prev, accountName: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bankName">Bank Name</Label>
              <Input
                id="bankName"
                value={form.bankName}
                onChange={(e) => setForm((prev) => ({ ...prev, bankName: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="accountNumber">Account Number</Label>
              <Input
                id="accountNumber"
                value={form.accountNumber}
                onChange={(e) => setForm((prev) => ({ ...prev, accountNumber: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="currencyCode">Currency</Label>
              <Input
                id="currencyCode"
                value={form.currencyCode}
                onChange={(e) => setForm((prev) => ({ ...prev, currencyCode: e.target.value.toUpperCase() }))}
                maxLength={3}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bankIdentifierCode">Bank Identifier Code</Label>
              <Input
                id="bankIdentifierCode"
                value={form.bankIdentifierCode}
                onChange={(e) => setForm((prev) => ({ ...prev, bankIdentifierCode: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="externalBankRef">External Bank Ref</Label>
              <Input
                id="externalBankRef"
                value={form.externalBankRef}
                onChange={(e) => setForm((prev) => ({ ...prev, externalBankRef: e.target.value }))}
              />
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="isPrimary"
                checked={form.isPrimary}
                onCheckedChange={(value) =>
                  setForm((prev) => ({ ...prev, isPrimary: value === true }))
                }
              />
              <Label htmlFor="isPrimary">Primary account</Label>
            </div>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}

            <div className="flex gap-2">
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : submitLabel}
              </Button>
              {editingId ? (
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              ) : null}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

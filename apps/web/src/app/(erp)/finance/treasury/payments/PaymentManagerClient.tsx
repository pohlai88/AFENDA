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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
} from "@afenda/ui";
import {
  approveTreasuryPaymentInstruction,
  createTreasuryPaymentInstruction,
  fetchTreasuryBankAccounts,
  fetchTreasuryPaymentInstructions,
  rejectTreasuryPaymentInstruction,
  submitTreasuryPaymentInstruction,
  type TreasuryBankAccountRow,
  type TreasuryPaymentInstructionRow,
} from "@/lib/api-client";

const INSTRUCTION_STATUS_VARIANTS: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  pending: "secondary",
  processing: "default",
  approved: "default",
  rejected: "destructive",
  cancelled: "outline",
};

const PAYMENT_METHODS = [
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "internal_transfer", label: "Internal Transfer" },
  { value: "check", label: "Check" },
  { value: "direct_debit", label: "Direct Debit" },
  { value: "manual", label: "Manual" },
] as const;

type PaymentMethod = (typeof PAYMENT_METHODS)[number]["value"];

const EMPTY_INSTRUCTION_FORM = {
  sourceBankAccountId: "",
  beneficiaryName: "",
  beneficiaryAccountNumber: "",
  beneficiaryBankCode: "",
  amountMinor: "",
  currencyCode: "USD",
  paymentMethod: "bank_transfer" as PaymentMethod,
  reference: "",
  requestedExecutionDate: "",
};

export function PaymentManagerClient() {
  const [instructions, setInstructions] = useState<TreasuryPaymentInstructionRow[]>([]);
  const [accounts, setAccounts] = useState<TreasuryBankAccountRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_INSTRUCTION_FORM);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [actioningId, setActioningId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [instrResult, acctResult] = await Promise.all([
        fetchTreasuryPaymentInstructions({ limit: 50 }),
        fetchTreasuryBankAccounts({ limit: 100 }),
      ]);
      setInstructions(instrResult.data ?? []);
      setAccounts(acctResult.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load payment data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function setField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await createTreasuryPaymentInstruction({
        sourceBankAccountId: form.sourceBankAccountId,
        beneficiaryName: form.beneficiaryName,
        beneficiaryAccountNumber: form.beneficiaryAccountNumber,
        beneficiaryBankCode: form.beneficiaryBankCode || undefined,
        amountMinor: form.amountMinor,
        currencyCode: form.currencyCode,
        paymentMethod: form.paymentMethod,
        reference: form.reference || undefined,
        requestedExecutionDate: form.requestedExecutionDate,
      });
      setForm(EMPTY_INSTRUCTION_FORM);
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create payment instruction");
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit(id: string) {
    setActioningId(id);
    setError(null);
    try {
      await submitTreasuryPaymentInstruction(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit payment instruction");
    } finally {
      setActioningId(null);
    }
  }

  async function handleApprove(id: string) {
    setActioningId(id);
    setError(null);
    try {
      await approveTreasuryPaymentInstruction(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to approve payment instruction");
    } finally {
      setActioningId(null);
    }
  }

  async function handleReject(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!rejectId) return;
    setActioningId(rejectId);
    setError(null);
    try {
      await rejectTreasuryPaymentInstruction(rejectId, rejectReason);
      setRejectId(null);
      setRejectReason("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reject payment instruction");
    } finally {
      setActioningId(null);
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Loading payment instructions…
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

      <Tabs defaultValue="instructions">
        <TabsList>
          <TabsTrigger value="instructions">
            Payment Instructions ({instructions.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="instructions" className="space-y-4 mt-4">
          {/* Create form */}
          {showForm ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">New Payment Instruction</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={(e) => void handleCreate(e)} className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label htmlFor="sourceBankAccountId">Source Account</Label>
                      <Select
                        value={form.sourceBankAccountId}
                        onValueChange={(v) => setField("sourceBankAccountId", v)}
                        required
                      >
                        <SelectTrigger id="sourceBankAccountId">
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
                      <Label htmlFor="paymentMethod">Payment Method</Label>
                      <Select
                        value={form.paymentMethod}
                        onValueChange={(v) => setField("paymentMethod", v as PaymentMethod)}
                      >
                        <SelectTrigger id="paymentMethod">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PAYMENT_METHODS.map((m) => (
                            <SelectItem key={m.value} value={m.value}>
                              {m.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="beneficiaryName">Beneficiary Name</Label>
                      <Input
                        id="beneficiaryName"
                        value={form.beneficiaryName}
                        onChange={(e) => setField("beneficiaryName", e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="beneficiaryAccountNumber">Account Number</Label>
                      <Input
                        id="beneficiaryAccountNumber"
                        value={form.beneficiaryAccountNumber}
                        onChange={(e) => setField("beneficiaryAccountNumber", e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="beneficiaryBankCode">Bank Code (optional)</Label>
                      <Input
                        id="beneficiaryBankCode"
                        value={form.beneficiaryBankCode}
                        onChange={(e) => setField("beneficiaryBankCode", e.target.value)}
                        placeholder="BIC / SWIFT / ABA"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="amountMinor">Amount (minor units)</Label>
                      <Input
                        id="amountMinor"
                        type="number"
                        min="1"
                        value={form.amountMinor}
                        onChange={(e) => setField("amountMinor", e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="currencyCode">Currency</Label>
                      <Input
                        id="currencyCode"
                        value={form.currencyCode}
                        maxLength={3}
                        onChange={(e) => setField("currencyCode", e.target.value.toUpperCase())}
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="requestedExecutionDate">Execution Date</Label>
                      <Input
                        id="requestedExecutionDate"
                        type="date"
                        value={form.requestedExecutionDate}
                        onChange={(e) => setField("requestedExecutionDate", e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-1 sm:col-span-2">
                      <Label htmlFor="reference">Reference (optional)</Label>
                      <Input
                        id="reference"
                        value={form.reference}
                        onChange={(e) => setField("reference", e.target.value)}
                        placeholder="Invoice number, PO reference, etc."
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      type="submit"
                      disabled={saving || !form.sourceBankAccountId || !form.amountMinor}
                    >
                      {saving ? "Creating…" : "Create Instruction"}
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
              <Button onClick={() => setShowForm(true)}>New Instruction</Button>
            </div>
          )}

          {/* Reject dialog */}
          {rejectId && (
            <Card className="border-destructive">
              <CardHeader>
                <CardTitle className="text-base text-destructive">Reject Instruction</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={(e) => void handleReject(e)} className="space-y-3">
                  <div className="space-y-1">
                    <Label htmlFor="rejectReason">Rejection Reason</Label>
                    <Textarea
                      id="rejectReason"
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      rows={3}
                      required
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" variant="destructive" disabled={!rejectReason || !!actioningId}>
                      {actioningId ? "Rejecting…" : "Confirm Reject"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => { setRejectId(null); setRejectReason(""); }}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Instructions table */}
          <Card>
            <CardContent className="p-0">
              {instructions.length === 0 ? (
                <p className="px-6 py-8 text-center text-sm text-muted-foreground">
                  No payment instructions yet. Create one to get started.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Beneficiary</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Exec Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {instructions.map((instr) => (
                      <TableRow key={instr.id}>
                        <TableCell>
                          <div className="font-medium">{instr.beneficiaryName}</div>
                          <div className="text-xs text-muted-foreground">
                            {instr.beneficiaryAccountNumber}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm capitalize">
                          {instr.paymentMethod.replace(/_/g, " ")}
                        </TableCell>
                        <TableCell>
                          {instr.amountMinor} {instr.currencyCode}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {instr.requestedExecutionDate}
                        </TableCell>
                        <TableCell>
                          <Badge variant={INSTRUCTION_STATUS_VARIANTS[instr.status] ?? "outline"}>
                            {instr.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            {instr.status === "pending" && (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={actioningId === instr.id}
                                onClick={() => void handleSubmit(instr.id)}
                              >
                                {actioningId === instr.id ? "…" : "Submit"}
                              </Button>
                            )}
                            {instr.status === "processing" && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={!!actioningId}
                                  onClick={() => void handleApprove(instr.id)}
                                >
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  disabled={!!actioningId}
                                  onClick={() => { setRejectId(instr.id); setRejectReason(""); }}
                                >
                                  Reject
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

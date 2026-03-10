"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Input,
  Label,
} from "@afenda/ui";
import { applyPrepayment } from "@/lib/api-client";
import { toast } from "@afenda/ui";

interface PrepaymentApplyDialogProps {
  prepayment: {
    id: string;
    prepaymentNumber: string;
    balanceMinor: string;
    currencyCode: string;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function PrepaymentApplyDialog({
  prepayment,
  open,
  onOpenChange,
  onSuccess,
}: PrepaymentApplyDialogProps) {
  const [invoiceId, setInvoiceId] = useState("");
  const [amountMinor, setAmountMinor] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleApply() {
    const amount = BigInt(amountMinor);
    if (amount <= 0n) {
      toast.error("Amount must be positive");
      return;
    }
    setLoading(true);
    try {
      await applyPrepayment({
        idempotencyKey: crypto.randomUUID(),
        prepaymentId: prepayment.id,
        invoiceId,
        amountMinor: amount,
      });
      toast.success("Prepayment applied", {
        description: `${amountMinor} applied to invoice`,
      });
      onOpenChange(false);
      setInvoiceId("");
      setAmountMinor("");
      onSuccess?.();
    } catch (err) {
      toast.error("Apply failed", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setLoading(false);
    }
  }

  const canApply =
    invoiceId.trim() &&
    amountMinor &&
    BigInt(amountMinor) > 0n &&
    BigInt(amountMinor) <= BigInt(prepayment.balanceMinor);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Apply prepayment {prepayment.prepaymentNumber}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="invoiceId">Invoice ID</Label>
            <Input
              id="invoiceId"
              value={invoiceId}
              onChange={(e) => setInvoiceId(e.target.value)}
              placeholder="Invoice UUID"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="amountMinor">Amount (minor units, e.g. cents)</Label>
            <Input
              id="amountMinor"
              type="number"
              min="1"
              max={prepayment.balanceMinor}
              value={amountMinor}
              onChange={(e) => setAmountMinor(e.target.value)}
              placeholder="e.g. 10000 for 100.00"
            />
            <p className="text-xs text-muted-foreground">
              Available balance: {prepayment.balanceMinor} {prepayment.currencyCode}
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleApply} disabled={!canApply || loading}>
            {loading ? "Applying…" : "Apply"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

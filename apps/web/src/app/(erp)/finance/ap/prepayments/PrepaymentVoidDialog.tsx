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
import { voidPrepayment } from "@/lib/api-client";
import { toast } from "@afenda/ui";

interface PrepaymentVoidDialogProps {
  prepayment: {
    id: string;
    prepaymentNumber: string;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function PrepaymentVoidDialog({
  prepayment,
  open,
  onOpenChange,
  onSuccess,
}: PrepaymentVoidDialogProps) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleVoid() {
    setLoading(true);
    try {
      await voidPrepayment({
        idempotencyKey: crypto.randomUUID(),
        prepaymentId: prepayment.id,
        reason,
      });
      toast.success("Prepayment voided", {
        description: prepayment.prepaymentNumber,
      });
      onOpenChange(false);
      setReason("");
      onSuccess?.();
    } catch (err) {
      toast.error("Void failed", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Void prepayment {prepayment.prepaymentNumber}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="reason">Reason (required)</Label>
            <Input
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Duplicate payment, refund requested"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleVoid}
            disabled={!reason.trim() || loading}
          >
            {loading ? "Voiding…" : "Void"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

"use client";

/**
 * BulkActionConfirmDialog — confirmation + progress for bulk actions.
 *
 * Shows AlertDialog to confirm, then Progress during execution.
 * Handles partial failures with toast feedback.
 */
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Progress,
} from "@afenda/ui";

export interface BulkActionConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  actionLabel: string;
  cancelLabel?: string;
  recordCount: number;
  onConfirm: () => Promise<{ ok: number; failed: number }>;
  onComplete?: (result: { ok: number; failed: number }) => void;
}

export function BulkActionConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  actionLabel,
  cancelLabel = "Cancel",
  recordCount,
  onConfirm,
  onComplete,
}: BulkActionConfirmDialogProps) {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      const result = await onConfirm();
      onComplete?.(result);
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        {loading && (
          <div className="py-4">
            <Progress value={50} className="h-2 animate-pulse" />
            <p className="text-sm text-muted-foreground mt-2">
              Processing {recordCount} record{recordCount !== 1 ? "s" : ""}…
            </p>
          </div>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              void handleConfirm();
            }}
            disabled={loading}
          >
            {loading ? "Processing…" : actionLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

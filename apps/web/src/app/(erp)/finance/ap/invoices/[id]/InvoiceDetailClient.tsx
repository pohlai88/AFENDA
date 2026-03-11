"use client";

/**
 * Client-side interactive wrapper for the AP Invoice detail.
 *
 * Receives server-fetched invoice data + capabilities; handles form
 * submission, flow transitions, and action dispatching on the client.
 */

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { GeneratedForm, FlowStepper, ActionLauncher, formatMoney, toast } from "@afenda/ui";
import type { CapabilityResult } from "@afenda/contracts";
import {
  fetchInvoice,
  transitionInvoice,
  type InvoiceRow,
} from "@/lib/api-client";

interface InvoiceDetailClientProps {
  invoice: InvoiceRow;
  capabilities: CapabilityResult;
}

export default function InvoiceDetailClient({
  invoice: initialInvoice,
  capabilities,
}: InvoiceDetailClientProps) {
  const router = useRouter();
  const [record, setRecord] = useState(initialInvoice);
  const [submitting, setSubmitting] = useState(false);

  const reloadInvoice = useCallback(async () => {
    try {
      const body = await fetchInvoice(record.id);
      setRecord(body.data);
    } catch {
      // Non-fatal — the stale record remains visible
    }
  }, [record.id]);

  const handleSubmit = useCallback(
    async (values: Record<string, unknown>) => {
      setSubmitting(true);
      try {
        await transitionInvoice({
          transitionKey: "invoice.submit",
          invoiceId: record.id,
        });
        void reloadInvoice();
      } catch {
        toast.error("Submit failed");
      } finally {
        setSubmitting(false);
      }
    },
    [record.id, reloadInvoice],
  );

  const handleFlowTransition = useCallback(
    async (transitionKey: string) => {
      setSubmitting(true);
      try {
        const isSupportedTransition = [
          "invoice.submit",
          "invoice.approve",
          "invoice.reject",
          "invoice.void",
          "invoice.post",
          "invoice.markPaid",
        ].includes(transitionKey);

        if (!isSupportedTransition) {
          toast.error("Unsupported transition");
          return;
        }

        await transitionInvoice({
          transitionKey: transitionKey as
            | "invoice.submit"
            | "invoice.approve"
            | "invoice.reject"
            | "invoice.void"
            | "invoice.post"
            | "invoice.markPaid",
          invoiceId: record.id,
        });

        void reloadInvoice();
      } catch {
        toast.error("Transition failed");
      } finally {
        setSubmitting(false);
      }
    },
    [record.id, reloadInvoice],
  );

  const handleAction = useCallback(
    (actionKey: string, route?: string) => {
      if (route) {
        router.push(route);
      } else {
        void handleFlowTransition(actionKey);
      }
    },
    [handleFlowTransition, router],
  );

  const actionKeys = [
    "invoice.submit",
    "invoice.approve",
    "invoice.reject",
    "invoice.void",
    "invoice.post",
    "invoice.markPaid",
  ] as const;

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">
            Invoice {record.invoiceNumber}
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {record.status} — {formatMoney({ amountMinor: BigInt(record.amountMinor), currencyCode: record.currencyCode })}
          </p>
        </div>

        {/* ── Inline actions ─────────────────────────────────────────────── */}
        <div className="flex gap-2">
          {actionKeys.map(
            (actionKey) => (
              <ActionLauncher
                key={actionKey}
                entityKey="finance.ap_invoice"
                actionKey={actionKey}
                capabilities={capabilities}
                onAction={handleAction}
                variant={actionKey === "invoice.reject" || actionKey === "invoice.void" ? "destructive" : "default"}
                size="sm"
              />
            ),
          )}
        </div>
      </div>

      {/* ── Flow stepper ──────────────────────────────────────────────────── */}
      <FlowStepper
        entityKey="finance.ap_invoice"
        currentStatus={record.status}
        capabilities={capabilities}
        onTransition={handleFlowTransition}
      />

      {/* ── Form ──────────────────────────────────────────────────────────── */}
      <GeneratedForm
        entityKey="finance.ap_invoice"
        capabilities={capabilities}
        record={record as unknown as Record<string, unknown>}
        onSubmit={handleSubmit}
        onCancel={() => {
          router.push("/finance/ap/invoices");
        }}
        submitting={submitting}
      />
    </div>
  );
}

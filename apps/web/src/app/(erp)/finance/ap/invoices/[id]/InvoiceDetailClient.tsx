"use client";

/**
 * Client-side interactive wrapper for the AP Invoice detail.
 *
 * Receives server-fetched invoice data + capabilities; handles form
 * submission, flow transitions, and action dispatching on the client.
 */

import { useCallback, useState } from "react";
import { GeneratedForm, FlowStepper, ActionLauncher, formatMoney } from "@afenda/ui";
import type { CapabilityResult } from "@afenda/contracts";
import type { InvoiceRow } from "@/lib/api-client";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "x-org-id": "demo",
      "x-dev-user-email": "admin@demo.afenda",
      ...init?.headers,
    },
    cache: "no-store",
  });
}

interface InvoiceDetailClientProps {
  invoice: InvoiceRow;
  capabilities: CapabilityResult;
}

export default function InvoiceDetailClient({
  invoice: initialInvoice,
  capabilities,
}: InvoiceDetailClientProps) {
  const [record, setRecord] = useState(initialInvoice);
  const [submitting, setSubmitting] = useState(false);

  const reloadInvoice = useCallback(async () => {
    try {
      const res = await apiFetch(`/v1/invoices/${record.id}`);
      if (!res.ok) return;
      const body = await res.json();
      setRecord(body.data);
    } catch {
      // Non-fatal — the stale record remains visible
    }
  }, [record.id]);

  const handleSubmit = useCallback(
    async (values: Record<string, unknown>) => {
      setSubmitting(true);
      try {
        const res = await apiFetch("/v1/commands/submit-invoice", {
          method: "POST",
          body: JSON.stringify(values),
        });
        if (!res.ok) throw new Error(`API ${res.status}`);
        void reloadInvoice();
      } catch (err) {
        console.error("Submit failed:", err);
      } finally {
        setSubmitting(false);
      }
    },
    [reloadInvoice],
  );

  const handleFlowTransition = useCallback(
    async (transitionKey: string) => {
      setSubmitting(true);
      try {
        const TRANSITION_COMMANDS: Record<string, { endpoint: string; method: string }> = {
          submit: { endpoint: "/v1/commands/submit-invoice", method: "POST" },
          approve: { endpoint: "/v1/commands/approve-invoice", method: "POST" },
          reject: { endpoint: "/v1/commands/reject-invoice", method: "POST" },
          void: { endpoint: "/v1/commands/void-invoice", method: "POST" },
          post: { endpoint: "/v1/commands/post-to-gl", method: "POST" },
          markPaid: { endpoint: "/v1/commands/mark-paid", method: "POST" },
        };

        const cmd = TRANSITION_COMMANDS[transitionKey];
        if (!cmd) {
          console.warn(`No command mapping for transition: ${transitionKey}`);
          return;
        }

        const res = await apiFetch(cmd.endpoint, {
          method: cmd.method,
          body: JSON.stringify({ invoiceId: record.id }),
        });
        if (!res.ok) throw new Error(`API ${res.status}`);

        void reloadInvoice();
      } catch (err) {
        console.error(`Transition ${transitionKey} failed:`, err);
      } finally {
        setSubmitting(false);
      }
    },
    [record.id, reloadInvoice],
  );

  const handleAction = useCallback(
    (actionKey: string, route?: string) => {
      if (route) {
        window.location.href = route;
      } else {
        void handleFlowTransition(actionKey);
      }
    },
    [handleFlowTransition],
  );

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
          {["submit", "approve", "reject", "void", "post", "markPaid"].map(
            (actionKey) => (
              <ActionLauncher
                key={actionKey}
                entityKey="finance.ap_invoice"
                actionKey={actionKey}
                capabilities={capabilities}
                onAction={handleAction}
                variant={actionKey === "reject" || actionKey === "void" ? "destructive" : "default"}
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
          window.location.href = "/finance/ap/invoices";
        }}
        submitting={submitting}
      />
    </div>
  );
}

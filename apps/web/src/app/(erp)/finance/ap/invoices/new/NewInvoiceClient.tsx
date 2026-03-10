"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  GeneratedForm,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  toast,
} from "@afenda/ui";
import { CreateInvoiceCommandSchema } from "@afenda/contracts";
import type { CapabilityResult } from "@afenda/contracts";
import { createInvoice } from "@/lib/api-client";

const formSchema = CreateInvoiceCommandSchema.omit({ idempotencyKey: true });

interface NewInvoiceClientProps {
  capabilities: CapabilityResult;
}

export default function NewInvoiceClient({
  capabilities,
}: NewInvoiceClientProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = useCallback(
    async (values: Record<string, unknown>) => {
      setSubmitting(true);
      setErrors({});

      try {
        const idempotencyKey = crypto.randomUUID();
        const raw = values.amountMinor;
        const amountMinor =
          typeof raw === "bigint"
            ? raw
            : BigInt(
                typeof raw === "string" || typeof raw === "number"
                  ? raw
                  : Number(raw) || 0,
              );

        const result = await createInvoice({
          idempotencyKey,
          supplierId: values.supplierId as string,
          amountMinor,
          currencyCode: values.currencyCode as string,
          dueDate: (values.dueDate as string) || null,
          poReference: (values.poReference as string) || null,
        });

        toast.success(`Invoice ${result.data.invoiceNumber} created successfully.`);
        router.push(`/finance/ap/invoices/${result.data.id}`);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to create invoice";
        setErrors({ _form: message });
        toast.error(message);
      } finally {
        setSubmitting(false);
      }
    },
    [router],
  );

  const handleCancel = useCallback(() => {
    router.push("/finance/ap/invoices");
  }, [router]);

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/finance/ap/invoices">← Back to invoices</Link>
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>New Invoice</CardTitle>
        </CardHeader>
        <CardContent>
          {errors._form && (
            <p className="text-sm text-destructive mb-4">{errors._form}</p>
          )}
          <GeneratedForm
            entityKey="finance.ap_invoice"
            viewKey="create"
            capabilities={capabilities}
            commandSchema={formSchema}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            submitting={submitting}
            errors={errors._form ? { _form: errors._form } : undefined}
          />
        </CardContent>
      </Card>
    </div>
  );
}

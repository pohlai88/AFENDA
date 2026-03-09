import { notFound } from "next/navigation";
import { formatMoney } from "@afenda/ui";
import { fetchInvoice } from "@/lib/api-client";
import { PrintOnMount } from "@/components/PrintOnMount";

/** Print-optimized AP Invoice detail — A4/Letter layout, no shell chrome. */
export default async function InvoiceDetailPrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let invoice;
  try {
    const res = await fetchInvoice(id);
    invoice = res.data;
  } catch {
    notFound();
  }

  const amount = formatMoney({
    currencyCode: invoice.currencyCode,
    amountMinor: BigInt(invoice.amountMinor),
  });
  const generatedAt = new Date().toISOString().slice(0, 19).replace("T", " ");

  return (
    <div className="min-h-screen bg-white p-6 print:p-4">
      <PrintOnMount />
      <div className="max-w-2xl">
        <h1 className="text-xl font-bold">Invoice {invoice.invoiceNumber}</h1>
        <p className="text-sm text-muted-foreground mt-1">Generated: {generatedAt}</p>

        <dl className="mt-6 grid grid-cols-[auto_1fr] gap-x-4 gap-y-3 text-sm">
          <dt className="font-medium text-muted-foreground">Number</dt>
          <dd>{invoice.invoiceNumber}</dd>

          <dt className="font-medium text-muted-foreground">Status</dt>
          <dd>{invoice.status}</dd>

          <dt className="font-medium text-muted-foreground">Amount</dt>
          <dd>{amount}</dd>

          <dt className="font-medium text-muted-foreground">Due Date</dt>
          <dd>{invoice.dueDate ?? "—"}</dd>

          <dt className="font-medium text-muted-foreground">Supplier ID</dt>
          <dd className="font-mono text-xs">{invoice.supplierId}</dd>

          <dt className="font-medium text-muted-foreground">Submitted</dt>
          <dd>{invoice.submittedAt ?? "—"}</dd>

          <dt className="font-medium text-muted-foreground">PO Reference</dt>
          <dd>{invoice.poReference ?? "—"}</dd>
        </dl>
      </div>
    </div>
  );
}

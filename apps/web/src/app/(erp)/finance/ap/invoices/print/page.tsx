import { fetchInvoices } from "@/lib/api-client";
import { getExportColumns, transformRowForExport } from "@/lib/export-utils";
import { PrintOnMount } from "@/components/PrintOnMount";

const ENTITY_KEY = "finance.ap_invoice";
const PRINT_LIMIT = 1000;

/** Print-optimized AP Invoices list — A4/Letter layout, no shell chrome. */
export default async function InvoiceListPrintPage() {
  const res = await fetchInvoices({ limit: PRINT_LIMIT });
  const columns = getExportColumns(ENTITY_KEY);
  const headers = columns.map((c) => c.label);
  const rows = res.data.map((r) =>
    transformRowForExport(r as unknown as Record<string, unknown>, columns),
  );
  const generatedAt = new Date().toISOString().slice(0, 19).replace("T", " ");

  return (
    <div className="min-h-screen bg-background p-6 print:p-4">
      <PrintOnMount />
      <div className="mb-6">
        <h1 className="text-xl font-bold">AP Invoices</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Generated: {generatedAt} · {res.data.length} record{res.data.length !== 1 ? "s" : ""}
        </p>
      </div>
      {rows.length === 0 ? (
        <div className="rounded-md border border-foreground/15 p-4 text-sm text-muted-foreground">
          No invoices found for this export.
        </div>
      ) : null}
      {rows.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b-2 border-foreground/20">
                {headers.map((h) => (
                  <th key={h} className="text-left py-2 px-3 font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className="border-b border-foreground/10">
                  {row.map((cell, j) => (
                    <td key={j} className="py-1.5 px-3">
                      {String(cell ?? "")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}

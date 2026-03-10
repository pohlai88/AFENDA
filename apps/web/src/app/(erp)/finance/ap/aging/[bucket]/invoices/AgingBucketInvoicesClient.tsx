"use client";

import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@afenda/ui";

interface InvoiceRow {
  id: string;
  invoiceNumber: string;
  supplierId: string;
  invoiceDate: string;
  dueDate: string;
  amountMinor: string;
  balanceMinor: string;
  daysOverdue: number;
  status: string;
}

function formatMoney(minor: string): string {
  const n = Number(minor) / 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(n);
}

interface AgingBucketInvoicesClientProps {
  initialInvoices: InvoiceRow[];
  bucket: "current" | "1-30" | "31-60" | "61-90" | "90+";
}

export function AgingBucketInvoicesClient({
  initialInvoices,
  bucket,
}: AgingBucketInvoicesClientProps) {
  if (initialInvoices.length === 0) {
    return (
      <p className="text-sm text-muted-foreground mt-4">
        No invoices in this aging bucket.
      </p>
    );
  }

  return (
    <div className="mt-6 rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Invoice</TableHead>
            <TableHead>Due Date</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead className="text-right">Days Overdue</TableHead>
            <TableHead>Status</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {initialInvoices.map((inv) => (
            <TableRow key={inv.id}>
              <TableCell>
                <Link
                  href={`/finance/ap/invoices/${inv.id}`}
                  className="font-medium text-primary hover:underline"
                >
                  {inv.invoiceNumber}
                </Link>
              </TableCell>
              <TableCell>{inv.dueDate}</TableCell>
              <TableCell className="text-right">
                {formatMoney(inv.balanceMinor)}
              </TableCell>
              <TableCell className="text-right">{inv.daysOverdue}</TableCell>
              <TableCell>{inv.status}</TableCell>
              <TableCell>
                <Link
                  href={`/finance/ap/invoices/${inv.id}`}
                  className="text-sm text-primary hover:underline"
                >
                  View
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

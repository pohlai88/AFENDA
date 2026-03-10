"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Badge,
  Card,
  CardContent,
  Button,
} from "@afenda/ui";
import { Download } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { fetchPaymentRuns } from "@/lib/api-client";
import { PaymentRunExportDialog } from "./PaymentRunExportDialog";

interface PaymentRun {
  id: string;
  runNumber: string;
  description: string | null;
  paymentMethod: string;
  currencyCode: string;
  paymentDate: string;
  totalAmountMinor: string;
  totalDiscountMinor: string;
  itemCount: number;
  status: string;
  createdAt: string;
}

export function PaymentRunListClient() {
  const [runs, setRuns] = useState<PaymentRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportRun, setExportRun] = useState<PaymentRun | null>(null);

  useEffect(() => {
    fetchPaymentRuns()
      .then((res) => setRuns(res.data || []))
      .catch(() => setRuns([]))
      .finally(() => setLoading(false));
  }, []);

  function getStatusBadge(status: string) {
    const variants: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
      DRAFT: "outline",
      APPROVED: "secondary",
      EXECUTING: "default",
      EXECUTED: "default",
      CANCELLED: "destructive",
      REVERSED: "destructive",
    };
    return <Badge variant={variants[status] || "default"}>{status}</Badge>;
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-sm text-muted-foreground">Loading payment runs...</p>
        </CardContent>
      </Card>
    );
  }

  if (runs.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-sm text-muted-foreground">
            No payment runs yet. Create one to batch process AP invoices for payment.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Run Number</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Payment Method</TableHead>
              <TableHead>Payment Date</TableHead>
              <TableHead className="text-right">Items</TableHead>
              <TableHead className="text-right">Total Amount</TableHead>
              <TableHead className="text-right">Discount Taken</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {runs.map((run) => (
              <TableRow key={run.id}>
                <TableCell className="font-medium">
                  <Link
                    href={`/finance/ap/payment-runs/${run.id}`}
                    className="text-primary hover:underline"
                  >
                    {run.runNumber}
                  </Link>
                </TableCell>
                <TableCell>{run.description || "—"}</TableCell>
                <TableCell>{run.paymentMethod}</TableCell>
                <TableCell>{run.paymentDate}</TableCell>
                <TableCell className="text-right">{run.itemCount}</TableCell>
                <TableCell className="text-right">
                  {formatCurrency(BigInt(run.totalAmountMinor), run.currencyCode)}
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(BigInt(run.totalDiscountMinor), run.currencyCode)}
                </TableCell>
                <TableCell>{getStatusBadge(run.status)}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {new Date(run.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  {(run.status === "APPROVED" || run.status === "EXECUTED") && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setExportRun(run)}
                      aria-label={`Export payment run ${run.runNumber}`}
                    >
                      <Download className="size-4" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
      {exportRun && (
        <PaymentRunExportDialog
          paymentRunId={exportRun.id}
          runNumber={exportRun.runNumber}
          open={!!exportRun}
          onOpenChange={(open) => !open && setExportRun(null)}
        />
      )}
    </Card>
  );
}

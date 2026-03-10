"use client";

import { useState, useEffect, useCallback } from "react";
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
import { Banknote, XCircle } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { fetchPrepayments } from "@/lib/api-client";
import { PrepaymentApplyDialog } from "./PrepaymentApplyDialog";
import { PrepaymentVoidDialog } from "./PrepaymentVoidDialog";

interface Prepayment {
  id: string;
  prepaymentNumber: string;
  description: string | null;
  supplierId: string;
  currencyCode: string;
  originalAmountMinor: string;
  balanceMinor: string;
  paymentDate: string;
  paymentReference: string;
  status: string;
  createdAt: string;
}

export function PrepaymentListClient() {
  const [prepayments, setPrepayments] = useState<Prepayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [applyPrep, setApplyPrep] = useState<Prepayment | null>(null);
  const [voidPrep, setVoidPrep] = useState<Prepayment | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetchPrepayments();
      setPrepayments(res.data || []);
    } catch {
      setPrepayments([]);
    }
  }, []);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  function getStatusBadge(status: string) {
    const variants: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
      PENDING: "outline",
      AVAILABLE: "default",
      DEPLETED: "secondary",
      VOIDED: "destructive",
    };
    return <Badge variant={variants[status] || "default"}>{status}</Badge>;
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-sm text-muted-foreground">Loading prepayments...</p>
        </CardContent>
      </Card>
    );
  }

  if (prepayments.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-sm text-muted-foreground">
            No prepayments yet. Record advance payments to suppliers here.
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
              <TableHead>Prepayment Number</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Payment Date</TableHead>
              <TableHead>Payment Reference</TableHead>
              <TableHead className="text-right">Original Amount</TableHead>
              <TableHead className="text-right">Balance</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {prepayments.map((prep) => (
              <TableRow key={prep.id}>
                <TableCell className="font-medium">
                  <Link
                    href={`/finance/ap/prepayments/${prep.id}`}
                    className="text-primary hover:underline"
                  >
                    {prep.prepaymentNumber}
                  </Link>
                </TableCell>
                <TableCell>{prep.description || "—"}</TableCell>
                <TableCell>{prep.paymentDate}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {prep.paymentReference}
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(BigInt(prep.originalAmountMinor), prep.currencyCode)}
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(BigInt(prep.balanceMinor), prep.currencyCode)}
                </TableCell>
                <TableCell>{getStatusBadge(prep.status)}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {new Date(prep.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  {(prep.status === "PENDING" || prep.status === "AVAILABLE") && (
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setApplyPrep(prep)}
                        aria-label={`Apply prepayment ${prep.prepaymentNumber}`}
                      >
                        <Banknote className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setVoidPrep(prep)}
                        aria-label={`Void prepayment ${prep.prepaymentNumber}`}
                      >
                        <XCircle className="size-4" />
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
      {applyPrep && (
        <PrepaymentApplyDialog
          prepayment={applyPrep}
          open={!!applyPrep}
          onOpenChange={(open) => !open && setApplyPrep(null)}
          onSuccess={refresh}
        />
      )}
      {voidPrep && (
        <PrepaymentVoidDialog
          prepayment={voidPrep}
          open={!!voidPrep}
          onOpenChange={(open) => !open && setVoidPrep(null)}
          onSuccess={refresh}
        />
      )}
    </Card>
  );
}

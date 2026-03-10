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
} from "@afenda/ui";
import { formatCurrency } from "@/lib/format";

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

  useEffect(() => {
    async function fetchPrepayments() {
      try {
        const res = await fetch("/api/v1/prepayments");
        if (!res.ok) throw new Error("Failed to fetch prepayments");
        const data = await res.json();
        setPrepayments(data.data || []);
      } catch (error) {
        console.error("Error fetching prepayments:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchPrepayments();
  }, []);

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
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { TableCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils/currency";
import { getQuoteStatusConfig } from "@/lib/quotes/status";
import type { QuoteListItem } from "./types";

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("vi-VN");
}

export function QuoteTableRow({ quote }: { quote: QuoteListItem }) {
  const router = useRouter();
  const statusConfig = getQuoteStatusConfig(quote.status);

  return (
    <TableRow className="cursor-pointer" onClick={() => router.push(`/quotes/${quote.id}`)}>
      <TableCell className="font-medium">{quote.code}</TableCell>
      <TableCell>{quote.customer_name_snapshot}</TableCell>
      <TableCell>{formatCurrency(quote.total_value)}</TableCell>
      <TableCell>{formatDate(quote.valid_until)}</TableCell>
      <TableCell>
        <Badge variant="outline" className={statusConfig.className}>
          {statusConfig.label}
        </Badge>
      </TableCell>
    </TableRow>
  );
}

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils/currency";
import { getQuoteStatusConfig } from "@/lib/quotes/status";
import type { QuoteListItem } from "./types";

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("vi-VN");
}

export function QuoteCard({ quote }: { quote: QuoteListItem }) {
  const statusConfig = getQuoteStatusConfig(quote.status);

  return (
    <Link href={`/quotes/${quote.id}`}>
      <Card className="transition-colors hover:bg-muted/50">
        <CardContent className="flex flex-col gap-2 p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-medium">{quote.customer_name_snapshot}</p>
              <p className="text-xs text-muted-foreground">{quote.code}</p>
            </div>
            <Badge variant="outline" className={statusConfig.className}>
              {statusConfig.label}
            </Badge>
          </div>
          <div className="flex flex-col gap-1 text-sm text-muted-foreground">
            <span>Giá trị: {formatCurrency(quote.total_value)}</span>
            <span>Hạn báo giá: {formatDate(quote.valid_until)}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

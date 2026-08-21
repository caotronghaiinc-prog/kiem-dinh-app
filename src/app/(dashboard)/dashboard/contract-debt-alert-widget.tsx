import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils/currency";
import type { ContractDebtAlertRow } from "./types";

export function ContractDebtAlertWidget({ contracts }: { contracts: ContractDebtAlertRow[] }) {
  // Không có hợp đồng nào còn nợ -- ẩn hẳn widget, không chiếm chỗ trên
  // dashboard (mirror EditRequestAlertWidget).
  if (contracts.length === 0) return null;

  return (
    <Card data-testid="widget-contract-debt-alert">
      <CardHeader>
        <CardTitle>Hợp đồng còn công nợ</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <ul className="flex flex-col divide-y" data-testid="contract-debt-list">
          {contracts.map((c) => (
            <li key={c.id}>
              <Link
                href={`/contracts/${c.id}`}
                className="-mx-2 flex items-center justify-between gap-3 rounded px-2 py-2 hover:bg-muted/50"
                data-testid="contract-debt-row"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {c.code} · {c.contract_no}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{c.customer_name || "—"}</p>
                </div>
                <span className="shrink-0 text-sm font-medium text-red-600">
                  {formatCurrency(c.debt)}
                </span>
              </Link>
            </li>
          ))}
        </ul>

        <Link href="/contracts" className="w-fit text-sm text-primary hover:underline">
          Xem tất cả →
        </Link>
      </CardContent>
    </Card>
  );
}

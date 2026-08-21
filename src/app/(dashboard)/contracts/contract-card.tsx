import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils/currency";
import { getContractStatusConfig } from "@/lib/contracts/status";
import type { ContractListItem } from "./types";

export function ContractCard({ contract }: { contract: ContractListItem }) {
  const statusConfig = getContractStatusConfig(contract.status);
  const debt = contract.total_value - contract.paid_total;

  return (
    <Link href={`/contracts/${contract.id}`}>
      <Card className="transition-colors hover:bg-muted/50">
        <CardContent className="flex flex-col gap-2 p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-medium">{contract.contract_no}</p>
              <p className="text-xs text-muted-foreground">{contract.code}</p>
            </div>
            <Badge variant="outline" className={statusConfig.className}>
              {statusConfig.label}
            </Badge>
          </div>
          <div className="flex flex-col gap-1 text-sm text-muted-foreground">
            <span>KH: {contract.customer?.company_name || "—"}</span>
            <span>Giá trị: {formatCurrency(contract.total_value)}</span>
            <span className={debt > 0 ? "text-red-600" : "text-green-600"}>
              Còn nợ: {formatCurrency(debt)}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

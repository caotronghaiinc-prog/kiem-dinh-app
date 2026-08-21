"use client";

import { useRouter } from "next/navigation";
import { TableCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils/currency";
import { getContractStatusConfig } from "@/lib/contracts/status";
import type { ContractListItem } from "./types";

export function ContractTableRow({ contract }: { contract: ContractListItem }) {
  const router = useRouter();
  const statusConfig = getContractStatusConfig(contract.status);
  const debt = contract.total_value - contract.paid_total;

  return (
    <TableRow className="cursor-pointer" onClick={() => router.push(`/contracts/${contract.id}`)}>
      <TableCell className="font-medium">{contract.code}</TableCell>
      <TableCell>{contract.contract_no}</TableCell>
      <TableCell>{contract.customer?.company_name || "—"}</TableCell>
      <TableCell>{formatCurrency(contract.total_value)}</TableCell>
      <TableCell className={debt > 0 ? "text-red-600" : "text-green-600"}>
        {formatCurrency(debt)}
      </TableCell>
      <TableCell>
        <Badge variant="outline" className={statusConfig.className}>
          {statusConfig.label}
        </Badge>
      </TableCell>
    </TableRow>
  );
}

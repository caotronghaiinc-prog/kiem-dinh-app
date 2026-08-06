"use client";

import { useRouter } from "next/navigation";
import { TableCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CUSTOMER_STATUS_CONFIG } from "@/lib/customers/status";
import { getEquipmentCount, type CustomerListItem } from "@/lib/types/customer";

export function CustomerTableRow({ customer }: { customer: CustomerListItem }) {
  const router = useRouter();
  const status = CUSTOMER_STATUS_CONFIG[customer.status] ?? CUSTOMER_STATUS_CONFIG.potential;

  return (
    <TableRow
      className="cursor-pointer"
      onClick={() => router.push(`/customers/${customer.id}`)}
    >
      <TableCell className="font-medium">{customer.code}</TableCell>
      <TableCell>{customer.company_name}</TableCell>
      <TableCell>{customer.contact_name || "—"}</TableCell>
      <TableCell>{customer.phone || "—"}</TableCell>
      <TableCell className="text-center">{getEquipmentCount(customer)}</TableCell>
      <TableCell>
        <Badge variant="outline" className={status.className}>
          {status.label}
        </Badge>
      </TableCell>
    </TableRow>
  );
}

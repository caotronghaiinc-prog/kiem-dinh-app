"use client";

import { useRouter } from "next/navigation";
import { TableCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ROLE_LABELS } from "@/lib/auth/role-labels";
import { ExpiryIndicator } from "@/components/equipment/expiry-indicator";
import type { EmployeeListItem } from "./types";

export function EmployeeTableRow({ employee }: { employee: EmployeeListItem }) {
  const router = useRouter();

  return (
    <TableRow
      className="cursor-pointer"
      onClick={() => router.push(`/employees/${employee.id}`)}
    >
      <TableCell className="font-medium">{employee.full_name || "—"}</TableCell>
      <TableCell>{employee.email}</TableCell>
      <TableCell>{ROLE_LABELS[employee.role] ?? employee.role}</TableCell>
      <TableCell>{employee.job_title || "—"}</TableCell>
      <TableCell>{employee.phone || "—"}</TableCell>
      <TableCell>
        {employee.active ? (
          <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700">
            Đang làm việc
          </Badge>
        ) : (
          <Badge variant="outline" className="border-gray-200 bg-gray-50 text-gray-600">
            Ngừng
          </Badge>
        )}
      </TableCell>
      <TableCell>
        {employee.latest_labor_contract_end_date ? (
          <ExpiryIndicator expiryDate={employee.latest_labor_contract_end_date} />
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>
    </TableRow>
  );
}

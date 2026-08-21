import Link from "next/link";
import { TableCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ACTION_CONFIG, getRecordInfo, getTableLabel } from "./labels";
import { AuditLogDetailDialog } from "./audit-log-detail-dialog";
import type { AuditLogRow as AuditLogRowType } from "./types";

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("vi-VN");
}

export function AuditLogTableRow({ log }: { log: AuditLogRowType }) {
  const actionConfig = ACTION_CONFIG[log.action];
  const record = getRecordInfo(log.table_name, log.new_data ?? log.old_data);

  return (
    <TableRow>
      <TableCell>{formatDateTime(log.changed_at)}</TableCell>
      <TableCell>{getTableLabel(log.table_name)}</TableCell>
      <TableCell>
        <Badge variant="outline" className={actionConfig.className}>
          {actionConfig.label}
        </Badge>
      </TableCell>
      <TableCell>{log.changed_by?.full_name || "Hệ thống"}</TableCell>
      <TableCell>
        <div className="flex flex-col gap-1">
          <span>{record.label}</span>
          {record.equipmentId && (
            <Link
              href={`/equipment/${record.equipmentId}`}
              className="text-xs text-primary hover:underline"
            >
              Xem thiết bị
            </Link>
          )}
          {record.contractId && (
            <Link
              href={`/contracts/${record.contractId}`}
              className="text-xs text-primary hover:underline"
            >
              Xem hợp đồng
            </Link>
          )}
        </div>
      </TableCell>
      <TableCell>
        <AuditLogDetailDialog action={log.action} oldData={log.old_data} newData={log.new_data} />
      </TableCell>
    </TableRow>
  );
}

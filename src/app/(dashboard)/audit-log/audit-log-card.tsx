import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ACTION_CONFIG, getRecordInfo, getTableLabel } from "./labels";
import { AuditLogDetailDialog } from "./audit-log-detail-dialog";
import type { AuditLogRow as AuditLogRowType } from "./types";

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("vi-VN");
}

export function AuditLogCard({ log }: { log: AuditLogRowType }) {
  const actionConfig = ACTION_CONFIG[log.action];
  const record = getRecordInfo(log.table_name, log.new_data ?? log.old_data);

  return (
    <Card>
      <CardContent className="flex flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <p className="font-medium">{getTableLabel(log.table_name)}</p>
          <Badge variant="outline" className={actionConfig.className}>
            {actionConfig.label}
          </Badge>
        </div>
        <div className="flex flex-col gap-1 text-sm text-muted-foreground">
          <span>{formatDateTime(log.changed_at)}</span>
          <span>Người thực hiện: {log.changed_by?.full_name || "Hệ thống"}</span>
          <span>{record.label}</span>
          {record.equipmentId && (
            <Link href={`/equipment/${record.equipmentId}`} className="text-primary hover:underline">
              Xem thiết bị
            </Link>
          )}
        </div>
        <AuditLogDetailDialog action={log.action} oldData={log.old_data} newData={log.new_data} />
      </CardContent>
    </Card>
  );
}

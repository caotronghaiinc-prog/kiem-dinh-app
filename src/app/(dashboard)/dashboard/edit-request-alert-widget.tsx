import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { EditRequestAlertRow } from "./types";

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("vi-VN");
}

export function EditRequestAlertWidget({
  requests,
  totalCount,
}: {
  requests: EditRequestAlertRow[];
  totalCount: number;
}) {
  // Không có yêu cầu nào đang chờ -- ẩn hẳn widget, không chiếm chỗ trên
  // dashboard (xem ghi chú EditRequestAlertRow ở types.ts).
  if (totalCount === 0) return null;

  return (
    <Card data-testid="widget-edit-request-alert">
      <CardHeader>
        <CardTitle>
          Yêu cầu xin sửa đang chờ duyệt{" "}
          <span className="text-sm font-normal text-muted-foreground">({totalCount})</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <ul className="flex flex-col divide-y" data-testid="edit-request-list">
          {requests.map((r) => (
            <li key={r.id}>
              <Link
                href={`/equipment/${r.equipment_id}`}
                className="-mx-2 flex flex-col gap-1 rounded px-2 py-2 hover:bg-muted/50"
                data-testid="edit-request-row"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-medium">
                    {r.equipment_code} · {r.equipment_name}
                  </p>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatDateTime(r.created_at)}
                  </span>
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  {r.requested_by_name || "—"}: {r.reason}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

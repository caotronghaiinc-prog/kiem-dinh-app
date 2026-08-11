import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  EXPIRY_COLOR_DOT_CLASS,
  EXPIRY_COLOR_TEXT_CLASS,
  getExpiryStatus,
  type ExpiryColor,
} from "@/lib/utils/expiry-status";
import type { EquipmentAlertRow } from "./types";

const COLOR_LABELS: Record<ExpiryColor, string> = {
  red: "Đỏ (quá hạn / ≤30 ngày)",
  yellow: "Vàng (31-60 ngày)",
  green: "Xanh (còn nhiều thời gian)",
};

export function ExpiryAlertWidget({ equipment }: { equipment: EquipmentAlertRow[] }) {
  const counts: Record<ExpiryColor, number> = { red: 0, yellow: 0, green: 0 };
  for (const item of equipment) {
    counts[getExpiryStatus(item.expiry_date).color] += 1;
  }

  const nearest = equipment
    .filter((item): item is EquipmentAlertRow & { expiry_date: string } => Boolean(item.expiry_date))
    .sort((a, b) => a.expiry_date.localeCompare(b.expiry_date))
    .slice(0, 5);

  return (
    <Card data-testid="widget-expiry-alert">
      <CardHeader>
        <CardTitle>Cảnh báo hạn kiểm định</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid grid-cols-3 gap-2">
          {(["red", "yellow", "green"] as const).map((color) => (
            <div key={color} className="flex flex-col items-center gap-1 rounded-md border p-3">
              <span className={`h-2.5 w-2.5 rounded-full ${EXPIRY_COLOR_DOT_CLASS[color]}`} />
              <span
                className={`text-2xl font-bold ${EXPIRY_COLOR_TEXT_CLASS[color]}`}
                data-testid={`expiry-count-${color}`}
              >
                {counts[color]}
              </span>
              <span className="text-center text-xs text-muted-foreground">
                {COLOR_LABELS[color]}
              </span>
            </div>
          ))}
        </div>

        {nearest.length === 0 ? (
          <div
            className="flex flex-col items-center gap-2 py-6 text-center text-muted-foreground"
            data-testid="expiry-nearest-empty"
          >
            <AlertTriangle className="h-6 w-6" />
            <p className="text-sm">Chưa có thiết bị nào có hạn kiểm định.</p>
          </div>
        ) : (
          <ul className="flex flex-col divide-y" data-testid="expiry-nearest-list">
            {nearest.map((item) => {
              const status = getExpiryStatus(item.expiry_date);
              return (
                <li key={item.id}>
                  <Link
                    href={`/equipment/${item.id}`}
                    className="-mx-2 flex items-center justify-between gap-3 rounded px-2 py-2 hover:bg-muted/50"
                    data-testid="expiry-nearest-row"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {item.code} · {item.name}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {item.customer?.company_name || "—"}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 text-xs font-medium ${EXPIRY_COLOR_TEXT_CLASS[status.color]}`}
                    >
                      {status.label}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        <Link href="/equipment" className="w-fit text-sm text-primary hover:underline">
          Xem tất cả →
        </Link>
      </CardContent>
    </Card>
  );
}

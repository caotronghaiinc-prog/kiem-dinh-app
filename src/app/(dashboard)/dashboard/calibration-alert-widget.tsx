import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  EXPIRY_COLOR_DOT_CLASS,
  EXPIRY_COLOR_TEXT_CLASS,
  getExpiryStatus,
  type ExpiryColor,
} from "@/lib/utils/expiry-status";
import type { ToolAlertRow } from "./types";

const COLOR_LABELS: Record<ExpiryColor, string> = {
  red: "Đỏ (quá hạn / ≤30 ngày)",
  yellow: "Vàng (31-60 ngày)",
  green: "Xanh (còn nhiều thời gian)",
};

export function CalibrationAlertWidget({ tools }: { tools: ToolAlertRow[] }) {
  const counts: Record<ExpiryColor, number> = { red: 0, yellow: 0, green: 0 };
  for (const item of tools) {
    counts[getExpiryStatus(item.calibration_due_date).color] += 1;
  }

  const nearest = tools
    .filter((item): item is ToolAlertRow & { calibration_due_date: string } =>
      Boolean(item.calibration_due_date)
    )
    .sort((a, b) => a.calibration_due_date.localeCompare(b.calibration_due_date))
    .slice(0, 5);

  return (
    <Card data-testid="widget-calibration-alert">
      <CardHeader>
        <CardTitle>Cảnh báo hạn hiệu chuẩn dụng cụ đo</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid grid-cols-3 gap-2">
          {(["red", "yellow", "green"] as const).map((color) => (
            <div key={color} className="flex flex-col items-center gap-1 rounded-md border p-3">
              <span className={`h-2.5 w-2.5 rounded-full ${EXPIRY_COLOR_DOT_CLASS[color]}`} />
              <span
                className={`text-2xl font-bold ${EXPIRY_COLOR_TEXT_CLASS[color]}`}
                data-testid={`calibration-count-${color}`}
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
            data-testid="calibration-nearest-empty"
          >
            <AlertTriangle className="h-6 w-6" />
            <p className="text-sm">Chưa có dụng cụ nào có hạn hiệu chuẩn.</p>
          </div>
        ) : (
          <ul className="flex flex-col divide-y" data-testid="calibration-nearest-list">
            {nearest.map((item) => {
              const status = getExpiryStatus(item.calibration_due_date);
              return (
                <li key={item.id}>
                  <Link
                    href={`/tools/${item.id}`}
                    className="-mx-2 flex items-center justify-between gap-3 rounded px-2 py-2 hover:bg-muted/50"
                    data-testid="calibration-nearest-row"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {item.code} · {item.name}
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

        <Link href="/tools" className="w-fit text-sm text-primary hover:underline">
          Xem tất cả →
        </Link>
      </CardContent>
    </Card>
  );
}

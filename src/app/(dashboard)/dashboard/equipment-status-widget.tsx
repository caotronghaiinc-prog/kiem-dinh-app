import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface StatusBar {
  key: string;
  label: string;
  count: number;
  barClass: string;
}

export function EquipmentStatusWidget({
  valid,
  expiringSoon,
  expired,
  inactive,
}: {
  valid: number;
  expiringSoon: number;
  expired: number;
  inactive: number;
}) {
  const total = valid + expiringSoon + expired + inactive;

  const bars: StatusBar[] = [
    { key: "valid", label: "Còn hạn", count: valid, barClass: "bg-green-500" },
    { key: "expiring-soon", label: "Sắp hết hạn", count: expiringSoon, barClass: "bg-yellow-500" },
    { key: "expired", label: "Quá hạn", count: expired, barClass: "bg-red-500" },
    { key: "inactive", label: "Ngừng sử dụng", count: inactive, barClass: "bg-gray-400" },
  ];

  return (
    <Card data-testid="widget-equipment-status">
      <CardHeader>
        <CardTitle>Thiết bị theo trạng thái</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {total === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground" data-testid="equipment-status-empty">
            Chưa có thiết bị nào.
          </p>
        ) : (
          bars.map((bar) => (
            <div key={bar.key} className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-sm">
                <span>{bar.label}</span>
                <span className="font-medium" data-testid={`equipment-status-count-${bar.key}`}>
                  {bar.count}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full ${bar.barClass}`}
                  style={{ width: `${total > 0 ? (bar.count / total) * 100 : 0}%` }}
                />
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

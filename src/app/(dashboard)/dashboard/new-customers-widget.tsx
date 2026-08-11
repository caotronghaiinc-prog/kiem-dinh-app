import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function NewCustomersWidget({
  thisMonth,
  lastMonth,
}: {
  thisMonth: number;
  lastMonth: number;
}) {
  return (
    <Card data-testid="widget-new-customers">
      <CardHeader>
        <CardTitle>Khách hàng mới</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <span className="text-3xl font-bold" data-testid="new-customers-this-month">
          {thisMonth}
        </span>
        <span className="text-sm text-muted-foreground">khách hàng mới tháng này</span>
        <span className="text-xs text-muted-foreground">
          Tháng trước: <span data-testid="new-customers-last-month">{lastMonth}</span> khách hàng
        </span>
        <Link href="/customers" className="mt-2 w-fit text-sm text-primary hover:underline">
          Xem danh sách →
        </Link>
      </CardContent>
    </Card>
  );
}

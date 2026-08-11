import { ClipboardCheck } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { INSPECTION_RESULT_CONFIG, type InspectionResult } from "@/lib/inspection/result";

const RESULT_TEXT_CLASS: Record<InspectionResult, string> = {
  pass: "text-green-700",
  fail: "text-red-700",
  pending: "text-yellow-700",
};

export function InspectionStatsWidget({
  pass,
  fail,
  pending,
  monthLabel,
}: {
  pass: number;
  fail: number;
  pending: number;
  monthLabel: string;
}) {
  const total = pass + fail + pending;

  return (
    <Card data-testid="widget-inspection-stats">
      <CardHeader>
        <CardTitle>Thống kê kiểm định</CardTitle>
        <CardDescription>Tháng {monthLabel}</CardDescription>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <div
            className="flex flex-col items-center gap-2 py-6 text-center text-muted-foreground"
            data-testid="inspection-stats-empty"
          >
            <ClipboardCheck className="h-6 w-6" />
            <p className="text-sm">Chưa có bản ghi kiểm định nào trong tháng này.</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {(["pass", "fail", "pending"] as const).map((key) => (
              <div key={key} className="flex flex-col items-center gap-1 rounded-md border p-3">
                <span
                  className={`text-2xl font-bold ${RESULT_TEXT_CLASS[key]}`}
                  data-testid={`inspection-count-${key}`}
                >
                  {key === "pass" ? pass : key === "fail" ? fail : pending}
                </span>
                <span className="text-center text-xs text-muted-foreground">
                  {INSPECTION_RESULT_CONFIG[key].label}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

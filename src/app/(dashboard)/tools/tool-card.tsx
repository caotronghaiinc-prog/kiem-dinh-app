import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  EXPIRY_COLOR_DOT_CLASS,
  EXPIRY_COLOR_TEXT_CLASS,
  getExpiryStatus,
} from "@/lib/utils/expiry-status";
import type { ToolListItem } from "./types";

export function ToolCard({ tool, canEdit }: { tool: ToolListItem; canEdit: boolean }) {
  const calibrationStatus = tool.calibration_not_applicable
    ? null
    : getExpiryStatus(tool.calibration_due_date);

  return (
    <Card className="transition-colors hover:bg-muted/50">
      <CardContent className="flex items-start justify-between gap-3 p-4">
        <Link href={`/tools/${tool.id}`} className="min-w-0 flex-1">
          <div className="flex flex-col gap-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium">{tool.name}</p>
                <p className="text-xs text-muted-foreground">{tool.code}</p>
              </div>
              {tool.activeLoan ? (
                <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
                  Đang mượn
                </Badge>
              ) : (
                <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700">
                  Sẵn có
                </Badge>
              )}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span>QL: {tool.custodian?.full_name || "—"}</span>
              {tool.activeLoan && (
                <span>
                  Mượn: {tool.activeLoan.borrower?.full_name || "—"}
                  {tool.activeLoan.work_location ? ` (${tool.activeLoan.work_location})` : ""}
                </span>
              )}
            </div>
            {calibrationStatus ? (
              <span
                className={`inline-flex w-fit items-center gap-2 text-sm ${EXPIRY_COLOR_TEXT_CLASS[calibrationStatus.color]}`}
              >
                <span
                  className={`h-2 w-2 shrink-0 rounded-full ${EXPIRY_COLOR_DOT_CLASS[calibrationStatus.color]}`}
                />
                {calibrationStatus.label}
              </span>
            ) : (
              <span className="text-sm text-muted-foreground">Không áp dụng hiệu chuẩn</span>
            )}
          </div>
        </Link>
        {canEdit && (
          <Button asChild variant="outline" size="sm" className="shrink-0">
            <Link href={`/tools/${tool.id}/edit`}>Sửa</Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

import Link from "next/link";
import { ClipboardList } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { INSPECTION_RESULT_CONFIG } from "@/lib/inspection/result";
import { AttachmentLink } from "./attachment-link";
import { AddInspectionDialog } from "./add-inspection-dialog";
import { InspectionPhotoThumbnails } from "./inspection-photo-thumbnails";
import { ExportReportDialog } from "./export-report-dialog";
import type { InspectionHistoryDetailRow } from "./types";

// PROMPT-21: mẫu Word xuất biên bản hiện chỉ có cho pilot này -- các loại
// thiết bị khác chưa có mẫu nên ẩn hẳn nút xuất (không disable+tooltip, đỡ
// phải thêm component Tooltip mới cho 1 trường hợp).
const WORD_EXPORT_SUPPORTED_TYPE = "Thiết bị nâng - Cầu trục";

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("vi-VN");
}

export function InspectionHistorySection({
  equipmentId,
  equipmentType,
  equipmentInspectionCycle,
  history,
  canEdit,
  hasChecklistTemplate,
}: {
  equipmentId: string;
  equipmentType: string | null;
  equipmentInspectionCycle: number | null;
  history: InspectionHistoryDetailRow[];
  canEdit: boolean;
  hasChecklistTemplate: boolean;
}) {
  const canExportWord = equipmentType === WORD_EXPORT_SUPPORTED_TYPE;
  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Lịch sử kiểm định</h2>
        {canEdit &&
          (hasChecklistTemplate ? (
            <Button asChild>
              <Link href={`/equipment/${equipmentId}/inspect`}>+ Thêm bản ghi kiểm định</Link>
            </Button>
          ) : (
            <AddInspectionDialog equipmentId={equipmentId} />
          ))}
      </div>

      {history.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-md border border-dashed py-16 text-center text-muted-foreground">
          <ClipboardList className="h-8 w-8" />
          <p>Chưa có lịch sử kiểm định nào.</p>
        </div>
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-md border md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ngày KĐ</TableHead>
                  <TableHead>Kết quả</TableHead>
                  <TableHead>Số biên bản</TableHead>
                  <TableHead>Người kiểm định</TableHead>
                  <TableHead>Hạn mới</TableHead>
                  <TableHead>Ghi chú</TableHead>
                  <TableHead>File</TableHead>
                  <TableHead>Ảnh</TableHead>
                  {canExportWord && <TableHead>Biên bản</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((item) => {
                  const result = item.result ? INSPECTION_RESULT_CONFIG[item.result] : null;
                  return (
                    <TableRow key={item.id}>
                      <TableCell>{formatDate(item.inspection_date)}</TableCell>
                      <TableCell>
                        {result ? (
                          <Badge variant="outline" className={result.className}>
                            {result.label}
                          </Badge>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>{item.report_number || "—"}</TableCell>
                      <TableCell>{item.inspector?.full_name || "—"}</TableCell>
                      <TableCell>{formatDate(item.new_expiry_date)}</TableCell>
                      <TableCell className="max-w-[220px] truncate" title={item.notes ?? undefined}>
                        {item.notes || "—"}
                      </TableCell>
                      <TableCell>
                        {item.attachment_url ? (
                          <AttachmentLink path={item.attachment_url} />
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>
                        {item.photos.length > 0 ? (
                          <InspectionPhotoThumbnails photos={item.photos} />
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      {canExportWord && (
                        <TableCell>
                          <ExportReportDialog
                            equipmentId={equipmentId}
                            inspectionHistoryId={item.id}
                            inspectionCycle={equipmentInspectionCycle}
                          />
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-col gap-3 md:hidden">
            {history.map((item) => {
              const result = item.result ? INSPECTION_RESULT_CONFIG[item.result] : null;
              return (
                <Card key={item.id}>
                  <CardContent className="flex flex-col gap-2 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium">{formatDate(item.inspection_date)}</p>
                      {result && (
                        <Badge variant="outline" className={result.className}>
                          {result.label}
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                      <span>Số BB: {item.report_number || "—"}</span>
                      <span>KĐV: {item.inspector?.full_name || "—"}</span>
                      <span>Hạn mới: {formatDate(item.new_expiry_date)}</span>
                      {item.notes && <span>Ghi chú: {item.notes}</span>}
                    </div>
                    {item.attachment_url && <AttachmentLink path={item.attachment_url} />}
                    {item.photos.length > 0 && <InspectionPhotoThumbnails photos={item.photos} />}
                    {canExportWord && (
                      <ExportReportDialog
                        equipmentId={equipmentId}
                        inspectionHistoryId={item.id}
                        inspectionCycle={equipmentInspectionCycle}
                      />
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}

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
import { EditRequestDialog } from "./edit-request-dialog";
import { EditRequestReviewDialog } from "./edit-request-review-dialog";
import type { InspectionHistoryDetailRow } from "./types";
import type { UserRole } from "@/lib/types/profile";
import { REPORT_REGISTRY } from "@/lib/reports/registry";

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
  userRole,
  hasChecklistTemplate,
}: {
  equipmentId: string;
  equipmentType: string | null;
  equipmentInspectionCycle: number | null;
  history: InspectionHistoryDetailRow[];
  canEdit: boolean;
  userRole: UserRole | null;
  hasChecklistTemplate: boolean;
}) {
  // PROMPT-21/23: mẫu Word xuất biên bản chưa có cho mọi loại thiết bị --
  // ẩn hẳn nút xuất (không disable+tooltip, đỡ phải thêm component Tooltip
  // mới cho vài trường hợp) khi loại thiết bị chưa có entry trong registry.
  const canExportWord = equipmentType != null && equipmentType in REPORT_REGISTRY;

  // Chỉ dựng UI "Sửa" (link hoặc dialog tùy có checklist template hay
  // không) -- KHÔNG tự kiểm tra quyền, caller (renderActionCell) quyết định
  // khi nào gọi hàm này.
  function renderEditControl(item: InspectionHistoryDetailRow) {
    if (hasChecklistTemplate) {
      return (
        <Button asChild variant="outline" size="sm">
          <Link href={`/equipment/${equipmentId}/inspect/${item.id}/edit`}>Sửa</Link>
        </Button>
      );
    }
    return (
      <AddInspectionDialog
        equipmentId={equipmentId}
        equipmentType={equipmentType}
        mode="edit"
        historyId={item.id}
        initialData={{
          inspection_date: item.inspection_date,
          result: item.result ?? "pending",
          report_number: item.report_number,
          new_expiry_date: item.new_expiry_date,
          notes: item.notes,
          attachment_url: item.attachment_url,
        }}
        trigger={
          <Button variant="outline" size="sm">
            Sửa
          </Button>
        }
      />
    );
  }

  // PROMPT-50/51: admin luôn sửa được (kể cả bản ghi đã khóa), cộng thêm nút
  // duyệt/từ chối nếu có yêu cầu đang chờ. Inspector: bản ghi chưa khóa ->
  // sửa bình thường; đã khóa + chưa có yêu cầu -> nút "Xin sửa"; đã khóa +
  // đã gửi yêu cầu (đang pending) -> badge tĩnh, không cho gửi trùng (mirror
  // đúng điều kiện RLS "inspection_history_update_admin_or_unlocked_inspector",
  // migration 0002 -- chặn sớm ở UI trước khi bị DB từ chối).
  function renderActionCell(item: InspectionHistoryDetailRow) {
    const pending = item.pending_edit_request;
    if (userRole === "admin") {
      return (
        <div className="flex flex-wrap items-center gap-2">
          {renderEditControl(item)}
          {pending && (
            <EditRequestReviewDialog
              editRequestId={pending.id}
              reason={pending.reason}
              requestedByName={pending.requested_by_name}
              createdAt={pending.created_at}
            />
          )}
        </div>
      );
    }
    if (userRole === "inspector") {
      if (!item.is_locked) return renderEditControl(item);
      if (pending) {
        return (
          <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-800">
            Đang chờ Admin duyệt
          </Badge>
        );
      }
      return <EditRequestDialog inspectionHistoryId={item.id} />;
    }
    return null;
  }

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
            <AddInspectionDialog equipmentId={equipmentId} equipmentType={equipmentType} />
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
                  {canEdit && <TableHead>Thao tác</TableHead>}
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
                      {canEdit && <TableCell>{renderActionCell(item)}</TableCell>}
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
                    <div className="flex flex-wrap gap-2">
                      {canExportWord && (
                        <ExportReportDialog
                          equipmentId={equipmentId}
                          inspectionHistoryId={item.id}
                          inspectionCycle={equipmentInspectionCycle}
                        />
                      )}
                      {canEdit && renderActionCell(item)}
                    </div>
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

import { FileCheck2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { AttachmentLink } from "./attachment-link";
import { CalibrationDialog } from "./calibration-dialog";
import type { CalibrationRow } from "../types";

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("vi-VN");
}

export function CalibrationHistorySection({
  toolId,
  calibrations,
  canEdit,
}: {
  toolId: string;
  calibrations: CalibrationRow[];
  canEdit: boolean;
}) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Lịch sử hiệu chuẩn</h2>
        {canEdit && <CalibrationDialog toolId={toolId} />}
      </div>

      {calibrations.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-md border border-dashed py-16 text-center text-muted-foreground">
          <FileCheck2 className="h-8 w-8" />
          <p>Chưa có lần hiệu chuẩn nào được ghi nhận.</p>
        </div>
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-md border md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ngày cấp</TableHead>
                  <TableHead>Số giấy</TableHead>
                  <TableHead>Đơn vị cấp</TableHead>
                  <TableHead>Hạn hiệu lực</TableHead>
                  <TableHead>File</TableHead>
                  <TableHead>Ghi chú</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {calibrations.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>{formatDate(c.issued_date)}</TableCell>
                    <TableCell>{c.cert_no || "—"}</TableCell>
                    <TableCell>{c.issuer || "—"}</TableCell>
                    <TableCell>{formatDate(c.due_date)}</TableCell>
                    <TableCell>
                      {c.file_path ? <AttachmentLink path={c.file_path} /> : "—"}
                    </TableCell>
                    <TableCell className="max-w-[220px] truncate" title={c.note ?? undefined}>
                      {c.note || "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-col gap-3 md:hidden">
            {calibrations.map((c) => (
              <Card key={c.id}>
                <CardContent className="flex flex-col gap-2 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium">{c.cert_no || "Chưa có số giấy"}</p>
                    {c.file_path && <AttachmentLink path={c.file_path} />}
                  </div>
                  <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                    <span>Ngày cấp: {formatDate(c.issued_date)}</span>
                    <span>Hạn hiệu lực: {formatDate(c.due_date)}</span>
                    <span>Đơn vị cấp: {c.issuer || "—"}</span>
                    {c.note && <span>Ghi chú: {c.note}</span>}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

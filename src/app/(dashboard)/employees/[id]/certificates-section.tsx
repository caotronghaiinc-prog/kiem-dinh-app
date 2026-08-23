"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Award, Loader2 } from "lucide-react";
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
import { createClient } from "@/lib/supabase/client";
import { logAndGetSafeMessage } from "@/lib/errors";
import { useToast } from "@/hooks/use-toast";
import {
  EXPIRY_COLOR_DOT_CLASS,
  EXPIRY_COLOR_TEXT_CLASS,
  getExpiryStatus,
} from "@/lib/utils/expiry-status";
import { AttachmentLink } from "./attachment-link";
import { CertificateDialog } from "./certificate-dialog";
import type { CertificateRow } from "../types";

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("vi-VN");
}

function ExpiryIndicator({ expiryDate }: { expiryDate: string }) {
  const status = getExpiryStatus(expiryDate);
  return (
    <span className={`inline-flex items-center gap-2 text-sm ${EXPIRY_COLOR_TEXT_CLASS[status.color]}`}>
      <span className={`h-2 w-2 shrink-0 rounded-full ${EXPIRY_COLOR_DOT_CLASS[status.color]}`} />
      {status.label}
    </span>
  );
}

function ScopeCell({ certificate }: { certificate: CertificateRow }) {
  if (certificate.equipment_types.length === 0 && !certificate.scope_note) {
    return <span className="text-muted-foreground">—</span>;
  }
  return (
    <div className="flex max-w-[280px] flex-col gap-1">
      <div className="flex flex-wrap gap-1">
        {certificate.equipment_types.map((type) => (
          <Badge key={type} variant="outline" className="text-xs">
            {type}
          </Badge>
        ))}
      </div>
      {certificate.scope_note && (
        <p className="text-xs text-muted-foreground">{certificate.scope_note}</p>
      )}
    </div>
  );
}

export function CertificatesSection({
  profileId,
  certificates,
  canEdit,
}: {
  profileId: string;
  certificates: CertificateRow[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(id: string) {
    setDeletingId(id);
    const supabase = createClient();
    const { error } = await supabase.from("inspector_certificates").delete().eq("id", id);
    setDeletingId(null);

    if (error) {
      toast({
        variant: "destructive",
        title: "Xóa chứng chỉ thất bại",
        description: logAndGetSafeMessage(error, "Có lỗi xảy ra, vui lòng thử lại."),
      });
      return;
    }

    toast({ title: "Đã xóa chứng chỉ" });
    router.refresh();
  }

  function renderActions(certificate: CertificateRow) {
    if (!canEdit) return null;
    return (
      <div className="flex items-center gap-2">
        <CertificateDialog
          profileId={profileId}
          mode="edit"
          certificateId={certificate.id}
          initialData={{
            certificate_type: certificate.certificate_type,
            certificate_number: certificate.certificate_number,
            issued_by: certificate.issued_by,
            issued_date: certificate.issued_date,
            expiry_date: certificate.expiry_date,
            equipment_types: certificate.equipment_types,
            scope_note: certificate.scope_note,
            note: certificate.note,
            file_path: certificate.file_path,
          }}
          trigger={
            <Button variant="outline" size="sm">
              Sửa
            </Button>
          }
        />
        <Button
          variant="outline"
          size="sm"
          disabled={deletingId === certificate.id}
          onClick={() => handleDelete(certificate.id)}
        >
          {deletingId === certificate.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Xóa
        </Button>
      </div>
    );
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Chứng chỉ</h2>
        {canEdit && <CertificateDialog profileId={profileId} mode="create" />}
      </div>

      {certificates.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-md border border-dashed py-16 text-center text-muted-foreground">
          <Award className="h-8 w-8" />
          <p>Chưa có chứng chỉ nào được ghi nhận.</p>
        </div>
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-md border md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Loại/hạng</TableHead>
                  <TableHead>Số hiệu</TableHead>
                  <TableHead>Cơ quan cấp</TableHead>
                  <TableHead>Ngày cấp</TableHead>
                  <TableHead>Hạn hiệu lực</TableHead>
                  <TableHead>Phạm vi</TableHead>
                  <TableHead>File</TableHead>
                  {canEdit && <TableHead>Thao tác</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {certificates.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.certificate_type || "—"}</TableCell>
                    <TableCell>{c.certificate_number || "—"}</TableCell>
                    <TableCell>{c.issued_by || "—"}</TableCell>
                    <TableCell>{formatDate(c.issued_date)}</TableCell>
                    <TableCell>
                      <ExpiryIndicator expiryDate={c.expiry_date} />
                    </TableCell>
                    <TableCell>
                      <ScopeCell certificate={c} />
                    </TableCell>
                    <TableCell>{c.file_path ? <AttachmentLink path={c.file_path} /> : "—"}</TableCell>
                    {canEdit && <TableCell>{renderActions(c)}</TableCell>}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-col gap-3 md:hidden">
            {certificates.map((c) => (
              <Card key={c.id}>
                <CardContent className="flex flex-col gap-2 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium">{c.certificate_type || "Chưa có loại/hạng"}</p>
                    <ExpiryIndicator expiryDate={c.expiry_date} />
                  </div>
                  <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                    <span>Số hiệu: {c.certificate_number || "—"}</span>
                    <span>Cơ quan cấp: {c.issued_by || "—"}</span>
                    <span>Ngày cấp: {formatDate(c.issued_date)}</span>
                  </div>
                  <ScopeCell certificate={c} />
                  {c.file_path && <AttachmentLink path={c.file_path} />}
                  {canEdit && renderActions(c)}
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileSignature, Loader2 } from "lucide-react";
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
import { LABOR_CONTRACT_TYPE_LABELS } from "@/lib/employees/labor-contract-form-schema";
import { AttachmentLink } from "./attachment-link";
import { LaborContractDialog } from "./labor-contract-dialog";
import type { LaborContractRow } from "../types";

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("vi-VN");
}

export function LaborContractsSection({
  profileId,
  contracts,
  canEdit,
}: {
  profileId: string;
  contracts: LaborContractRow[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(id: string) {
    setDeletingId(id);
    const supabase = createClient();
    const { error } = await supabase.from("employee_labor_contracts").delete().eq("id", id);
    setDeletingId(null);

    if (error) {
      toast({
        variant: "destructive",
        title: "Xóa hợp đồng lao động thất bại",
        description: logAndGetSafeMessage(error, "Có lỗi xảy ra, vui lòng thử lại."),
      });
      return;
    }

    toast({ title: "Đã xóa hợp đồng lao động" });
    router.refresh();
  }

  function renderActions(contract: LaborContractRow) {
    if (!canEdit) return null;
    return (
      <div className="flex items-center gap-2">
        <LaborContractDialog
          profileId={profileId}
          mode="edit"
          contractId={contract.id}
          initialData={{
            contract_type: contract.contract_type,
            contract_no: contract.contract_no,
            signed_date: contract.signed_date,
            start_date: contract.start_date,
            end_date: contract.end_date,
            note: contract.note,
            file_path: contract.file_path,
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
          disabled={deletingId === contract.id}
          onClick={() => handleDelete(contract.id)}
        >
          {deletingId === contract.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Xóa
        </Button>
      </div>
    );
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Hợp đồng lao động</h2>
        {canEdit && <LaborContractDialog profileId={profileId} mode="create" />}
      </div>

      {contracts.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-md border border-dashed py-16 text-center text-muted-foreground">
          <FileSignature className="h-8 w-8" />
          <p>Chưa có hợp đồng lao động nào được ghi nhận.</p>
        </div>
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-md border md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Loại HĐ</TableHead>
                  <TableHead>Số HĐ</TableHead>
                  <TableHead>Ngày ký</TableHead>
                  <TableHead>Ngày bắt đầu</TableHead>
                  <TableHead>Ngày kết thúc</TableHead>
                  <TableHead>Ghi chú</TableHead>
                  <TableHead>File</TableHead>
                  {canEdit && <TableHead>Thao tác</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {contracts.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <Badge variant="outline">{LABOR_CONTRACT_TYPE_LABELS[c.contract_type]}</Badge>
                    </TableCell>
                    <TableCell>{c.contract_no || "—"}</TableCell>
                    <TableCell>{formatDate(c.signed_date)}</TableCell>
                    <TableCell>{formatDate(c.start_date)}</TableCell>
                    <TableCell>
                      {c.end_date ? formatDate(c.end_date) : "Không xác định thời hạn"}
                    </TableCell>
                    <TableCell className="max-w-[200px] whitespace-pre-wrap text-sm">
                      {c.note || "—"}
                    </TableCell>
                    <TableCell>
                      {c.file_path ? (
                        <AttachmentLink path={c.file_path} label="Xem file hợp đồng lao động" />
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    {canEdit && <TableCell>{renderActions(c)}</TableCell>}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-col gap-3 md:hidden">
            {contracts.map((c) => (
              <Card key={c.id}>
                <CardContent className="flex flex-col gap-2 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <Badge variant="outline">{LABOR_CONTRACT_TYPE_LABELS[c.contract_type]}</Badge>
                    <span className="text-xs text-muted-foreground">{c.contract_no || "—"}</span>
                  </div>
                  <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                    <span>Ngày ký: {formatDate(c.signed_date)}</span>
                    <span>Ngày bắt đầu: {formatDate(c.start_date)}</span>
                    <span>
                      Ngày kết thúc: {c.end_date ? formatDate(c.end_date) : "Không xác định thời hạn"}
                    </span>
                    {c.note && <span>Ghi chú: {c.note}</span>}
                  </div>
                  {c.file_path && (
                    <AttachmentLink path={c.file_path} label="Xem file hợp đồng lao động" />
                  )}
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

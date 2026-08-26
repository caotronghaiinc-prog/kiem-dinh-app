"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { logAndGetSafeMessage } from "@/lib/errors";
import { buildWorkRequestDocx } from "@/lib/reports/contract-work-request";
import type { ContractDetail, ContractEquipmentRow } from "../types";

// PROMPT-66: thay hẳn ExportEquipmentListButton (PROMPT-59, đã xóa) --
// mirror ĐÚNG export-acceptance-button.tsx: đọc thẳng dữ liệu đã lưu trên
// contract, KHÔNG mở dialog.
export function ExportWorkRequestButton({
  contract,
  equipment,
}: {
  contract: ContractDetail;
  equipment: ContractEquipmentRow[];
}) {
  const { toast } = useToast();
  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    setExporting(true);
    try {
      const blob = await buildWorkRequestDocx(contract, equipment, new Date().toISOString());
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Giay_de_nghi_${contract.contract_no.replace(/[\\/]/g, "-")}.docx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Xuất đề nghị thực hiện công việc thất bại",
        description: logAndGetSafeMessage(error, "Có lỗi xảy ra, vui lòng thử lại."),
      });
    } finally {
      setExporting(false);
    }
  }

  if (contract.technicalResponsibles.length === 0 || !contract.requester) {
    return (
      <div className="flex flex-col items-end gap-1">
        <Button disabled size="sm" variant="outline">
          Xuất đề nghị thực hiện công việc
        </Button>
        <p className="max-w-xs text-right text-xs text-muted-foreground">
          Cần chọn "Kiểm định viên tham gia" + "Người đề nghị" (qua nút "Sửa" hợp đồng) trước khi
          xuất được giấy đề nghị.
        </p>
      </div>
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={equipment.length === 0 || exporting}
      onClick={handleExport}
    >
      {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
      Xuất đề nghị thực hiện công việc
    </Button>
  );
}

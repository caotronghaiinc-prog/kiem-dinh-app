"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { logAndGetSafeMessage } from "@/lib/errors";
import { buildContractAcceptanceDocx, type ContractAcceptanceCustomer } from "@/lib/reports/contract-acceptance";
import type { ContractDetail, ContractEquipmentRow } from "../types";

function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/gi, "d")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function ExportAcceptanceButton({
  contract,
  customer,
  equipment,
}: {
  contract: ContractDetail;
  customer: ContractAcceptanceCustomer | null;
  equipment: ContractEquipmentRow[];
}) {
  const { toast } = useToast();
  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    setExporting(true);
    try {
      const blob = await buildContractAcceptanceDocx(contract, customer, equipment);
      const fileName = `Bien_ban_nghiem_thu_${contract.code}_${slugify(customer?.company_name ?? "khach_hang")}.docx`;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Xuất biên bản nghiệm thu thất bại",
        description: logAndGetSafeMessage(error, "Có lỗi xảy ra, vui lòng thử lại."),
      });
    } finally {
      setExporting(false);
    }
  }

  if (!contract.acceptance_date) {
    return (
      <div className="flex flex-col items-end gap-1">
        <Button disabled size="sm" variant="outline">
          Xuất biên bản nghiệm thu
        </Button>
        <p className="max-w-xs text-right text-xs text-muted-foreground">
          Cần điền "Ngày nghiệm thu" (qua nút "Cập nhật thông tin nghiệm thu") trước khi xuất được
          biên bản.
        </p>
      </div>
    );
  }

  return (
    <Button type="button" variant="outline" size="sm" disabled={exporting} onClick={handleExport}>
      {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
      Xuất biên bản nghiệm thu
    </Button>
  );
}

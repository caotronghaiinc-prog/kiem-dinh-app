"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { logAndGetSafeMessage } from "@/lib/errors";
import {
  buildContractEquipmentListDocx,
  type ContractEquipmentListInput,
} from "@/lib/reports/contract-equipment-list";
import type { ContractEquipmentRow } from "../types";

export function ExportEquipmentListButton({
  contract,
  equipment,
}: {
  contract: ContractEquipmentListInput;
  equipment: ContractEquipmentRow[];
}) {
  const { toast } = useToast();
  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    setExporting(true);
    try {
      const blob = await buildContractEquipmentListDocx(contract, equipment);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Bang-ke-thiet-bi-${contract.contract_no.replace(/[\\/]/g, "-")}.docx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Xuất bảng kê thiết bị thất bại",
        description: logAndGetSafeMessage(error, "Có lỗi xảy ra, vui lòng thử lại."),
      });
    } finally {
      setExporting(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={exporting || equipment.length === 0}
      onClick={handleExport}
    >
      {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
      Xuất bảng kê thiết bị
    </Button>
  );
}

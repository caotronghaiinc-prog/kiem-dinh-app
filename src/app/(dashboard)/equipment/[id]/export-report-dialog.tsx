"use client";

import { useState } from "react";
import { FileDown, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { logAndGetSafeMessage } from "@/lib/errors";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  type ReportChecklistItem,
  type ReportChecklistResult,
  type ReportEquipment,
  type ReportInspectionHistory,
  type ReportPhoto,
} from "@/lib/reports/shared";
import { getReportRegistryEntry } from "@/lib/reports/registry";
import { generateReport } from "@/lib/reports/generate-docx";

const HINH_THUC_LAN_SAU_OPTIONS = ["Định kỳ hằng năm", "Định kỳ", "Bất thường"] as const;

function sanitizeFileNamePart(value: string): string {
  // Windows/macOS đều cấm 1 số ký tự trong tên file (/, \, :, ?, "...) --
  // report_number có thể chứa "/" (vd "01/2026") nên phải thay, không chỉ
  // xóa, để không dính 2 số lại thành 1.
  return value.replace(/[\\/:*?"<>|]/g, "-").trim() || "khong-ro";
}

export function ExportReportDialog({
  equipmentId,
  inspectionHistoryId,
  inspectionCycle,
}: {
  equipmentId: string;
  inspectionHistoryId: string;
  inspectionCycle: number | null;
}) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [hinhThucLanSau, setHinhThucLanSau] = useState<string>(
    inspectionCycle === 12 ? "Định kỳ hằng năm" : "Định kỳ"
  );
  const [lyDoRutNgan, setLyDoRutNgan] = useState("");

  function handleOpenChange(next: boolean) {
    if (submitting) return;
    setOpen(next);
  }

  async function handleExport() {
    setSubmitting(true);
    const supabase = createClient();

    try {
      const [{ data: equipmentRow, error: equipmentError }, { data: historyRow, error: historyError }] =
        await Promise.all([
          supabase
            .from("equipment")
            .select(
              "code, type, serial_number, manufacture_year, manufacturer, notes, location, spec_values, customer:customers(company_name, address)"
            )
            .eq("id", equipmentId)
            .single(),
          supabase
            .from("inspection_history")
            .select("inspection_date, report_number, new_expiry_date, result, report_metadata")
            .eq("id", inspectionHistoryId)
            .single(),
        ]);

      if (equipmentError || !equipmentRow) throw new Error(equipmentError?.message ?? "Không tìm thấy thiết bị.");
      if (historyError || !historyRow) throw new Error(historyError?.message ?? "Không tìm thấy bản ghi kiểm định.");

      const registryEntry = getReportRegistryEntry(equipmentRow.type);
      if (!registryEntry) {
        throw new Error("Loại thiết bị này chưa hỗ trợ xuất biên bản Word.");
      }

      const { data: templateRow, error: templateError } = await supabase
        .from("equipment_checklist_templates")
        .select("id, source_document")
        .eq("equipment_type", equipmentRow.type ?? "")
        .limit(1)
        .maybeSingle();
      if (templateError || !templateRow) {
        throw new Error(templateError?.message ?? "Không tìm thấy mẫu checklist cho loại thiết bị này.");
      }

      const [
        { data: itemsData, error: itemsError },
        { data: resultsData, error: resultsError },
        { data: photosData, error: photosError },
        { data: previousData },
      ] = await Promise.all([
        supabase
          .from("equipment_checklist_items")
          .select("id, item_order, has_presence_flag, value_fields")
          .eq("template_id", templateRow.id)
          .order("item_order", { ascending: true }),
        supabase
          .from("inspection_checklist_results")
          .select("checklist_item_id, result, presence_value, values, note")
          .eq("inspection_history_id", inspectionHistoryId),
        supabase
          .from("inspection_photos")
          .select("category, storage_path")
          .eq("inspection_history_id", inspectionHistoryId),
        supabase
          .from("inspection_history")
          .select("inspection_date")
          .eq("equipment_id", equipmentId)
          .lt("inspection_date", historyRow.inspection_date)
          .order("inspection_date", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      if (itemsError) throw new Error(itemsError.message);
      if (resultsError) throw new Error(resultsError.message);
      if (photosError) throw new Error(photosError.message);

      const data = registryEntry.buildData({
        equipment: equipmentRow as unknown as ReportEquipment,
        template: templateRow,
        inspectionHistory: historyRow as unknown as ReportInspectionHistory,
        checklistItems: (itemsData ?? []) as unknown as ReportChecklistItem[],
        checklistResults: (resultsData ?? []) as unknown as ReportChecklistResult[],
        photos: (photosData ?? []) as unknown as ReportPhoto[],
        previousInspection: previousData ?? null,
        nextInspectionForm: {
          hinh_thuc_kd_lan_sau: hinhThucLanSau,
          ly_do_rut_ngan: lyDoRutNgan,
        },
      });

      const photoStoragePaths = (photosData ?? []).map((p) => p.storage_path);
      const fileNameSuffix = sanitizeFileNamePart(historyRow.report_number || historyRow.inspection_date);
      const fileName = `Bien-ban-kiem-dinh-${sanitizeFileNamePart(equipmentRow.code)}-${fileNameSuffix}.docx`;

      await generateReport(registryEntry.templateUrl, data, photoStoragePaths, fileName);

      toast({ title: "Đã xuất biên bản Word" });
      setOpen(false);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Xuất biên bản thất bại",
        description: logAndGetSafeMessage(error, "Có lỗi xảy ra, vui lòng thử lại."),
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <FileDown className="mr-1 h-4 w-4" />
          Xuất biên bản Word
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Xuất biên bản Word</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            2 thông tin này thuộc về lần kiểm định sau, hệ thống chưa có chỗ lưu nên hỏi ngay lúc xuất.
          </p>

          <div className="flex flex-col gap-1">
            <Label>Hình thức kiểm định lần sau</Label>
            <Select value={hinhThucLanSau} onValueChange={setHinhThucLanSau}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {HINH_THUC_LAN_SAU_OPTIONS.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1">
            <Label>Lý do rút ngắn thời hạn kiểm định (nếu có)</Label>
            <Input value={lyDoRutNgan} onChange={(e) => setLyDoRutNgan(e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={submitting}
            onClick={() => handleOpenChange(false)}
          >
            Hủy
          </Button>
          <Button type="button" disabled={submitting} onClick={handleExport}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Xuất file
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

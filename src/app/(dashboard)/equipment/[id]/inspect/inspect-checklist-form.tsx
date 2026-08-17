"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, Loader2, Plus, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { logAndGetSafeMessage } from "@/lib/errors";
import { useToast } from "@/hooks/use-toast";
import { useCurrentUserProfile } from "@/hooks/use-current-user-profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ALLOWED_ATTACHMENT_EXTENSIONS,
  ATTACHMENT_BUCKET,
  validateAttachmentFile,
} from "@/lib/inspection/form-schema";
import { RadioPillGroup, type RadioPillOption } from "./radio-pill-group";
import { ChecklistItemCard, type ChecklistItemState } from "./checklist-item-card";
import { PhotoUploadField } from "./photo-upload-field";
import type { ChecklistItem, ChecklistResult, ChecklistTemplate, InspectEquipment } from "./types";

type HinhThuc = "lan_dau" | "dinh_ky_hang_nam" | "dinh_ky" | "bat_thuong";
type HoSoStatus = "day_du" | "khong_day_du";
type PhotoCategory = "tong_the" | "chi_tiet_khong_dat";

interface InspectorRow {
  ten: string;
  so_hieu: string;
}
interface WitnessRow {
  ten: string;
  chuc_vu: string;
}

const HINH_THUC_OPTIONS: readonly RadioPillOption<HinhThuc>[] = [
  { value: "lan_dau", label: "Lần đầu", activeClassName: "border-primary bg-primary/10 text-primary" },
  {
    value: "dinh_ky_hang_nam",
    label: "ĐK hằng năm",
    activeClassName: "border-primary bg-primary/10 text-primary",
  },
  { value: "dinh_ky", label: "Định kỳ", activeClassName: "border-primary bg-primary/10 text-primary" },
  {
    value: "bat_thuong",
    label: "Bất thường",
    activeClassName: "border-primary bg-primary/10 text-primary",
  },
];

const MAX_INSPECTORS = 2;
const MAX_WITNESSES = 5;

const HO_SO_OPTIONS: readonly RadioPillOption<HoSoStatus>[] = [
  { value: "day_du", label: "Đầy đủ", activeClassName: "border-green-600 bg-green-100 text-green-800" },
  {
    value: "khong_day_du",
    label: "Không đầy đủ",
    activeClassName: "border-red-600 bg-red-100 text-red-800",
  },
];

// Mẫu gốc (Phụ lục 1) có 3 dòng hồ sơ khác nhau tùy hình thức kiểm định --
// vì "Hình thức kiểm định" đã chọn sẵn ở phần đầu form nên chỉ hiện đúng 1
// dòng tương ứng, không hiện cả 3 như bản giấy.
const HO_SO_LABELS: Record<HinhThuc, { tenHoSo: string; noiDung: string }> = {
  lan_dau: {
    tenHoSo: "Hồ sơ kỹ thuật thiết bị khi kiểm định lần đầu (Mục 8.1.1 QTKĐ 01:2026/BNV)",
    noiDung: "Lý lịch thiết bị; Hồ sơ nghiệm thu lắp đặt; các hồ sơ khác",
  },
  dinh_ky_hang_nam: {
    tenHoSo: "Hồ sơ kỹ thuật thiết bị khi kiểm định hằng năm, định kỳ (Mục 8.1.2 QTKĐ 01:2026/BNV)",
    noiDung:
      "Lý lịch thiết bị; BB kiểm định và GCN kiểm định lần trước; hồ sơ về quản lý sử dụng, vận hành, bảo dưỡng; các hồ sơ khác",
  },
  dinh_ky: {
    tenHoSo: "Hồ sơ kỹ thuật thiết bị khi kiểm định hằng năm, định kỳ (Mục 8.1.2 QTKĐ 01:2026/BNV)",
    noiDung:
      "Lý lịch thiết bị; BB kiểm định và GCN kiểm định lần trước; hồ sơ về quản lý sử dụng, vận hành, bảo dưỡng; các hồ sơ khác",
  },
  bat_thuong: {
    tenHoSo: "Hồ sơ kỹ thuật thiết bị khi kiểm định bất thường (Mục 8.1.3 QTKĐ 01:2026/BNV)",
    noiDung: "Các hồ sơ theo quy định tại mục 8.1.3; BB kiểm định và GCN kiểm định lần trước",
  },
};

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Xóa bù trừ inspection_history khi 1 bước ghi sau đó lỗi (không có
 * transaction thật qua PostgREST). Trả về true nếu xóa thành công -- RLS
 * DELETE inspection_history chỉ cấp cho admin (migration 0002) nên với
 * inspector, lệnh này bị chặn (0 dòng, không phải lỗi) và trả về false. */
async function compensateDeleteInspectionHistory(
  supabase: ReturnType<typeof createClient>,
  inspectionHistoryId: string
): Promise<boolean> {
  const { data: deleted } = await supabase
    .from("inspection_history")
    .delete()
    .eq("id", inspectionHistoryId)
    .select("id");
  return Boolean(deleted && deleted.length > 0);
}

function makeInitialItemStates(items: ChecklistItem[]): Record<string, ChecklistItemState> {
  const map: Record<string, ChecklistItemState> = {};
  for (const item of items) {
    map[item.id] = { result: null, presence_value: null, values: {}, note: "" };
  }
  return map;
}

export function InspectChecklistForm({
  equipment,
  template,
  items,
}: {
  equipment: InspectEquipment;
  template: ChecklistTemplate;
  items: ChecklistItem[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const { profile } = useCurrentUserProfile();

  // ----- Phần đầu -----
  const [hinhThuc, setHinhThuc] = useState<HinhThuc | null>(null);
  const [lyDoBatThuong, setLyDoBatThuong] = useState("");
  const [kiemDinhVien, setKiemDinhVien] = useState<InspectorRow[]>([{ ten: "", so_hieu: "" }]);
  const prefilledInspectorRef = useRef(false);
  const [nguoiChungKien, setNguoiChungKien] = useState<WitnessRow[]>([{ ten: "", chuc_vu: "" }]);
  const [diaDiem, setDiaDiem] = useState("");

  useEffect(() => {
    if (prefilledInspectorRef.current || !profile?.full_name) return;
    setKiemDinhVien((rows) => {
      if (rows.length === 1 && rows[0].ten === "" && rows[0].so_hieu === "") {
        prefilledInspectorRef.current = true;
        return [{ ten: profile.full_name ?? "", so_hieu: "" }];
      }
      return rows;
    });
  }, [profile]);

  // ----- Checklist -----
  const sections = useMemo(() => {
    const map = new Map<string, ChecklistItem[]>();
    for (const item of items) {
      if (!map.has(item.section)) map.set(item.section, []);
      map.get(item.section)!.push(item);
    }
    return Array.from(map.entries());
  }, [items]);

  const [itemStates, setItemStates] = useState<Record<string, ChecklistItemState>>(() =>
    makeInitialItemStates(items)
  );
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    sections.forEach(([name], idx) => {
      initial[name] = idx === 0;
    });
    return initial;
  });

  const allResultsAnswered = items.every((item) => itemStates[item.id]?.result != null);
  const overallResult: ChecklistResult | null = useMemo(() => {
    if (!allResultsAnswered) return null;
    return items.some((item) => itemStates[item.id]?.result === "khong_dat") ? "khong_dat" : "dat";
  }, [items, itemStates, allResultsAnswered]);

  // ----- Kiểm tra hồ sơ kỹ thuật -----
  const [hoSoDayDu, setHoSoDayDu] = useState<boolean | null>(null);
  const [hoSoLyDo, setHoSoLyDo] = useState("");

  // ----- Ghi nhận khác -----
  const [ghiNhanKhac, setGhiNhanKhac] = useState("");

  // ----- Ảnh kiểm định (mục 8.5, bắt buộc) -----
  const [overallPhotos, setOverallPhotos] = useState<File[]>([]);
  const [defectPhotos, setDefectPhotos] = useState<File[]>([]);

  // ----- Kết luận -----
  const [kienNghi, setKienNghi] = useState("");
  const [thoiHanKienNghi, setThoiHanKienNghi] = useState("");
  const [newExpiryDate, setNewExpiryDate] = useState("");
  const [soTem, setSoTem] = useState("");
  const [viTriTem, setViTriTem] = useState("");
  const [inspectionDate, setInspectionDate] = useState(todayIso());
  const [reportNumber, setReportNumber] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);

  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  function toggleSection(name: string) {
    setOpenSections((prev) => ({ ...prev, [name]: !prev[name] }));
  }

  function updateItemState(itemId: string, next: ChecklistItemState) {
    setItemStates((prev) => ({ ...prev, [itemId]: next }));
  }

  function addInspector() {
    setKiemDinhVien((rows) => (rows.length >= MAX_INSPECTORS ? rows : [...rows, { ten: "", so_hieu: "" }]));
  }
  function removeInspector(idx: number) {
    setKiemDinhVien((rows) => rows.filter((_, i) => i !== idx));
  }
  function updateInspector(idx: number, patch: Partial<InspectorRow>) {
    setKiemDinhVien((rows) => rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }

  function addWitness() {
    setNguoiChungKien((rows) => (rows.length >= MAX_WITNESSES ? rows : [...rows, { ten: "", chuc_vu: "" }]));
  }
  function removeWitness(idx: number) {
    setNguoiChungKien((rows) => rows.filter((_, i) => i !== idx));
  }
  function updateWitness(idx: number, patch: Partial<WitnessRow>) {
    setNguoiChungKien((rows) => rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null;
    if (!selected) {
      setFile(null);
      setFileError(null);
      return;
    }
    const error = validateAttachmentFile(selected);
    if (error) {
      setFileError(error);
      setFile(null);
      e.target.value = "";
      return;
    }
    setFileError(null);
    setFile(selected);
  }

  function getMissingItemIds(): Set<string> {
    const missing = new Set<string>();
    for (const item of items) {
      const st = itemStates[item.id];
      if (!st?.result || (item.has_presence_flag && !st.presence_value)) {
        missing.add(item.id);
      }
    }
    return missing;
  }

  function validate(): string[] {
    const errors: string[] = [];
    if (!inspectionDate) errors.push("Vui lòng chọn ngày kiểm định.");
    if (!hinhThuc) errors.push("Vui lòng chọn hình thức kiểm định.");
    if (hinhThuc === "bat_thuong" && !lyDoBatThuong.trim()) {
      errors.push("Vui lòng nhập lý do kiểm định bất thường.");
    }
    if (!kiemDinhVien[0]?.ten.trim()) errors.push("Vui lòng nhập tên kiểm định viên.");

    const missing = getMissingItemIds();
    if (missing.size > 0) {
      errors.push(
        `Còn ${missing.size} hạng mục chưa điền đầy đủ kết quả -- các mục thiếu đã được đánh dấu đỏ bên dưới.`
      );
    }

    if (hinhThuc) {
      if (hoSoDayDu === null) {
        errors.push("Vui lòng chọn Đầy đủ/Không đầy đủ cho phần kiểm tra hồ sơ kỹ thuật.");
      } else if (hoSoDayDu === false && !hoSoLyDo.trim()) {
        errors.push("Vui lòng nhập lý do không đạt cho phần kiểm tra hồ sơ kỹ thuật.");
      }
    }

    if (overallPhotos.length === 0) {
      errors.push("Vui lòng tải lên ít nhất 1 ảnh tổng thể thiết bị.");
    }
    if (overallResult === "khong_dat" && defectPhotos.length === 0) {
      errors.push("Vui lòng tải lên ít nhất 1 ảnh chi tiết hạng mục không đạt.");
    }

    if (overallResult === "khong_dat" && !kienNghi.trim()) {
      errors.push("Vui lòng nhập lý do không đạt / kiến nghị.");
    }
    return errors;
  }

  async function handleSubmitClick() {
    setAttemptedSubmit(true);
    const errors = validate();
    if (errors.length > 0) {
      setFormErrors(errors);
      const missing = getMissingItemIds();
      if (missing.size > 0) {
        setOpenSections((prev) => {
          const next = { ...prev };
          for (const [sectionName, sectionItems] of sections) {
            if (sectionItems.some((i) => missing.has(i.id))) next[sectionName] = true;
          }
          return next;
        });
      }
      return;
    }
    setFormErrors([]);
    await submit();
  }

  async function submit() {
    setSubmitting(true);
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setSubmitting(false);
      toast({
        variant: "destructive",
        title: "Phiên đăng nhập đã hết hạn",
        description: "Vui lòng đăng nhập lại rồi thử lại.",
      });
      return;
    }

    let attachmentPath: string | null = null;
    if (file) {
      const dotIndex = file.name.lastIndexOf(".");
      const ext = dotIndex >= 0 ? file.name.slice(dotIndex).toLowerCase() : "";
      const path = `${equipment.id}/${crypto.randomUUID()}${ext}`;
      const { error: uploadError } = await supabase.storage
        .from(ATTACHMENT_BUCKET)
        .upload(path, file, { contentType: file.type || undefined });

      if (uploadError) {
        setSubmitting(false);
        toast({
          variant: "destructive",
          title: "Tải file lên thất bại",
          description: uploadError.message,
        });
        return;
      }
      attachmentPath = path;
    }

    const reportMetadata = {
      hinh_thuc_kiem_dinh: hinhThuc,
      ly_do_bat_thuong: hinhThuc === "bat_thuong" ? lyDoBatThuong.trim() : null,
      kiem_dinh_vien: kiemDinhVien
        .filter((r) => r.ten.trim())
        .map((r) => ({ ten: r.ten.trim(), so_hieu: r.so_hieu.trim() || null })),
      nguoi_chung_kien: nguoiChungKien
        .filter((r) => r.ten.trim())
        .map((r) => ({ ten: r.ten.trim(), chuc_vu: r.chuc_vu.trim() || null })),
      dia_diem_lap_bien_ban: diaDiem.trim() || null,
      kien_nghi: kienNghi.trim() || null,
      thoi_han_kien_nghi: thoiHanKienNghi.trim() || null,
      so_tem: soTem.trim() || null,
      vi_tri_tem: viTriTem.trim() || null,
      kiem_tra_ho_so:
        hoSoDayDu === null
          ? null
          : { day_du: hoSoDayDu, ly_do: hoSoDayDu ? null : hoSoLyDo.trim() || null },
      ghi_nhan_khac: ghiNhanKhac.trim() || null,
    };

    const { data: inserted, error: insertError } = await supabase
      .from("inspection_history")
      .insert({
        equipment_id: equipment.id,
        inspection_date: inspectionDate,
        // inspection_history.result vẫn dùng enum cũ 'pass'/'fail'/'pending'
        // (migration 0001, không đổi ở PROMPT-18) -- khác enum
        // 'dat'/'khong_dat'/'khong_danh_gia' của inspection_checklist_results,
        // nên phải map lại kết quả tổng ở đây.
        result: overallResult === "dat" ? "pass" : "fail",
        report_number: reportNumber.trim() || null,
        new_expiry_date: newExpiryDate || null,
        notes: null,
        inspector_id: user.id,
        attachment_url: attachmentPath,
        report_metadata: reportMetadata,
      })
      .select("id")
      .single();

    if (insertError || !inserted) {
      setSubmitting(false);
      toast({
        variant: "destructive",
        title: "Lưu bản ghi kiểm định thất bại",
        description: logAndGetSafeMessage(insertError, "Có lỗi xảy ra, vui lòng thử lại."),
      });
      return;
    }

    const resultsPayload = items.map((item) => {
      const st = itemStates[item.id];
      return {
        inspection_history_id: inserted.id,
        checklist_item_id: item.id,
        result: st.result,
        presence_value: item.has_presence_flag ? st.presence_value : null,
        values: st.values,
        note: st.note.trim() || null,
      };
    });

    const { error: resultsError } = await supabase
      .from("inspection_checklist_results")
      .insert(resultsPayload);

    if (resultsError) {
      // Không có transaction thật (client gọi PostgREST trực tiếp, mỗi insert
      // là 1 request riêng) -- tự bù trừ bằng cách xóa lại dòng
      // inspection_history vừa tạo để không để lại bản ghi mồ côi không có
      // checklist đi kèm (cascade xóa luôn mọi inspection_checklist_results/
      // inspection_photos đã lỡ ghi được).
      const deletedOk = await compensateDeleteInspectionHistory(supabase, inserted.id);
      setSubmitting(false);
      toast({
        variant: "destructive",
        title: "Lưu checklist thất bại",
        description: deletedOk
          ? "Đã hủy bản ghi kiểm định vừa tạo, vui lòng thử lại."
          : "Bản ghi kiểm định gốc có thể vẫn còn trong hệ thống (không có quyền tự xóa). Vui lòng báo Admin kiểm tra.",
      });
      return;
    }

    // Ảnh kiểm định (mục 8.5, bắt buộc) -- upload từng file lên cùng bucket
    // ATTACHMENT_BUCKET rồi insert batch vào inspection_photos. Lỗi ở bước
    // này áp dụng lại đúng cách bù trừ như bước checklist ở trên.
    const photosToUpload: { file: File; category: PhotoCategory }[] = [
      ...overallPhotos.map((file) => ({ file, category: "tong_the" as const })),
      ...defectPhotos.map((file) => ({ file, category: "chi_tiet_khong_dat" as const })),
    ];

    const uploadedPhotos: { storage_path: string; category: PhotoCategory }[] = [];
    let photoStepFailed = false;

    for (const { file, category } of photosToUpload) {
      const dotIndex = file.name.lastIndexOf(".");
      const ext = dotIndex >= 0 ? file.name.slice(dotIndex).toLowerCase() : "";
      const path = `${equipment.id}/${inserted.id}/${category}-${crypto.randomUUID()}${ext}`;
      const { error: uploadError } = await supabase.storage
        .from(ATTACHMENT_BUCKET)
        .upload(path, file, { contentType: file.type || undefined });

      if (uploadError) {
        photoStepFailed = true;
        break;
      }
      uploadedPhotos.push({ storage_path: path, category });
    }

    if (!photoStepFailed && uploadedPhotos.length > 0) {
      const { error: photosError } = await supabase.from("inspection_photos").insert(
        uploadedPhotos.map((p) => ({
          inspection_history_id: inserted.id,
          category: p.category,
          storage_path: p.storage_path,
        }))
      );
      if (photosError) photoStepFailed = true;
    }

    if (photoStepFailed) {
      const deletedOk = await compensateDeleteInspectionHistory(supabase, inserted.id);
      setSubmitting(false);
      toast({
        variant: "destructive",
        title: "Lưu ảnh kiểm định thất bại",
        description: deletedOk
          ? "Đã hủy bản ghi kiểm định vừa tạo, vui lòng thử lại."
          : "Bản ghi kiểm định gốc có thể vẫn còn trong hệ thống (không có quyền tự xóa). Vui lòng báo Admin kiểm tra.",
      });
      return;
    }

    setSubmitting(false);
    toast({ title: "Đã lưu bản ghi kiểm định" });
    router.push(`/equipment/${equipment.id}`);
  }

  return (
    <div className="flex flex-col gap-6">
      {template.source_document && (
        <p className="text-xs text-muted-foreground">Nguồn: {template.source_document}</p>
      )}

      {/* Phần đầu */}
      <Card>
        <CardContent className="flex flex-col gap-4 p-4 sm:p-6">
          <h2 className="text-base font-semibold">Thông tin chung</h2>

          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium">Hình thức kiểm định *</span>
            <RadioPillGroup
              name="hinh-thuc"
              value={hinhThuc}
              onChange={setHinhThuc}
              options={HINH_THUC_OPTIONS}
            />
          </div>

          {hinhThuc === "bat_thuong" && (
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Lý do kiểm định bất thường *</label>
              <Textarea value={lyDoBatThuong} onChange={(e) => setLyDoBatThuong(e.target.value)} />
            </div>
          )}

          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">Kiểm định viên *</span>
            {kiemDinhVien.map((row, idx) => (
              <div key={idx} className="flex flex-col gap-2 sm:flex-row">
                <Input
                  placeholder="Họ và tên"
                  value={row.ten}
                  onChange={(e) => updateInspector(idx, { ten: e.target.value })}
                  className="sm:flex-1"
                />
                <Input
                  placeholder="Số hiệu kiểm định viên"
                  value={row.so_hieu}
                  onChange={(e) => updateInspector(idx, { so_hieu: e.target.value })}
                  className="sm:flex-1"
                />
                {idx > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0"
                    onClick={() => removeInspector(idx)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            {kiemDinhVien.length < MAX_INSPECTORS && (
              <Button type="button" variant="outline" size="sm" className="w-fit" onClick={addInspector}>
                <Plus className="mr-1 h-4 w-4" /> Thêm kiểm định viên
              </Button>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">Người chứng kiến</span>
            {nguoiChungKien.map((row, idx) => (
              <div key={idx} className="flex flex-col gap-2 sm:flex-row">
                <Input
                  placeholder="Họ và tên"
                  value={row.ten}
                  onChange={(e) => updateWitness(idx, { ten: e.target.value })}
                  className="sm:flex-1"
                />
                <Input
                  placeholder="Chức vụ"
                  value={row.chuc_vu}
                  onChange={(e) => updateWitness(idx, { chuc_vu: e.target.value })}
                  className="sm:flex-1"
                />
                {idx > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0"
                    onClick={() => removeWitness(idx)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            {nguoiChungKien.length < MAX_WITNESSES && (
              <Button type="button" variant="outline" size="sm" className="w-fit" onClick={addWitness}>
                <Plus className="mr-1 h-4 w-4" /> Thêm người chứng kiến
              </Button>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Địa điểm lập biên bản</label>
            <Input value={diaDiem} onChange={(e) => setDiaDiem(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {/* Kiểm tra hồ sơ kỹ thuật -- chỉ hiện đúng 1 dòng theo hình thức KĐ đã chọn ở trên */}
      {hinhThuc && (
        <Card>
          <CardContent className="flex flex-col gap-4 p-4 sm:p-6">
            <h2 className="text-base font-semibold">Kiểm tra hồ sơ kỹ thuật</h2>

            <div>
              <p className="text-sm font-medium">{HO_SO_LABELS[hinhThuc].tenHoSo}</p>
              <p className="mt-1 text-xs text-muted-foreground">{HO_SO_LABELS[hinhThuc].noiDung}</p>
            </div>

            <RadioPillGroup
              name="ho-so-day-du"
              value={hoSoDayDu === null ? null : hoSoDayDu ? "day_du" : "khong_day_du"}
              onChange={(v) => setHoSoDayDu(v === "day_du")}
              options={HO_SO_OPTIONS}
            />

            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground">Đánh giá kết quả (tự động)</span>
              <span className="text-sm">
                {hoSoDayDu === null ? "—" : hoSoDayDu ? "Đạt" : "Không đạt"}
              </span>
            </div>

            {hoSoDayDu === false && (
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">Lý do không đạt *</label>
                <Textarea value={hoSoLyDo} onChange={(e) => setHoSoLyDo(e.target.value)} />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Checklist theo section */}
      {sections.map(([sectionName, sectionItems]) => {
        const filledCount = sectionItems.filter((i) => itemStates[i.id]?.result != null).length;
        const open = openSections[sectionName];
        return (
          <Card key={sectionName}>
            <button
              type="button"
              onClick={() => toggleSection(sectionName)}
              className="flex w-full items-center justify-between gap-2 p-4 text-left"
            >
              <div className="flex items-center gap-2">
                {open ? (
                  <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                )}
                <span className="font-semibold">{sectionName}</span>
              </div>
              <span
                className={
                  filledCount < sectionItems.length
                    ? "text-sm text-muted-foreground"
                    : "text-sm font-medium text-green-700"
                }
              >
                {filledCount}/{sectionItems.length} đã điền
              </span>
            </button>
            {open && (
              <CardContent className="flex flex-col gap-4 border-t pt-4">
                {sectionItems.map((item) => (
                  <ChecklistItemCard
                    key={item.id}
                    item={item}
                    state={itemStates[item.id]}
                    onChange={(next) => updateItemState(item.id, next)}
                    showMissing={
                      attemptedSubmit &&
                      (!itemStates[item.id]?.result ||
                        (item.has_presence_flag && !itemStates[item.id]?.presence_value))
                    }
                  />
                ))}
              </CardContent>
            )}
          </Card>
        );
      })}

      {/* Các ghi nhận khác -- tự do, không bắt buộc */}
      <Card>
        <CardContent className="flex flex-col gap-1 p-4 sm:p-6">
          <label className="text-sm font-medium">Ghi nhận khác (nếu có)</label>
          <Textarea value={ghiNhanKhac} onChange={(e) => setGhiNhanKhac(e.target.value)} />
        </CardContent>
      </Card>

      {/* 3- Thu thập hình ảnh (mục 8.5, bắt buộc) */}
      <Card>
        <CardContent className="flex flex-col gap-4 p-4 sm:p-6">
          <h2 className="text-base font-semibold">Thu thập hình ảnh</h2>
          <PhotoUploadField
            label="Ảnh tổng thể thiết bị (có mặt kiểm định viên)"
            files={overallPhotos}
            onChange={setOverallPhotos}
            required
          />
          {overallResult === "khong_dat" && (
            <PhotoUploadField
              label="Ảnh chi tiết hạng mục không đạt"
              files={defectPhotos}
              onChange={setDefectPhotos}
              required
            />
          )}
        </CardContent>
      </Card>

      {/* Kết luận */}
      <Card>
        <CardContent className="flex flex-col gap-4 p-4 sm:p-6">
          <h2 className="text-base font-semibold">Kết luận</h2>

          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium">Kết quả tổng</span>
            {overallResult ? (
              <Badge
                variant="outline"
                className={
                  overallResult === "dat"
                    ? "w-fit border-green-200 bg-green-100 text-green-800"
                    : "w-fit border-red-200 bg-red-100 text-red-800"
                }
              >
                {overallResult === "dat" ? "Đạt" : "Không đạt"}
              </Badge>
            ) : (
              <span className="text-sm text-muted-foreground">
                Chưa đủ dữ liệu -- điền đủ kết quả cả {items.length} hạng mục ở trên
              </span>
            )}
          </div>

          {overallResult === "khong_dat" && (
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Lý do không đạt / Kiến nghị *</label>
              <Textarea value={kienNghi} onChange={(e) => setKienNghi(e.target.value)} />
            </div>
          )}

          {overallResult === "khong_dat" && (
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Thời hạn thực hiện kiến nghị</label>
              <Input value={thoiHanKienNghi} onChange={(e) => setThoiHanKienNghi(e.target.value)} />
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Ngày kiểm định *</label>
              <Input
                type="date"
                value={inspectionDate}
                onChange={(e) => setInspectionDate(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Số biên bản</label>
              <Input value={reportNumber} onChange={(e) => setReportNumber(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Thời hạn kiểm định lần sau</label>
              <Input type="date" value={newExpiryDate} onChange={(e) => setNewExpiryDate(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Đã dán tem kiểm định số</label>
              <Input value={soTem} onChange={(e) => setSoTem(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Vị trí dán tem</label>
              <Input value={viTriTem} onChange={(e) => setViTriTem(e.target.value)} />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">File đính kèm (PDF/JPG/PNG, tối đa 10MB)</label>
            <Input
              key={fileInputKey}
              type="file"
              accept={ALLOWED_ATTACHMENT_EXTENSIONS.join(",")}
              onChange={handleFileChange}
            />
            {file && <p className="text-xs text-muted-foreground">Đã chọn: {file.name}</p>}
            {fileError && <p className="text-[0.8rem] font-medium text-destructive">{fileError}</p>}
          </div>
        </CardContent>
      </Card>

      {formErrors.length > 0 && (
        <div className="flex flex-col gap-1 rounded-md border border-destructive/50 bg-destructive/5 p-4">
          {formErrors.map((err, idx) => (
            <p key={idx} className="text-sm font-medium text-destructive">
              {err}
            </p>
          ))}
        </div>
      )}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          disabled={submitting}
          onClick={() => router.push(`/equipment/${equipment.id}`)}
        >
          Hủy
        </Button>
        <Button type="button" disabled={submitting} onClick={handleSubmitClick}>
          {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Lưu
        </Button>
      </div>
    </div>
  );
}

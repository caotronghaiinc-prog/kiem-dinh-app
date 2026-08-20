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
import { BinhApLucExtraForm, type BinhApLucExtraFormHandle } from "./binh-ap-luc-extra-form";
import { NoiHoiExtraForm, type NoiHoiExtraFormHandle } from "./noi-hoi-extra-form";
import {
  NoiGiaNhietDauExtraForm,
  type NoiGiaNhietDauExtraFormHandle,
} from "./noi-gia-nhiet-dau-extra-form";
import { AttachmentLink } from "../attachment-link";
import { InspectionPhotoThumbnails } from "../inspection-photo-thumbnails";
import type {
  ReportMetadataBinhApLuc,
  ReportMetadataNoiHoi,
  ReportMetadataNoiGiaNhietDau,
} from "@/lib/reports/shared";
import type { InspectionPhotoRow } from "../types";
import type {
  ChecklistItem,
  ChecklistResult,
  ChecklistTemplate,
  InspectEquipment,
  PresenceValue,
} from "./types";

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

function makeInitialItemStates(
  items: ChecklistItem[],
  existingResults?: InspectChecklistInitialData["checklistResults"]
): Record<string, ChecklistItemState> {
  const map: Record<string, ChecklistItemState> = {};
  for (const item of items) {
    map[item.id] = { result: null, presence_value: null, values: {}, note: "" };
  }
  // PROMPT-50: sửa bản ghi kiểm định -- điền sẵn kết quả checklist đã lưu
  // (inspection_checklist_results) theo checklist_item_id, item nào không
  // còn khớp (template đổi) thì bỏ qua an toàn.
  for (const r of existingResults ?? []) {
    if (map[r.checklist_item_id]) {
      map[r.checklist_item_id] = {
        result: r.result,
        presence_value: r.presence_value,
        values: r.values ?? {},
        note: r.note ?? "",
      };
    }
  }
  return map;
}

// PROMPT-50: dữ liệu bản ghi kiểm định hiện có, dùng điền sẵn form khi
// mode === "edit". report_metadata khớp đúng cấu trúc submit() dựng ở dưới
// (header chung + binh_ap_luc/noi_hoi/noi_gia_nhiet_dau riêng theo loại).
export interface InspectChecklistInitialData {
  id: string;
  inspection_date: string;
  report_number: string | null;
  new_expiry_date: string | null;
  notes: string | null;
  attachment_url: string | null;
  report_metadata: {
    hinh_thuc_kiem_dinh: HinhThuc | null;
    ly_do_bat_thuong: string | null;
    kiem_dinh_vien: { ten: string; so_hieu: string | null }[];
    nguoi_chung_kien: { ten: string; chuc_vu: string | null }[];
    dia_diem_lap_bien_ban: string | null;
    kien_nghi: string | null;
    thoi_han_kien_nghi: string | null;
    so_tem: string | null;
    vi_tri_tem: string | null;
    kiem_tra_ho_so: { day_du: boolean; ly_do: string | null } | null;
    ghi_nhan_khac: string | null;
    binh_ap_luc: ReportMetadataBinhApLuc | null;
    noi_hoi: ReportMetadataNoiHoi | null;
    noi_gia_nhiet_dau: ReportMetadataNoiGiaNhietDau | null;
  } | null;
  checklistResults: {
    checklist_item_id: string;
    result: ChecklistResult | null;
    presence_value: PresenceValue | null;
    values: Record<string, string>;
    note: string | null;
  }[];
  photos: InspectionPhotoRow[];
}

export function InspectChecklistForm({
  equipment,
  template,
  items,
  mode = "create",
  initialData,
}: {
  equipment: InspectEquipment;
  template: ChecklistTemplate;
  items: ChecklistItem[];
  mode?: "create" | "edit";
  initialData?: InspectChecklistInitialData;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const { profile } = useCurrentUserProfile();

  // PROMPT-33: mẫu "Bình áp lực" (mục I-V) khác hẳn cấu trúc A/B/C của
  // Thiết bị nâng -- ẩn khối "Kiểm tra hồ sơ kỹ thuật"/"Ghi nhận khác"
  // dùng chung (không áp dụng cho loại này) và render thêm
  // BinhApLucExtraForm, không đổi gì luồng Thiết bị nâng hiện có.
  const isBinhApLuc = equipment.type === "Bình áp lực";
  const binhApLucRef = useRef<BinhApLucExtraFormHandle>(null);
  // PROMPT-39: "Nồi hơi" cùng họ mẫu I-V với Bình áp lực -- áp dụng y hệt
  // cách ẩn/thay khối dùng chung.
  const isNoiHoi = equipment.type === "Nồi hơi";
  const noiHoiRef = useRef<NoiHoiExtraFormHandle>(null);
  // PROMPT-41: "Nồi gia nhiệt dầu" cùng họ mẫu I-V, áp dụng y hệt cách
  // ẩn/thay khối dùng chung.
  const isNoiGiaNhietDau = equipment.type === "Nồi gia nhiệt dầu";
  const noiGiaNhietDauRef = useRef<NoiGiaNhietDauExtraFormHandle>(null);

  // PROMPT-50: report_metadata của bản ghi đang sửa (nếu có) -- đọc tắt cho
  // gọn thay vì lặp lại initialData?.report_metadata?.xxx ở mọi state dưới.
  const savedMeta = initialData?.report_metadata;

  // ----- Phần đầu -----
  const [hinhThuc, setHinhThuc] = useState<HinhThuc | null>(() => savedMeta?.hinh_thuc_kiem_dinh ?? null);
  const [lyDoBatThuong, setLyDoBatThuong] = useState(() => savedMeta?.ly_do_bat_thuong ?? "");
  const [kiemDinhVien, setKiemDinhVien] = useState<InspectorRow[]>(() =>
    savedMeta?.kiem_dinh_vien?.length
      ? savedMeta.kiem_dinh_vien.map((r) => ({ ten: r.ten, so_hieu: r.so_hieu ?? "" }))
      : [{ ten: "", so_hieu: "" }]
  );
  const prefilledInspectorRef = useRef(false);
  const [nguoiChungKien, setNguoiChungKien] = useState<WitnessRow[]>(() =>
    savedMeta?.nguoi_chung_kien?.length
      ? savedMeta.nguoi_chung_kien.map((r) => ({ ten: r.ten, chuc_vu: r.chuc_vu ?? "" }))
      : [{ ten: "", chuc_vu: "" }]
  );
  const [diaDiem, setDiaDiem] = useState(() => savedMeta?.dia_diem_lap_bien_ban ?? "");

  useEffect(() => {
    // Sửa bản ghi: giữ đúng kiểm định viên đã lưu, không tự điền theo người
    // đang sửa (có thể không phải người kiểm định gốc).
    if (mode !== "create") return;
    if (prefilledInspectorRef.current || !profile?.full_name) return;
    setKiemDinhVien((rows) => {
      if (rows.length === 1 && rows[0].ten === "" && rows[0].so_hieu === "") {
        prefilledInspectorRef.current = true;
        return [{ ten: profile.full_name ?? "", so_hieu: "" }];
      }
      return rows;
    });
  }, [profile, mode]);

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
    makeInitialItemStates(items, initialData?.checklistResults)
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
  const [hoSoDayDu, setHoSoDayDu] = useState<boolean | null>(() => savedMeta?.kiem_tra_ho_so?.day_du ?? null);
  const [hoSoLyDo, setHoSoLyDo] = useState(() => savedMeta?.kiem_tra_ho_so?.ly_do ?? "");

  // ----- Ghi nhận khác -----
  const [ghiNhanKhac, setGhiNhanKhac] = useState(() => savedMeta?.ghi_nhan_khac ?? "");

  // ----- Ảnh kiểm định (mục 8.5, bắt buộc -- trừ khi sửa và đã có sẵn ảnh
  // cùng loại từ trước, xem validate()) -----
  const [overallPhotos, setOverallPhotos] = useState<File[]>([]);
  const [defectPhotos, setDefectPhotos] = useState<File[]>([]);
  const existingOverallPhotos = useMemo(
    () => initialData?.photos.filter((p) => p.category === "tong_the") ?? [],
    [initialData]
  );
  const existingDefectPhotos = useMemo(
    () => initialData?.photos.filter((p) => p.category === "chi_tiet_khong_dat") ?? [],
    [initialData]
  );

  // ----- Kết luận -----
  const [kienNghi, setKienNghi] = useState(() => savedMeta?.kien_nghi ?? "");
  const [thoiHanKienNghi, setThoiHanKienNghi] = useState(() => savedMeta?.thoi_han_kien_nghi ?? "");
  const [newExpiryDate, setNewExpiryDate] = useState(() => initialData?.new_expiry_date ?? "");
  const [soTem, setSoTem] = useState(() => savedMeta?.so_tem ?? "");
  const [viTriTem, setViTriTem] = useState(() => savedMeta?.vi_tri_tem ?? "");
  const [inspectionDate, setInspectionDate] = useState(() => initialData?.inspection_date ?? todayIso());
  const [reportNumber, setReportNumber] = useState(() => initialData?.report_number ?? "");
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

    if (hinhThuc && !isBinhApLuc && !isNoiHoi && !isNoiGiaNhietDau) {
      if (hoSoDayDu === null) {
        errors.push("Vui lòng chọn Đầy đủ/Không đầy đủ cho phần kiểm tra hồ sơ kỹ thuật.");
      } else if (hoSoDayDu === false && !hoSoLyDo.trim()) {
        errors.push("Vui lòng nhập lý do không đạt cho phần kiểm tra hồ sơ kỹ thuật.");
      }
    }

    if (overallPhotos.length === 0 && existingOverallPhotos.length === 0) {
      errors.push("Vui lòng tải lên ít nhất 1 ảnh tổng thể thiết bị.");
    }
    if (
      overallResult === "khong_dat" &&
      defectPhotos.length === 0 &&
      existingDefectPhotos.length === 0
    ) {
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

    // Sửa (mode="edit"): GIỮ NGUYÊN file đính kèm cũ theo mặc định, chỉ
    // thay khi người dùng chọn file mới -- không bắt buộc phải xóa/chọn lại.
    let attachmentPath: string | null = mode === "edit" ? (initialData?.attachment_url ?? null) : null;
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
      // Bình áp lực/Nồi hơi/Nồi gia nhiệt dầu không dùng khối "Kiểm tra hồ
      // sơ kỹ thuật"/"Ghi nhận khác" chung (thay bằng report_metadata.
      // binh_ap_luc/noi_hoi/noi_gia_nhiet_dau riêng) -- để null thay vì đọc
      // state hoSoDayDu/hoSoLyDo/ghiNhanKhac (form ẩn nên các state này
      // không được người dùng điền).
      kiem_tra_ho_so:
        isBinhApLuc || isNoiHoi || isNoiGiaNhietDau
          ? null
          : hoSoDayDu === null
            ? null
            : { day_du: hoSoDayDu, ly_do: hoSoDayDu ? null : hoSoLyDo.trim() || null },
      ghi_nhan_khac: isBinhApLuc || isNoiHoi || isNoiGiaNhietDau ? null : ghiNhanKhac.trim() || null,
      binh_ap_luc: isBinhApLuc ? (binhApLucRef.current?.buildMetadata() ?? null) : null,
      noi_hoi: isNoiHoi ? (noiHoiRef.current?.buildMetadata() ?? null) : null,
      noi_gia_nhiet_dau: isNoiGiaNhietDau ? (noiGiaNhietDauRef.current?.buildMetadata() ?? null) : null,
    };

    // inspection_history.result vẫn dùng enum cũ 'pass'/'fail'/'pending'
    // (migration 0001, không đổi ở PROMPT-18) -- khác enum
    // 'dat'/'khong_dat'/'khong_danh_gia' của inspection_checklist_results,
    // nên phải map lại kết quả tổng ở đây.
    const historyPayload = {
      inspection_date: inspectionDate,
      result: overallResult === "dat" ? ("pass" as const) : ("fail" as const),
      report_number: reportNumber.trim() || null,
      new_expiry_date: newExpiryDate || null,
      attachment_url: attachmentPath,
      report_metadata: reportMetadata,
    };

    let historyId: string;
    if (mode === "edit") {
      historyId = initialData!.id;
      const { error: updateError } = await supabase
        .from("inspection_history")
        .update(historyPayload)
        .eq("id", historyId);

      if (updateError) {
        setSubmitting(false);
        toast({
          variant: "destructive",
          title: "Cập nhật bản ghi kiểm định thất bại",
          description: logAndGetSafeMessage(updateError, "Có lỗi xảy ra, vui lòng thử lại."),
        });
        return;
      }
    } else {
      const { data: inserted, error: insertError } = await supabase
        .from("inspection_history")
        .insert({ ...historyPayload, equipment_id: equipment.id, notes: null, inspector_id: user.id })
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
      historyId = inserted.id;
    }

    // Sửa: xóa hết kết quả checklist cũ rồi ghi lại toàn bộ -- đơn giản hơn
    // so khớp item nào đổi/không đổi, đúng theo thiết kế PROMPT-50. Từ đây
    // trở đi bản ghi inspection_history đã tồn tại (vừa tạo hoặc đã có sẵn)
    // nên KHÔNG tự xóa lại nếu lỡ có lỗi -- chỉ bù trừ khi mode="create" (bản
    // ghi mới tạo, mồ côi không checklist thì nên hủy hẳn); mode="edit" mà
    // xóa cả bản ghi gốc đang sửa sẽ mất luôn dữ liệu lịch sử thật.
    if (mode === "edit") {
      const { error: deleteResultsError } = await supabase
        .from("inspection_checklist_results")
        .delete()
        .eq("inspection_history_id", historyId);
      if (deleteResultsError) {
        setSubmitting(false);
        toast({
          variant: "destructive",
          title: "Cập nhật checklist thất bại",
          description: logAndGetSafeMessage(
            deleteResultsError,
            "Đã cập nhật thông tin chung nhưng chưa xóa được checklist cũ. Vui lòng thử lại."
          ),
        });
        return;
      }
    }

    const resultsPayload = items.map((item) => {
      const st = itemStates[item.id];
      return {
        inspection_history_id: historyId,
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
      if (mode === "edit") {
        setSubmitting(false);
        toast({
          variant: "destructive",
          title: "Lưu checklist thất bại",
          description:
            "Đã cập nhật thông tin chung nhưng checklist cũ đã bị xóa và chưa ghi lại được. Vui lòng thử lại hoặc báo Admin kiểm tra.",
        });
        return;
      }
      // Không có transaction thật (client gọi PostgREST trực tiếp, mỗi insert
      // là 1 request riêng) -- tự bù trừ bằng cách xóa lại dòng
      // inspection_history vừa tạo để không để lại bản ghi mồ côi không có
      // checklist đi kèm (cascade xóa luôn mọi inspection_checklist_results/
      // inspection_photos đã lỡ ghi được).
      const deletedOk = await compensateDeleteInspectionHistory(supabase, historyId);
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

    // Ảnh kiểm định -- upload từng file MỚI lên cùng bucket ATTACHMENT_BUCKET
    // rồi insert batch vào inspection_photos. Khi sửa, đây là ảnh THÊM VÀO
    // (ảnh cũ giữ nguyên, không xóa/thay -- xem PROMPT-50).
    const photosToUpload: { file: File; category: PhotoCategory }[] = [
      ...overallPhotos.map((file) => ({ file, category: "tong_the" as const })),
      ...defectPhotos.map((file) => ({ file, category: "chi_tiet_khong_dat" as const })),
    ];

    const uploadedPhotos: { storage_path: string; category: PhotoCategory }[] = [];
    let photoStepFailed = false;

    for (const { file, category } of photosToUpload) {
      const dotIndex = file.name.lastIndexOf(".");
      const ext = dotIndex >= 0 ? file.name.slice(dotIndex).toLowerCase() : "";
      const path = `${equipment.id}/${historyId}/${category}-${crypto.randomUUID()}${ext}`;
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
          inspection_history_id: historyId,
          category: p.category,
          storage_path: p.storage_path,
        }))
      );
      if (photosError) photoStepFailed = true;
    }

    if (photoStepFailed) {
      if (mode === "edit") {
        setSubmitting(false);
        toast({
          variant: "destructive",
          title: "Đã lưu bản ghi nhưng thêm ảnh mới thất bại",
          description: "Ảnh cũ vẫn còn nguyên, chỉ ảnh mới chưa lưu được. Vui lòng thử tải ảnh lại.",
        });
        return;
      }
      const deletedOk = await compensateDeleteInspectionHistory(supabase, historyId);
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
    toast({ title: mode === "edit" ? "Đã lưu thay đổi" : "Đã lưu bản ghi kiểm định" });
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

      {/* Kiểm tra hồ sơ kỹ thuật -- chỉ hiện đúng 1 dòng theo hình thức KĐ đã chọn ở trên.
          Không áp dụng cho Bình áp lực/Nồi hơi/Nồi gia nhiệt dầu (thay bằng
          BinhApLucExtraForm/NoiHoiExtraForm/NoiGiaNhietDauExtraForm bên dưới). */}
      {hinhThuc && !isBinhApLuc && !isNoiHoi && !isNoiGiaNhietDau && (
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

      {/* Bình áp lực: phần "còn lại" của mẫu (III.1/III.2/III.3 phụ/III.4/
          III.5.1/IV) -- xem binh-ap-luc-extra-form.tsx. Gộp thành 1 khối
          sau checklist thay vì chen giữa từng section III.3/III.5 để không
          phải đặc cách theo tên section trong vòng lặp checklist dùng
          chung với Thiết bị nâng. */}
      {isBinhApLuc && (
        <BinhApLucExtraForm ref={binhApLucRef} hinhThuc={hinhThuc} initialData={savedMeta?.binh_ap_luc} />
      )}

      {/* Nồi hơi: phần "còn lại" của mẫu (mục 1/2/3.1 phụ/3.2/4/5/IV) --
          xem noi-hoi-extra-form.tsx, cùng lý do gộp 1 khối như Bình áp lực. */}
      {isNoiHoi && <NoiHoiExtraForm ref={noiHoiRef} hinhThuc={hinhThuc} initialData={savedMeta?.noi_hoi} />}

      {/* Nồi gia nhiệt dầu: phần "còn lại" của mẫu (mục 1/2/3.1 phụ/3.2/4/IV)
          -- xem noi-gia-nhiet-dau-extra-form.tsx, cùng lý do gộp 1 khối. */}
      {isNoiGiaNhietDau && (
        <NoiGiaNhietDauExtraForm
          ref={noiGiaNhietDauRef}
          hinhThuc={hinhThuc}
          initialData={savedMeta?.noi_gia_nhiet_dau}
        />
      )}

      {/* Các ghi nhận khác -- tự do, không bắt buộc. Không áp dụng cho Bình
          áp lực/Nồi hơi/Nồi gia nhiệt dầu. */}
      {!isBinhApLuc && !isNoiHoi && !isNoiGiaNhietDau && (
        <Card>
          <CardContent className="flex flex-col gap-1 p-4 sm:p-6">
            <label className="text-sm font-medium">Ghi nhận khác (nếu có)</label>
            <Textarea value={ghiNhanKhac} onChange={(e) => setGhiNhanKhac(e.target.value)} />
          </CardContent>
        </Card>
      )}

      {/* 3- Thu thập hình ảnh (mục 8.5, bắt buộc -- trừ khi sửa và đã có sẵn
          ảnh cùng loại từ trước). Sửa: ảnh cũ hiện read-only bên trên, ảnh
          mới chọn thêm sẽ được CỘNG VÀO (không thay/xóa ảnh cũ). */}
      <Card>
        <CardContent className="flex flex-col gap-4 p-4 sm:p-6">
          <h2 className="text-base font-semibold">Thu thập hình ảnh</h2>
          {initialData && initialData.photos.length > 0 && (
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground">Ảnh đã có</span>
              <InspectionPhotoThumbnails photos={initialData.photos} />
            </div>
          )}
          <PhotoUploadField
            label={
              mode === "edit" ? "Thêm ảnh tổng thể thiết bị (nếu cần)" : "Ảnh tổng thể thiết bị (có mặt kiểm định viên)"
            }
            files={overallPhotos}
            onChange={setOverallPhotos}
            required={existingOverallPhotos.length === 0}
          />
          {overallResult === "khong_dat" && (
            <PhotoUploadField
              label={mode === "edit" ? "Thêm ảnh chi tiết hạng mục không đạt (nếu cần)" : "Ảnh chi tiết hạng mục không đạt"}
              files={defectPhotos}
              onChange={setDefectPhotos}
              required={existingDefectPhotos.length === 0}
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
            {mode === "edit" && initialData?.attachment_url && !file && (
              <div className="flex items-center gap-2">
                <AttachmentLink path={initialData.attachment_url} />
                <span className="text-xs text-muted-foreground">
                  (chọn file mới bên dưới để thay thế, hoặc để trống giữ nguyên)
                </span>
              </div>
            )}
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
          {mode === "edit" ? "Lưu thay đổi" : "Lưu"}
        </Button>
      </div>
    </div>
  );
}

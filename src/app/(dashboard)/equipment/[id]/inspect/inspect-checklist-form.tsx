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
import type { ChecklistItem, ChecklistResult, ChecklistTemplate, InspectEquipment } from "./types";

type HinhThuc = "lan_dau" | "dinh_ky_hang_nam" | "dinh_ky" | "bat_thuong";

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

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
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

  // ----- Kết luận -----
  const [kienNghi, setKienNghi] = useState("");
  const [newExpiryDate, setNewExpiryDate] = useState("");
  const [soTem, setSoTem] = useState("");
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
      so_tem: soTem.trim() || null,
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
      // checklist đi kèm.
      //
      // Lưu ý: RLS DELETE trên inspection_history chỉ cho admin (migration
      // 0002) -- nếu người đang thao tác là inspector, lệnh xóa bù trừ này
      // bị RLS chặn (trả về 0 dòng, không phải lỗi) và bản ghi mồ côi vẫn
      // còn lại, cần admin vào xóa tay. Kiểm tra data trả về để báo đúng
      // tình trạng thay vì giả vờ đã dọn sạch.
      const { data: deleted } = await supabase
        .from("inspection_history")
        .delete()
        .eq("id", inserted.id)
        .select("id");

      setSubmitting(false);
      if (deleted && deleted.length > 0) {
        toast({
          variant: "destructive",
          title: "Lưu checklist thất bại",
          description: "Đã hủy bản ghi kiểm định vừa tạo, vui lòng thử lại.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Lưu checklist thất bại",
          description:
            "Bản ghi kiểm định gốc có thể vẫn còn trong hệ thống (không có quyền tự xóa). Vui lòng báo Admin kiểm tra.",
        });
      }
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

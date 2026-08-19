"use client";

// PROMPT-39: phần "còn lại" của mẫu "Nồi hơi" (mục 1, 2, 3.1 phụ, 3.2, 4,
// 5 đánh giá tổng, IV) -- 29 hạng mục checklist (mục 3.1 + mục 5, migration
// 0022) vẫn dùng thẳng equipment_checklist_items/checklist-item-card.tsx có
// sẵn, xem inspect-checklist-form.tsx. Mirror binh-ap-luc-extra-form.tsx
// (PROMPT-33) nhưng khác cấu trúc mẫu ở vài điểm:
//   - Không có khối "Loại kiểm tra" (Cả ngoài+trong/Chỉ ngoài) của Bình áp
//     lực -- Nồi hơi không phân biệt kiểu này ở mục 3.1 phụ.
//   - Thêm khối mới "3.2 Kiểm tra thay thế" (6 ô, "nếu có" -- gói trong
//     <details> để mặc định thu gọn, không chiếm chỗ khi không dùng).
//   - Mục 3.1 phụ có thêm "Thiết bị báo hiệu mức nước" + "Các thiết bị
//     khác" (Bình áp lực chỉ có Van an toàn/Áp kế/Đo mức).
//   - Mục 4 "Thử nghiệm" CHỈ có Thử bền (không có Thử kín), và có thêm
//     "Đánh giá kết quả" Đạt/Không đạt riêng (Bình áp lực không có).
//   - Không có mục "Thử van an toàn" (III.5.1 của Bình áp lực) -- thay
//     bằng khối nhỏ "5. Thử vận hành - Đánh giá tổng" (16 hạng mục đã nằm
//     trong checklist generic, ở đây chỉ cần nhận xét + Đạt/Không đạt).
//   - Mục IV kết luận riêng hoàn toàn khác: không có "áp suất cài đặt
//     cùng/không cùng vận hành" hay "số GCN/ngày cấp/đơn vị cấp" của Bình
//     áp lực -- thay bằng 2 ô nhiệt độ làm việc + bảng van an toàn 2 dòng
//     (hơi bão hòa/hơi quá nhiệt) x 3 cột (áp suất mở/đóng/số GCN ngày cấp).
import { forwardRef, useImperativeHandle, useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { RadioPillGroup, type RadioPillOption } from "./radio-pill-group";
import type { ReportMetadataNoiHoi } from "@/lib/reports/shared";

type HinhThucKiemDinh = "lan_dau" | "dinh_ky_hang_nam" | "dinh_ky" | "bat_thuong";
type DatKhongDat = "dat" | "khong_dat";
type CoKhongCo = "co" | "khong_co";
type KhongCo = "khong" | "co";

const CO_KHONG_CO_OPTIONS: readonly RadioPillOption<CoKhongCo>[] = [
  { value: "co", label: "Có", activeClassName: "border-blue-600 bg-blue-100 text-blue-800" },
  { value: "khong_co", label: "Không có", activeClassName: "border-gray-500 bg-gray-100 text-gray-800" },
];

const KHONG_CO_OPTIONS: readonly RadioPillOption<KhongCo>[] = [
  { value: "khong", label: "Không", activeClassName: "border-gray-500 bg-gray-100 text-gray-800" },
  { value: "co", label: "Có", activeClassName: "border-red-600 bg-red-100 text-red-800" },
];

const DAT_KHONG_DAT_OPTIONS: readonly RadioPillOption<DatKhongDat>[] = [
  { value: "dat", label: "Đạt", activeClassName: "border-green-600 bg-green-100 text-green-800" },
  { value: "khong_dat", label: "Không đạt", activeClassName: "border-red-600 bg-red-100 text-red-800" },
];

// Nguyên văn mẫu (QTKĐ Nồi hơi, mục 1) -- giữ đúng thứ tự, ĐỘ DÀI CỐ ĐỊNH
// khớp với ReportMetadataNoiHoi.ho_so_*.
const HO_SO_LAN_DAU_LABELS = [
  "Lý lịch nồi hơi, nồi đun nước nóng theo mẫu QCVN: 01-2008/BLĐTBXH",
  "Hồ sơ xuất xưởng thiết bị: Chứng chỉ vật liệu kim loại chế tạo, kim loại hàn bao gồm các chỉ tiêu cơ tính và thành phần hóa học; Tính toán sức bền các bộ phận chịu áp lực; Bản vẽ chế tạo có đầy đủ kích thước; Các chứng chỉ kiểm tra chất lượng mối hàn (theo TCVN 12728:2019 hoặc nhà chế tạo nếu cao hơn); Biên bản thử thuỷ lực xuất xưởng; Các bản hướng dẫn sử dụng, lắp đặt bảo dưỡng và bảo quản thiết bị.",
  "Các chứng chỉ kiểm tra về thiết bị đo lường, cơ cấu an toàn: Giấy chứng nhận kết quả kiểm định/hiệu chuẩn thiết bị đo lường.",
  "Hồ sơ lắp đặt (lắp ráp chế tạo): Thiết kế lắp đặt; Chứng chỉ vật liệu bổ sung của kim loại chế tạo, kim loại hàn khi lắp đặt; Hồ sơ kỹ thuật công tác hàn bộ phận chịu áp lực; Các biên bản nghiệm thu từng bộ phận (nếu có); Biên bản nghiệm thu lắp đặt, lắp ráp sau khi chế tạo.",
  "Các tài liệu khác: Báo cáo kiểm tra tiếp địa chống sét, an toàn điện .... (nếu có)",
];

const HO_SO_DINH_KY_LABELS = [
  "Lý lịch nồi hơi, nồi đun nước nóng theo mẫu QCVN: 01-2008/BLĐTBXH",
  "Biên bản kiểm định và Giấy chứng nhận kết quả kiểm định lần trước",
  "Hồ sơ về quản lý sử dụng, kiểm tra, vận hành, bảo dưỡng",
  "Biên bản thanh tra, kiểm tra của cơ quan có thẩm quyền (nếu có)",
  "Các chứng chỉ kiểm tra về thiết bị đo lường, cơ cấu an toàn: Giấy chứng nhận kết quả kiểm định/hiệu chuẩn thiết bị đo lường.",
  "Các tài liệu khác: Báo cáo kiểm tra tiếp địa chống sét, an toàn điện .... (nếu có)",
];

const HO_SO_BAT_THUONG_LABELS = [
  "Lý lịch nồi hơi, nồi đun nước nóng theo mẫu QCVN 01:2008/BLĐTBXH",
  "Biên bản kiểm định và Giấy chứng nhận kết quả kiểm định lần trước",
  "Hồ sơ về quản lý sử dụng, kiểm tra, vận hành, bảo dưỡng",
  "Các chứng chỉ kiểm tra về thiết bị đo lường, cơ cấu an toàn: Giấy chứng nhận kết quả kiểm định/hiệu chuẩn thiết bị đo lường.",
  "Trường hợp cải tạo, sửa chữa: Hồ sơ thiết kế cải tạo, sửa chữa; Hồ sơ hàn trong quá trình cải tạo, sửa chữa; Biên bản nghiệm thu sau cải tạo, sửa chữa.",
  "Trường hợp thay đổi vị trí lắp đặt: Hồ sơ lắp đặt và các biên bản nghiệm thu lắp đặt, chạy thử.",
  "Trường hợp kiểm định theo yêu cầu của cơ quan chức năng: Biên bản kiểm tra của cơ quan chức năng và các hồ sơ có liên quan.",
  "Các tài liệu khác: Báo cáo kiểm tra tiếp địa chống sét, an toàn điện .... (nếu có)",
];

interface ThietBiDungCuRow {
  ten_goi_ma_hieu: string;
  thang_do: string;
  so_nhan_dang: string;
  so_gcn_kdhc: string;
  han_kdhc: string;
}

interface ThuNghiemDraft {
  moiChat: string;
  apSuatBar: string;
  thoiGianPhut: string;
  roRi: KhongCo | null;
  bienDangNut: KhongCo | null;
  tutAp: KhongCo | null;
  khongThu: boolean;
}

interface Draft {
  hoSoLanDau: (boolean | null)[];
  hoSoDinhKy: (boolean | null)[];
  hoSoBatThuong: (boolean | null)[];
  hoSoNhanXet: string;
  hoSoKetQua: DatKhongDat | null;

  thietBiDungCu: ThietBiDungCuRow[];

  vanAnToanKieuLoai: string;
  vanAnToanKichCo: string;
  vanAnToanSoLuong: string;
  apKeThangDo: string;
  apKeCapCx: string;
  apKeSoTemKd: string;
  apKeHanKd: string;
  doMucKieuLoai: string;
  doMucSoLuong: string;
  baoHieuMucNuocKieuLoai: string;
  baoHieuMucNuocSoLuong: string;
  thietBiKhacMoTa: string;
  kiemTraNgoaiTrongNhanXet: string;
  kiemTraNgoaiTrongKetQua: DatKhongDat | null;

  kttLyDo: string;
  kttBienPhap: string;
  kttPhamVi: string;
  kttKetQua: string;
  kttCanCu: string;
  kttKetLuan: string;

  thuBen: ThuNghiemDraft;
  lyDoKhongThu: string;
  thuNghiemNhanXet: string;
  thuNghiemKetQua: DatKhongDat | null;

  thuVanHanhNhanXet: string;
  thuVanHanhKetQua: DatKhongDat | null;

  nhietDoHoiBaoHoa: string;
  nhietDoHoiQuaNhiet: string;
  vanHbhApSuatMo: string;
  vanHbhApSuatDong: string;
  vanHbhSoGcn: string;
  vanHqnApSuatMo: string;
  vanHqnApSuatDong: string;
  vanHqnSoGcn: string;
}

function makeInitialThuNghiem(): ThuNghiemDraft {
  return { moiChat: "", apSuatBar: "", thoiGianPhut: "", roRi: null, bienDangNut: null, tutAp: null, khongThu: false };
}

function makeInitialDraft(): Draft {
  return {
    hoSoLanDau: Array.from({ length: HO_SO_LAN_DAU_LABELS.length }, () => null),
    hoSoDinhKy: Array.from({ length: HO_SO_DINH_KY_LABELS.length }, () => null),
    hoSoBatThuong: Array.from({ length: HO_SO_BAT_THUONG_LABELS.length }, () => null),
    hoSoNhanXet: "",
    hoSoKetQua: null,

    thietBiDungCu: [],

    vanAnToanKieuLoai: "",
    vanAnToanKichCo: "",
    vanAnToanSoLuong: "",
    apKeThangDo: "",
    apKeCapCx: "",
    apKeSoTemKd: "",
    apKeHanKd: "",
    doMucKieuLoai: "",
    doMucSoLuong: "",
    baoHieuMucNuocKieuLoai: "",
    baoHieuMucNuocSoLuong: "",
    thietBiKhacMoTa: "",
    kiemTraNgoaiTrongNhanXet: "",
    kiemTraNgoaiTrongKetQua: null,

    kttLyDo: "",
    kttBienPhap: "",
    kttPhamVi: "",
    kttKetQua: "",
    kttCanCu: "",
    kttKetLuan: "",

    thuBen: makeInitialThuNghiem(),
    lyDoKhongThu: "",
    thuNghiemNhanXet: "",
    thuNghiemKetQua: null,

    thuVanHanhNhanXet: "",
    thuVanHanhKetQua: null,

    nhietDoHoiBaoHoa: "",
    nhietDoHoiQuaNhiet: "",
    vanHbhApSuatMo: "",
    vanHbhApSuatDong: "",
    vanHbhSoGcn: "",
    vanHqnApSuatMo: "",
    vanHqnApSuatDong: "",
    vanHqnSoGcn: "",
  };
}

function orNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed || null;
}

export interface NoiHoiExtraFormHandle {
  buildMetadata: () => ReportMetadataNoiHoi;
}

/** Nhóm hồ sơ (mục 1) hiện đúng 1 trong 3 theo hình thức kiểm định đã chọn
 * ở phần đầu form -- dinh_ky_hang_nam gộp chung nhóm "dinh_ky" (đúng quy
 * ước đã dùng cho Thiết bị nâng/Bình áp lực). */
function hoSoGroupFor(hinhThuc: HinhThucKiemDinh | null): "lan_dau" | "dinh_ky" | "bat_thuong" | null {
  if (hinhThuc === "lan_dau") return "lan_dau";
  if (hinhThuc === "dinh_ky_hang_nam" || hinhThuc === "dinh_ky") return "dinh_ky";
  if (hinhThuc === "bat_thuong") return "bat_thuong";
  return null;
}

export const NoiHoiExtraForm = forwardRef<NoiHoiExtraFormHandle, { hinhThuc: HinhThucKiemDinh | null }>(
  function NoiHoiExtraForm({ hinhThuc }, ref) {
    const [draft, setDraft] = useState<Draft>(makeInitialDraft);

    function patch(partial: Partial<Draft>) {
      setDraft((d) => ({ ...d, ...partial }));
    }

    function setHoSoItem(group: "lan_dau" | "dinh_ky" | "bat_thuong", idx: number, co: boolean | null) {
      const key = group === "lan_dau" ? "hoSoLanDau" : group === "dinh_ky" ? "hoSoDinhKy" : "hoSoBatThuong";
      setDraft((d) => ({
        ...d,
        [key]: d[key].map((v, i) => (i === idx ? co : v)),
      }));
    }

    function addDungCuRow() {
      setDraft((d) => ({
        ...d,
        thietBiDungCu: [
          ...d.thietBiDungCu,
          { ten_goi_ma_hieu: "", thang_do: "", so_nhan_dang: "", so_gcn_kdhc: "", han_kdhc: "" },
        ],
      }));
    }
    function removeDungCuRow(idx: number) {
      setDraft((d) => ({ ...d, thietBiDungCu: d.thietBiDungCu.filter((_, i) => i !== idx) }));
    }
    function updateDungCuRow(idx: number, field: keyof ThietBiDungCuRow, value: string) {
      setDraft((d) => ({
        ...d,
        thietBiDungCu: d.thietBiDungCu.map((row, i) => (i === idx ? { ...row, [field]: value } : row)),
      }));
    }

    function patchThuBen(partial: Partial<ThuNghiemDraft>) {
      setDraft((d) => ({ ...d, thuBen: { ...d.thuBen, ...partial } }));
    }

    useImperativeHandle(ref, () => ({
      buildMetadata(): ReportMetadataNoiHoi {
        return {
          ho_so_lan_dau: draft.hoSoLanDau.map((co) => ({ co })),
          ho_so_dinh_ky: draft.hoSoDinhKy.map((co) => ({ co })),
          ho_so_bat_thuong: draft.hoSoBatThuong.map((co) => ({ co })),
          ho_so_nhan_xet: orNull(draft.hoSoNhanXet),
          ho_so_ket_qua: draft.hoSoKetQua,

          thiet_bi_dung_cu: draft.thietBiDungCu,

          van_an_toan_kieu_loai: orNull(draft.vanAnToanKieuLoai),
          van_an_toan_kich_co: orNull(draft.vanAnToanKichCo),
          van_an_toan_so_luong: orNull(draft.vanAnToanSoLuong),
          ap_ke_thang_do: orNull(draft.apKeThangDo),
          ap_ke_cap_cx: orNull(draft.apKeCapCx),
          ap_ke_so_tem_kd: orNull(draft.apKeSoTemKd),
          ap_ke_han_kd: orNull(draft.apKeHanKd),
          do_muc_kieu_loai: orNull(draft.doMucKieuLoai),
          do_muc_so_luong: orNull(draft.doMucSoLuong),
          bao_hieu_muc_nuoc_kieu_loai: orNull(draft.baoHieuMucNuocKieuLoai),
          bao_hieu_muc_nuoc_so_luong: orNull(draft.baoHieuMucNuocSoLuong),
          thiet_bi_khac_mo_ta: orNull(draft.thietBiKhacMoTa),
          kiem_tra_ngoai_trong_nhan_xet: orNull(draft.kiemTraNgoaiTrongNhanXet),
          kiem_tra_ngoai_trong_ket_qua: draft.kiemTraNgoaiTrongKetQua,

          kiem_tra_thay_the: {
            ly_do_khong_kiem_tra_trong: orNull(draft.kttLyDo),
            bien_phap_da_ap_dung: orNull(draft.kttBienPhap),
            pham_vi_kiem_tra: orNull(draft.kttPhamVi),
            ket_qua_kiem_tra: orNull(draft.kttKetQua),
            can_cu_ket_luan: orNull(draft.kttCanCu),
            ket_luan_danh_gia: orNull(draft.kttKetLuan),
          },

          thu_ben: {
            moi_chat: orNull(draft.thuBen.moiChat),
            ap_suat_bar: orNull(draft.thuBen.apSuatBar),
            thoi_gian_phut: orNull(draft.thuBen.thoiGianPhut),
            ro_ri: draft.thuBen.roRi,
            bien_dang_nut: draft.thuBen.bienDangNut,
            tut_ap: draft.thuBen.tutAp,
            khong_thu: draft.thuBen.khongThu,
          },
          ly_do_khong_thu: orNull(draft.lyDoKhongThu),
          thu_nghiem_nhan_xet: orNull(draft.thuNghiemNhanXet),
          thu_nghiem_ket_qua: draft.thuNghiemKetQua,

          thu_van_hanh_nhan_xet: orNull(draft.thuVanHanhNhanXet),
          thu_van_hanh_ket_qua: draft.thuVanHanhKetQua,

          nhiet_do_hoi_bao_hoa: orNull(draft.nhietDoHoiBaoHoa),
          nhiet_do_hoi_qua_nhiet: orNull(draft.nhietDoHoiQuaNhiet),
          van_an_toan_dat: {
            hoi_bao_hoa: {
              ap_suat_mo: orNull(draft.vanHbhApSuatMo),
              ap_suat_dong: orNull(draft.vanHbhApSuatDong),
              so_gcn_ngay_cap: orNull(draft.vanHbhSoGcn),
            },
            hoi_qua_nhiet: {
              ap_suat_mo: orNull(draft.vanHqnApSuatMo),
              ap_suat_dong: orNull(draft.vanHqnApSuatDong),
              so_gcn_ngay_cap: orNull(draft.vanHqnSoGcn),
            },
          },
        };
      },
    }));

    const hoSoGroup = hoSoGroupFor(hinhThuc);
    const hoSoLabels =
      hoSoGroup === "lan_dau"
        ? HO_SO_LAN_DAU_LABELS
        : hoSoGroup === "dinh_ky"
          ? HO_SO_DINH_KY_LABELS
          : hoSoGroup === "bat_thuong"
            ? HO_SO_BAT_THUONG_LABELS
            : null;
    const hoSoValues =
      hoSoGroup === "lan_dau"
        ? draft.hoSoLanDau
        : hoSoGroup === "dinh_ky"
          ? draft.hoSoDinhKy
          : hoSoGroup === "bat_thuong"
            ? draft.hoSoBatThuong
            : null;

    return (
      <>
        {/* 1. Kiểm tra hồ sơ -- thay cho khối "Kiểm tra hồ sơ kỹ thuật" chung
            của Thiết bị nâng (ẩn ở inspect-checklist-form.tsx cho loại này). */}
        {hoSoGroup && hoSoLabels && hoSoValues && (
          <Card>
            <CardContent className="flex flex-col gap-4 p-4 sm:p-6">
              <h2 className="text-base font-semibold">1. Kiểm tra hồ sơ</h2>
              {hoSoLabels.map((label, idx) => (
                <div key={idx} className="flex flex-col gap-1 border-b pb-3 last:border-b-0 last:pb-0">
                  <p className="whitespace-pre-line text-sm">{label}</p>
                  <RadioPillGroup
                    name={`ho-so-${hoSoGroup}-${idx}`}
                    value={hoSoValues[idx] === null ? null : hoSoValues[idx] ? "co" : "khong_co"}
                    onChange={(v) => setHoSoItem(hoSoGroup, idx, v === "co")}
                    options={CO_KHONG_CO_OPTIONS}
                  />
                </div>
              ))}
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">Nhận xét</label>
                <Textarea value={draft.hoSoNhanXet} onChange={(e) => patch({ hoSoNhanXet: e.target.value })} />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium">Đánh giá kết quả</span>
                <RadioPillGroup
                  name="ho-so-ket-qua"
                  value={draft.hoSoKetQua}
                  onChange={(v) => patch({ hoSoKetQua: v })}
                  options={DAT_KHONG_DAT_OPTIONS}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* 2. Thiết bị, dụng cụ phục vụ kiểm định -- bảng động */}
        <Card>
          <CardContent className="flex flex-col gap-4 p-4 sm:p-6">
            <h2 className="text-base font-semibold">2. Thiết bị, dụng cụ phục vụ kiểm định</h2>
            {draft.thietBiDungCu.map((row, idx) => (
              <div key={idx} className="flex flex-col gap-2 rounded-md border p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Dòng {idx + 1}</span>
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeDungCuRow(idx)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Input
                    placeholder="Tên gọi - Mã hiệu"
                    value={row.ten_goi_ma_hieu}
                    onChange={(e) => updateDungCuRow(idx, "ten_goi_ma_hieu", e.target.value)}
                  />
                  <Input
                    placeholder="Thang đo"
                    value={row.thang_do}
                    onChange={(e) => updateDungCuRow(idx, "thang_do", e.target.value)}
                  />
                  <Input
                    placeholder="Số nhận dạng"
                    value={row.so_nhan_dang}
                    onChange={(e) => updateDungCuRow(idx, "so_nhan_dang", e.target.value)}
                  />
                  <Input
                    placeholder="Số GCN KĐ/HC"
                    value={row.so_gcn_kdhc}
                    onChange={(e) => updateDungCuRow(idx, "so_gcn_kdhc", e.target.value)}
                  />
                  <Input
                    placeholder="Hạn KĐ/HC"
                    value={row.han_kdhc}
                    onChange={(e) => updateDungCuRow(idx, "han_kdhc", e.target.value)}
                  />
                </div>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" className="w-fit" onClick={addDungCuRow}>
              <Plus className="mr-1 h-4 w-4" /> Thêm dòng
            </Button>
          </CardContent>
        </Card>

        {/* 3.1 (phụ) Các thiết bị đo lường, bảo vệ, an toàn và tự động */}
        <Card>
          <CardContent className="flex flex-col gap-4 p-4 sm:p-6">
            <h2 className="text-base font-semibold">
              3.1 (phụ). Các thiết bị đo lường, bảo vệ, an toàn và tự động
            </h2>

            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium">Van an toàn</span>
              <div className="grid gap-2 sm:grid-cols-3">
                <Input
                  placeholder="Kiểu loại"
                  value={draft.vanAnToanKieuLoai}
                  onChange={(e) => patch({ vanAnToanKieuLoai: e.target.value })}
                />
                <Input
                  placeholder="Kích cỡ"
                  value={draft.vanAnToanKichCo}
                  onChange={(e) => patch({ vanAnToanKichCo: e.target.value })}
                />
                <Input
                  placeholder="Số lượng"
                  value={draft.vanAnToanSoLuong}
                  onChange={(e) => patch({ vanAnToanSoLuong: e.target.value })}
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium">Áp kế</span>
              <div className="grid gap-2 sm:grid-cols-2">
                <Input
                  placeholder="Thang đo"
                  value={draft.apKeThangDo}
                  onChange={(e) => patch({ apKeThangDo: e.target.value })}
                />
                <Input
                  placeholder="Cấp CX"
                  value={draft.apKeCapCx}
                  onChange={(e) => patch({ apKeCapCx: e.target.value })}
                />
                <Input
                  placeholder="Số tem KĐ"
                  value={draft.apKeSoTemKd}
                  onChange={(e) => patch({ apKeSoTemKd: e.target.value })}
                />
                <Input
                  placeholder="Hạn KĐ"
                  value={draft.apKeHanKd}
                  onChange={(e) => patch({ apKeHanKd: e.target.value })}
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium">Đo mức</span>
              <div className="grid gap-2 sm:grid-cols-2">
                <Input
                  placeholder="Kiểu loại"
                  value={draft.doMucKieuLoai}
                  onChange={(e) => patch({ doMucKieuLoai: e.target.value })}
                />
                <Input
                  placeholder="Số lượng"
                  value={draft.doMucSoLuong}
                  onChange={(e) => patch({ doMucSoLuong: e.target.value })}
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium">Thiết bị báo hiệu mức nước và bảo vệ cạn nước</span>
              <div className="grid gap-2 sm:grid-cols-2">
                <Input
                  placeholder="Kiểu loại"
                  value={draft.baoHieuMucNuocKieuLoai}
                  onChange={(e) => patch({ baoHieuMucNuocKieuLoai: e.target.value })}
                />
                <Input
                  placeholder="Số lượng"
                  value={draft.baoHieuMucNuocSoLuong}
                  onChange={(e) => patch({ baoHieuMucNuocSoLuong: e.target.value })}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">
                Các thiết bị khác (nhiệt kế, đồng hồ đo lưu lượng...) -- Số lượng, chủng loại, kích cỡ
              </label>
              <Textarea value={draft.thietBiKhacMoTa} onChange={(e) => patch({ thietBiKhacMoTa: e.target.value })} />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Nhận xét</label>
              <Textarea
                value={draft.kiemTraNgoaiTrongNhanXet}
                onChange={(e) => patch({ kiemTraNgoaiTrongNhanXet: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium">Đánh giá kết quả</span>
              <RadioPillGroup
                name="kiem-tra-ngoai-trong-ket-qua"
                value={draft.kiemTraNgoaiTrongKetQua}
                onChange={(v) => patch({ kiemTraNgoaiTrongKetQua: v })}
                options={DAT_KHONG_DAT_OPTIONS}
              />
            </div>
          </CardContent>
        </Card>

        {/* 3.2 Kết quả áp dụng biện pháp kiểm tra thay thế (nếu có) -- thu
            gọn mặc định vì không phải lúc nào cũng áp dụng. */}
        <Card>
          <CardContent className="p-4 sm:p-6">
            <details>
              <summary className="cursor-pointer text-base font-semibold">
                3.2. Kết quả áp dụng biện pháp kiểm tra thay thế (nếu có)
              </summary>
              <div className="mt-4 flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium">Lý do không thực hiện được kiểm tra bên trong</label>
                  <Textarea value={draft.kttLyDo} onChange={(e) => patch({ kttLyDo: e.target.value })} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium">Biện pháp kiểm tra thay thế đã áp dụng</label>
                  <Textarea value={draft.kttBienPhap} onChange={(e) => patch({ kttBienPhap: e.target.value })} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium">Phạm vi kiểm tra</label>
                  <Textarea value={draft.kttPhamVi} onChange={(e) => patch({ kttPhamVi: e.target.value })} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium">Kết quả kiểm tra</label>
                  <Textarea value={draft.kttKetQua} onChange={(e) => patch({ kttKetQua: e.target.value })} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium">Căn cứ kết luận</label>
                  <Textarea value={draft.kttCanCu} onChange={(e) => patch({ kttCanCu: e.target.value })} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium">Kết luận đánh giá</label>
                  <Textarea value={draft.kttKetLuan} onChange={(e) => patch({ kttKetLuan: e.target.value })} />
                </div>
              </div>
            </details>
          </CardContent>
        </Card>

        {/* 4. Thử nghiệm -- CHỈ Thử bền (khác Bình áp lực có cả Thử kín) */}
        <Card>
          <CardContent className="flex flex-col gap-4 p-4 sm:p-6">
            <h2 className="text-base font-semibold">4. Thử nghiệm</h2>

            <div className="flex flex-col gap-3 rounded-md border p-3">
              <span className="text-sm font-medium">Thử bền</span>
              <div className="grid gap-2 sm:grid-cols-3">
                <Input
                  placeholder="Môi chất thử"
                  value={draft.thuBen.moiChat}
                  onChange={(e) => patchThuBen({ moiChat: e.target.value })}
                />
                <Input
                  placeholder="Áp suất thử (bar)"
                  value={draft.thuBen.apSuatBar}
                  onChange={(e) => patchThuBen({ apSuatBar: e.target.value })}
                />
                <Input
                  placeholder="Thời gian thử (phút)"
                  value={draft.thuBen.thoiGianPhut}
                  onChange={(e) => patchThuBen({ thoiGianPhut: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">Tình trạng rò rỉ</span>
                <RadioPillGroup
                  name="thu-ben-ro-ri"
                  value={draft.thuBen.roRi}
                  onChange={(v) => patchThuBen({ roRi: v })}
                  options={KHONG_CO_OPTIONS}
                />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">Tình trạng biến dạng, nứt</span>
                <RadioPillGroup
                  name="thu-ben-bien-dang-nut"
                  value={draft.thuBen.bienDangNut}
                  onChange={(v) => patchThuBen({ bienDangNut: v })}
                  options={KHONG_CO_OPTIONS}
                />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">Độ tụt áp</span>
                <RadioPillGroup
                  name="thu-ben-tut-ap"
                  value={draft.thuBen.tutAp}
                  onChange={(v) => patchThuBen({ tutAp: v })}
                  options={KHONG_CO_OPTIONS}
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-input"
                  checked={draft.thuBen.khongThu}
                  onChange={(e) => patchThuBen({ khongThu: e.target.checked })}
                />
                Không thử
              </label>
            </div>

            {draft.thuBen.khongThu && (
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">Lý do không thử</label>
                <Textarea value={draft.lyDoKhongThu} onChange={(e) => patch({ lyDoKhongThu: e.target.value })} />
              </div>
            )}
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Nhận xét</label>
              <Textarea value={draft.thuNghiemNhanXet} onChange={(e) => patch({ thuNghiemNhanXet: e.target.value })} />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium">Đánh giá kết quả</span>
              <RadioPillGroup
                name="thu-nghiem-ket-qua"
                value={draft.thuNghiemKetQua}
                onChange={(v) => patch({ thuNghiemKetQua: v })}
                options={DAT_KHONG_DAT_OPTIONS}
              />
            </div>
          </CardContent>
        </Card>

        {/* 5. Thử vận hành -- 16 hạng mục đã hiện qua checklist generic ở
            trên, ở đây chỉ cần nhận xét/đánh giá tổng. */}
        <Card>
          <CardContent className="flex flex-col gap-4 p-4 sm:p-6">
            <h2 className="text-base font-semibold">5. Thử vận hành -- Đánh giá tổng</h2>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Nhận xét</label>
              <Textarea
                value={draft.thuVanHanhNhanXet}
                onChange={(e) => patch({ thuVanHanhNhanXet: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium">Đánh giá kết quả</span>
              <RadioPillGroup
                name="thu-van-hanh-ket-qua"
                value={draft.thuVanHanhKetQua}
                onChange={(v) => patch({ thuVanHanhKetQua: v })}
                options={DAT_KHONG_DAT_OPTIONS}
              />
            </div>
          </CardContent>
        </Card>

        {/* IV. Kết luận riêng -- khác hẳn Bình áp lực: nhiệt độ làm việc +
            bảng van an toàn 2 dòng (hơi bão hòa/hơi quá nhiệt) x 3 cột. */}
        <Card>
          <CardContent className="flex flex-col gap-4 p-4 sm:p-6">
            <h2 className="text-base font-semibold">IV. Kết luận riêng</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">Nhiệt độ làm việc hơi bão hòa (°C)</label>
                <Input
                  value={draft.nhietDoHoiBaoHoa}
                  onChange={(e) => patch({ nhietDoHoiBaoHoa: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">Nhiệt độ làm việc hơi quá nhiệt (°C, nếu có)</label>
                <Input
                  value={draft.nhietDoHoiQuaNhiet}
                  onChange={(e) => patch({ nhietDoHoiQuaNhiet: e.target.value })}
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium">Áp suất đặt của van an toàn</span>
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full min-w-[560px] text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50 text-left">
                      <th className="p-2 font-medium">Vị trí</th>
                      <th className="p-2 font-medium">Áp suất mở (bar)</th>
                      <th className="p-2 font-medium">Áp suất đóng (bar)</th>
                      <th className="p-2 font-medium">Số GCN, ngày cấp</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="p-2 font-medium">Van hơi bão hòa</td>
                      <td className="p-2">
                        <Input
                          value={draft.vanHbhApSuatMo}
                          onChange={(e) => patch({ vanHbhApSuatMo: e.target.value })}
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          value={draft.vanHbhApSuatDong}
                          onChange={(e) => patch({ vanHbhApSuatDong: e.target.value })}
                        />
                      </td>
                      <td className="p-2">
                        <Input value={draft.vanHbhSoGcn} onChange={(e) => patch({ vanHbhSoGcn: e.target.value })} />
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2 font-medium">Van hơi quá nhiệt</td>
                      <td className="p-2">
                        <Input
                          value={draft.vanHqnApSuatMo}
                          onChange={(e) => patch({ vanHqnApSuatMo: e.target.value })}
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          value={draft.vanHqnApSuatDong}
                          onChange={(e) => patch({ vanHqnApSuatDong: e.target.value })}
                        />
                      </td>
                      <td className="p-2">
                        <Input value={draft.vanHqnSoGcn} onChange={(e) => patch({ vanHqnSoGcn: e.target.value })} />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>
      </>
    );
  }
);

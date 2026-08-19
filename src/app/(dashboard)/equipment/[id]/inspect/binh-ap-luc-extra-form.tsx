"use client";

// PROMPT-33: phần "còn lại" của mẫu "Bình áp lực" (mục III.1, III.2, III.3
// phụ, III.4, III.5.1, IV) -- không fit checklist generic (equipment_
// checklist_items/checklist-item-card.tsx vẫn dùng thẳng cho 17 hạng mục
// III.3+III.5, xem inspect-checklist-form.tsx). Tách riêng file này để form
// chính không phình to -- CHỈ render khi equipment.type === "Bình áp lực"
// (xem chỗ gọi trong inspect-checklist-form.tsx), không ảnh hưởng luồng
// Thiết bị nâng hiện có.
//
// State quản lý bằng 1 object "draft" duy nhất (string thường thay vì
// string | null để input controlled đơn giản, giống cách phần đầu form
// chính quản lý kiemDinhVien/nguoiChungKien) -- chỉ chuyển null khi build
// payload cuối cùng qua buildMetadata() (expose qua ref, parent gọi lúc
// submit). Mọi field đều optional -- không có validate() ở đây.
import { forwardRef, useImperativeHandle, useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { RadioPillGroup, type RadioPillOption } from "./radio-pill-group";
import type { ReportMetadataBinhApLuc } from "@/lib/reports/shared";

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

const LOAI_KIEM_TRA_OPTIONS: readonly RadioPillOption<"ca_ngoai_trong" | "chi_ngoai">[] = [
  {
    value: "ca_ngoai_trong",
    label: "Cả ngoài + trong",
    activeClassName: "border-primary bg-primary/10 text-primary",
  },
  {
    value: "chi_ngoai",
    label: "Chỉ ngoài, không kiểm tra trong",
    activeClassName: "border-primary bg-primary/10 text-primary",
  },
];

const VAN_THU_TRUC_TIEP_OPTIONS: readonly RadioPillOption<"dat" | "khong_dat" | "khong_ap_dung">[] = [
  { value: "dat", label: "Đạt", activeClassName: "border-green-600 bg-green-100 text-green-800" },
  { value: "khong_dat", label: "Không đạt", activeClassName: "border-red-600 bg-red-100 text-red-800" },
  {
    value: "khong_ap_dung",
    label: "Không áp dụng",
    activeClassName: "border-gray-500 bg-gray-100 text-gray-800",
  },
];

const VAN_CHAP_NHAN_OPTIONS: readonly RadioPillOption<"chap_nhan" | "khong_chap_nhan">[] = [
  { value: "chap_nhan", label: "Chấp nhận", activeClassName: "border-green-600 bg-green-100 text-green-800" },
  {
    value: "khong_chap_nhan",
    label: "Không chấp nhận",
    activeClassName: "border-red-600 bg-red-100 text-red-800",
  },
];

// Nguyên văn mẫu (QTKĐ Bình áp lực, mục III.1) -- giữ đúng thứ tự, ĐỘ DÀI
// CỐ ĐỊNH khớp với ReportMetadataBinhApLuc.ho_so_*.
const HO_SO_LAN_DAU_LABELS = [
  "Lý lịch bình chịu áp lực theo mẫu QCVN: 01-2008/BLĐTBXH",
  "+ Các chứng chỉ về kim loại chế tạo (Chứng chỉ vật liệu hoặc báo cáo siêu âm kiểm tra chiều dày).\n+ Kết quả kiểm tra chất lượng mối hàn;\n+ Biên bản nghiệm thử.",
  "Giấy chứng nhận kiểm định/hiệu chuẩn thiết bị đo lường",
  "Báo cáo đo điện trở tiếp đất chống sét, điện trở tiếp đất an toàn điện (nếu có).",
  "Biên bản nghiệm thu lắp đặt (đối với bình cố định)",
];

const HO_SO_DINH_KY_LABELS = [
  "Lý lịch bình chịu áp lực theo mẫu QCVN: 01-2008/BLĐTBXH",
  "Biên bản Kiểm định và Giấy chứng nhận kết quả kiểm định lần trước",
  "Hồ sơ về quản lý sử dụng, kiểm tra, vận hành, bảo dưỡng",
  "Biên bản thanh tra, kiểm tra tra của cơ quan có thẩm quyền",
  "Giấy chứng nhận kiểm định/hiệu chuẩn thiết bị đo lường",
  "Báo cáo đo điện trở tiếp đất chống sét, điện trở tiếp đất an toàn điện (nếu có).",
];

const HO_SO_BAT_THUONG_LABELS = [
  "Lý lịch bình chịu áp lực theo mẫu QCVN: 01-2008/BLĐTBXH",
  "Biên bản Kiểm định và Giấy chứng nhận kết quả kiểm định lần trước",
  "Hồ sơ về quản lý sử dụng, kiểm tra, vận hành, bảo dưỡng",
  "Giấy chứng nhận kiểm định/hiệu chuẩn thiết bị đo lường",
  "Báo cáo đo điện trở tiếp đất chống sét, điện trở tiếp đất an toàn điện (nếu có).",
  "Trường hợp cải tạo, sửa chữa:\n+ Hồ sơ thiết kế cải tạo, sửa chữa;\n+ Hồ sơ hàn trong quá trình cải tạo, sửa chữa;\n+ Biên bản thử nghiệm sau cải tạo, sửa chữa.",
  "Trường hợp thay đổi vị trí lắp đặt (đối với bình cố định):\nHồ sơ lắp đặt và các biên bản nghiệm thu lắp đặt.",
  "Trường hợp kiểm định theo yêu cầu của cơ quan chức năng:\nBiên bản yêu cầu kiểm định của cơ quan chức năng và các hồ sơ có liên quan.",
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
  bienDangNut: KhongCo | null; // chỉ Thử bền có
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

  loaiKiemTra: "ca_ngoai_trong" | "chi_ngoai" | null;
  lyDoKhongKiemTraTrong: string;
  vanAnToanKieuLoai: string;
  vanAnToanKichCo: string;
  vanAnToanSoLuong: string;
  apKeThangDo: string;
  apKeCapCx: string;
  apKeSoTemKd: string;
  apKeHanKd: string;
  doMucKieuLoai: string;
  doMucSoLuong: string;
  kiemTraNgoaiTrongNhanXet: string;
  kiemTraNgoaiTrongKetQua: DatKhongDat | null;

  thuBen: ThuNghiemDraft;
  thuKin: Omit<ThuNghiemDraft, "bienDangNut">;
  lyDoKhongThu: string;
  thuNghiemNhanXet: string;

  vanThuTrucTiep: "dat" | "khong_dat" | "khong_ap_dung" | null;
  vanThuChuyenDungApDung: boolean;
  vanPheDuyetNgay: string;
  vanApSuatCaiDat: string;
  vanTinhTrangNiemChi: DatKhongDat | null;
  vanHoSoDayDu: DatKhongDat | null;
  vanApSuatPhuHop: DatKhongDat | null;
  vanChapNhanKetQua: "chap_nhan" | "khong_chap_nhan" | null;

  apSuatCaiDatCungVanHanh: string;
  apSuatCaiDatKhongCungVanHanh: string;
  soGcnKetQua: string;
  ngayCapGcn: string;
  donViCapGcn: string;
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

    loaiKiemTra: null,
    lyDoKhongKiemTraTrong: "",
    vanAnToanKieuLoai: "",
    vanAnToanKichCo: "",
    vanAnToanSoLuong: "",
    apKeThangDo: "",
    apKeCapCx: "",
    apKeSoTemKd: "",
    apKeHanKd: "",
    doMucKieuLoai: "",
    doMucSoLuong: "",
    kiemTraNgoaiTrongNhanXet: "",
    kiemTraNgoaiTrongKetQua: null,

    thuBen: makeInitialThuNghiem(),
    thuKin: makeInitialThuNghiem(),
    lyDoKhongThu: "",
    thuNghiemNhanXet: "",

    vanThuTrucTiep: null,
    vanThuChuyenDungApDung: false,
    vanPheDuyetNgay: "",
    vanApSuatCaiDat: "",
    vanTinhTrangNiemChi: null,
    vanHoSoDayDu: null,
    vanApSuatPhuHop: null,
    vanChapNhanKetQua: null,

    apSuatCaiDatCungVanHanh: "",
    apSuatCaiDatKhongCungVanHanh: "",
    soGcnKetQua: "",
    ngayCapGcn: "",
    donViCapGcn: "",
  };
}

function orNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed || null;
}

export interface BinhApLucExtraFormHandle {
  buildMetadata: () => ReportMetadataBinhApLuc;
}

/** Nhóm hồ sơ (III.1) hiện đúng 1 trong 3 theo hình thức kiểm định đã chọn
 * ở phần đầu form -- dinh_ky_hang_nam gộp chung nhóm "dinh_ky" (đúng quy
 * ước đã dùng cho Thiết bị nâng, xem HO_SO_LABELS trong inspect-checklist-
 * form.tsx). */
function hoSoGroupFor(hinhThuc: HinhThucKiemDinh | null): "lan_dau" | "dinh_ky" | "bat_thuong" | null {
  if (hinhThuc === "lan_dau") return "lan_dau";
  if (hinhThuc === "dinh_ky_hang_nam" || hinhThuc === "dinh_ky") return "dinh_ky";
  if (hinhThuc === "bat_thuong") return "bat_thuong";
  return null;
}

export const BinhApLucExtraForm = forwardRef<BinhApLucExtraFormHandle, { hinhThuc: HinhThucKiemDinh | null }>(
  function BinhApLucExtraForm({ hinhThuc }, ref) {
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
    function patchThuKin(partial: Partial<Omit<ThuNghiemDraft, "bienDangNut">>) {
      setDraft((d) => ({ ...d, thuKin: { ...d.thuKin, ...partial } }));
    }

    useImperativeHandle(ref, () => ({
      buildMetadata(): ReportMetadataBinhApLuc {
        return {
          ho_so_lan_dau: draft.hoSoLanDau.map((co) => ({ co })),
          ho_so_dinh_ky: draft.hoSoDinhKy.map((co) => ({ co })),
          ho_so_bat_thuong: draft.hoSoBatThuong.map((co) => ({ co })),
          ho_so_nhan_xet: orNull(draft.hoSoNhanXet),
          ho_so_ket_qua: draft.hoSoKetQua,

          thiet_bi_dung_cu: draft.thietBiDungCu,

          loai_kiem_tra: draft.loaiKiemTra,
          ly_do_khong_kiem_tra_trong: orNull(draft.lyDoKhongKiemTraTrong),
          van_an_toan_kieu_loai: orNull(draft.vanAnToanKieuLoai),
          van_an_toan_kich_co: orNull(draft.vanAnToanKichCo),
          van_an_toan_so_luong: orNull(draft.vanAnToanSoLuong),
          ap_ke_thang_do: orNull(draft.apKeThangDo),
          ap_ke_cap_cx: orNull(draft.apKeCapCx),
          ap_ke_so_tem_kd: orNull(draft.apKeSoTemKd),
          ap_ke_han_kd: orNull(draft.apKeHanKd),
          do_muc_kieu_loai: orNull(draft.doMucKieuLoai),
          do_muc_so_luong: orNull(draft.doMucSoLuong),
          kiem_tra_ngoai_trong_nhan_xet: orNull(draft.kiemTraNgoaiTrongNhanXet),
          kiem_tra_ngoai_trong_ket_qua: draft.kiemTraNgoaiTrongKetQua,

          thu_ben: {
            moi_chat: orNull(draft.thuBen.moiChat),
            ap_suat_bar: orNull(draft.thuBen.apSuatBar),
            thoi_gian_phut: orNull(draft.thuBen.thoiGianPhut),
            ro_ri: draft.thuBen.roRi,
            bien_dang_nut: draft.thuBen.bienDangNut,
            tut_ap: draft.thuBen.tutAp,
            khong_thu: draft.thuBen.khongThu,
          },
          thu_kin: {
            moi_chat: orNull(draft.thuKin.moiChat),
            ap_suat_bar: orNull(draft.thuKin.apSuatBar),
            thoi_gian_phut: orNull(draft.thuKin.thoiGianPhut),
            ro_ri: draft.thuKin.roRi,
            tut_ap: draft.thuKin.tutAp,
            khong_thu: draft.thuKin.khongThu,
          },
          ly_do_khong_thu: orNull(draft.lyDoKhongThu),
          thu_nghiem_nhan_xet: orNull(draft.thuNghiemNhanXet),

          van_thu_truc_tiep: draft.vanThuTrucTiep,
          van_thu_chuyen_dung_ap_dung: draft.vanThuChuyenDungApDung,
          van_phe_duyet_ngay: orNull(draft.vanPheDuyetNgay),
          van_ap_suat_cai_dat: orNull(draft.vanApSuatCaiDat),
          van_tinh_trang_niem_chi: draft.vanTinhTrangNiemChi,
          van_ho_so_day_du: draft.vanHoSoDayDu,
          van_ap_suat_phu_hop: draft.vanApSuatPhuHop,
          van_chap_nhan_ket_qua: draft.vanChapNhanKetQua,

          ap_suat_cai_dat_cung_van_hanh: orNull(draft.apSuatCaiDatCungVanHanh),
          ap_suat_cai_dat_khong_cung_van_hanh: orNull(draft.apSuatCaiDatKhongCungVanHanh),
          so_gcn_ket_qua: orNull(draft.soGcnKetQua),
          ngay_cap_gcn: orNull(draft.ngayCapGcn),
          don_vi_cap_gcn: orNull(draft.donViCapGcn),
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

    const showKhongThuLyDo = draft.thuBen.khongThu || draft.thuKin.khongThu;

    return (
      <>
        {/* III.1 Kiểm tra hồ sơ -- thay cho khối "Kiểm tra hồ sơ kỹ thuật" chung
            của Thiết bị nâng (ẩn ở inspect-checklist-form.tsx cho loại này). */}
        {hoSoGroup && hoSoLabels && hoSoValues && (
          <Card>
            <CardContent className="flex flex-col gap-4 p-4 sm:p-6">
              <h2 className="text-base font-semibold">III.1. Kiểm tra hồ sơ</h2>
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

        {/* III.2 Thiết bị, dụng cụ phục vụ kiểm định -- bảng động */}
        <Card>
          <CardContent className="flex flex-col gap-4 p-4 sm:p-6">
            <h2 className="text-base font-semibold">III.2. Thiết bị, dụng cụ phục vụ kiểm định</h2>
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

        {/* III.3 (phụ) Tình trạng thiết bị kiểm tra an toàn */}
        <Card>
          <CardContent className="flex flex-col gap-4 p-4 sm:p-6">
            <h2 className="text-base font-semibold">III.3 (phụ). Tình trạng thiết bị kiểm tra an toàn</h2>

            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium">Loại kiểm tra</span>
              <RadioPillGroup
                name="loai-kiem-tra"
                value={draft.loaiKiemTra}
                onChange={(v) => patch({ loaiKiemTra: v })}
                options={LOAI_KIEM_TRA_OPTIONS}
              />
            </div>
            {draft.loaiKiemTra === "chi_ngoai" && (
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">Lý do</label>
                <Textarea
                  value={draft.lyDoKhongKiemTraTrong}
                  onChange={(e) => patch({ lyDoKhongKiemTraTrong: e.target.value })}
                />
              </div>
            )}

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

        {/* III.4 Thử nghiệm */}
        <Card>
          <CardContent className="flex flex-col gap-6 p-4 sm:p-6">
            <h2 className="text-base font-semibold">III.4. Thử nghiệm</h2>

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

            <div className="flex flex-col gap-3 rounded-md border p-3">
              <span className="text-sm font-medium">Thử kín</span>
              <div className="grid gap-2 sm:grid-cols-3">
                <Input
                  placeholder="Môi chất thử"
                  value={draft.thuKin.moiChat}
                  onChange={(e) => patchThuKin({ moiChat: e.target.value })}
                />
                <Input
                  placeholder="Áp suất thử (bar)"
                  value={draft.thuKin.apSuatBar}
                  onChange={(e) => patchThuKin({ apSuatBar: e.target.value })}
                />
                <Input
                  placeholder="Thời gian thử (phút)"
                  value={draft.thuKin.thoiGianPhut}
                  onChange={(e) => patchThuKin({ thoiGianPhut: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">Tình trạng rò rỉ</span>
                <RadioPillGroup
                  name="thu-kin-ro-ri"
                  value={draft.thuKin.roRi}
                  onChange={(v) => patchThuKin({ roRi: v })}
                  options={KHONG_CO_OPTIONS}
                />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">Độ tụt áp</span>
                <RadioPillGroup
                  name="thu-kin-tut-ap"
                  value={draft.thuKin.tutAp}
                  onChange={(v) => patchThuKin({ tutAp: v })}
                  options={KHONG_CO_OPTIONS}
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-input"
                  checked={draft.thuKin.khongThu}
                  onChange={(e) => patchThuKin({ khongThu: e.target.checked })}
                />
                Không thử
              </label>
            </div>

            {showKhongThuLyDo && (
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">Lý do không thử</label>
                <Textarea value={draft.lyDoKhongThu} onChange={(e) => patch({ lyDoKhongThu: e.target.value })} />
              </div>
            )}
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Nhận xét</label>
              <Textarea value={draft.thuNghiemNhanXet} onChange={(e) => patch({ thuNghiemNhanXet: e.target.value })} />
            </div>
          </CardContent>
        </Card>

        {/* III.5.1 Thử van an toàn */}
        <Card>
          <CardContent className="flex flex-col gap-4 p-4 sm:p-6">
            <h2 className="text-base font-semibold">III.5.1. Thử van an toàn</h2>

            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium">Thử trực tiếp</span>
              <RadioPillGroup
                name="van-thu-truc-tiep"
                value={draft.vanThuTrucTiep}
                onChange={(v) => patch({ vanThuTrucTiep: v })}
                options={VAN_THU_TRUC_TIEP_OPTIONS}
              />
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-input"
                checked={draft.vanThuChuyenDungApDung}
                onChange={(e) => patch({ vanThuChuyenDungApDung: e.target.checked })}
              />
              Có thử trên thiết bị chuyên dùng
            </label>

            {draft.vanThuChuyenDungApDung && (
              <>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium">Ngày phê duyệt hồ sơ</label>
                    <Input
                      value={draft.vanPheDuyetNgay}
                      onChange={(e) => patch({ vanPheDuyetNgay: e.target.value })}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium">Áp suất cài đặt</label>
                    <Input
                      value={draft.vanApSuatCaiDat}
                      onChange={(e) => patch({ vanApSuatCaiDat: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground">Tình trạng niêm chì</span>
                  <RadioPillGroup
                    name="van-tinh-trang-niem-chi"
                    value={draft.vanTinhTrangNiemChi}
                    onChange={(v) => patch({ vanTinhTrangNiemChi: v })}
                    options={DAT_KHONG_DAT_OPTIONS}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground">Hồ sơ đầy đủ, hợp lệ</span>
                  <RadioPillGroup
                    name="van-ho-so-day-du"
                    value={draft.vanHoSoDayDu}
                    onChange={(v) => patch({ vanHoSoDayDu: v })}
                    options={DAT_KHONG_DAT_OPTIONS}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground">Áp suất cài đặt phù hợp</span>
                  <RadioPillGroup
                    name="van-ap-suat-phu-hop"
                    value={draft.vanApSuatPhuHop}
                    onChange={(v) => patch({ vanApSuatPhuHop: v })}
                    options={DAT_KHONG_DAT_OPTIONS}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-medium">Kết quả</span>
                  <RadioPillGroup
                    name="van-chap-nhan-ket-qua"
                    value={draft.vanChapNhanKetQua}
                    onChange={(v) => patch({ vanChapNhanKetQua: v })}
                    options={VAN_CHAP_NHAN_OPTIONS}
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* IV Kết luận riêng (thay khối "tầm với/trọng tải" của Thiết bị nâng) */}
        <Card>
          <CardContent className="flex flex-col gap-4 p-4 sm:p-6">
            <h2 className="text-base font-semibold">IV. Kết luận riêng</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">
                  Áp suất cài đặt van an toàn (hiệu chỉnh cùng quá trình kiểm tra vận hành)
                </label>
                <Input
                  value={draft.apSuatCaiDatCungVanHanh}
                  onChange={(e) => patch({ apSuatCaiDatCungVanHanh: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">
                  Áp suất cài đặt van an toàn (hiệu chỉnh không cùng quá trình kiểm tra vận hành)
                </label>
                <Input
                  value={draft.apSuatCaiDatKhongCungVanHanh}
                  onChange={(e) => patch({ apSuatCaiDatKhongCungVanHanh: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">Số GCN</label>
                <Input value={draft.soGcnKetQua} onChange={(e) => patch({ soGcnKetQua: e.target.value })} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">Ngày cấp</label>
                <Input value={draft.ngayCapGcn} onChange={(e) => patch({ ngayCapGcn: e.target.value })} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">Đơn vị cấp</label>
                <Input value={draft.donViCapGcn} onChange={(e) => patch({ donViCapGcn: e.target.value })} />
              </div>
            </div>
          </CardContent>
        </Card>
      </>
    );
  }
);

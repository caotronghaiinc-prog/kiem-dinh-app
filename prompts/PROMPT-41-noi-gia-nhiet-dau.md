# PROMPT-41: Nồi gia nhiệt dầu — thêm loại thiết bị mới + spec fields + report_metadata + form + registry

Mirror chính xác pattern PROMPT-33 (Bình áp lực) và PROMPT-39 (Nồi hơi). Migration
checklist (mục 3.1 = 14 hạng mục, mục 5 = 4 hạng mục, tổng 18 dòng, KHÔNG có hạng
mục nào cần ô giá trị số) đã có sẵn ở
`supabase/migrations/0023_seed_checklist_noi_gia_nhiet_dau.sql` — KHÔNG cần đụng
tới, chỉ đọc để biết item_order 1-18 tương ứng hạng mục nào.

Nguồn: `uploads/QTKD Noi gia nhiet dau.pdf` trang 12-16 (không có trong repo, xem lại
nội dung trích dẫn bên dưới — đã đối chiếu trực tiếp ảnh chụp cả 5 trang, đủ để code
không cần mở lại PDF).

⚠️ Đây là loại thiết bị **HOÀN TOÀN MỚI**, chưa có trong danh mục "Loại thiết bị" của
app — khác với Nồi hơi (đã có sẵn trong danh mục từ trước).

## 1. `src/lib/equipment/form-schema.ts` — thêm vào danh mục loại thiết bị

Trong `EQUIPMENT_TYPE_GROUPS`, nhóm `"Nhóm KTAT"`, thêm `"Nồi gia nhiệt dầu"` ngay
sau `"Bình áp lực"` (dòng 19):

```ts
options: [
  "Nồi hơi",
  "Bình áp lực",
  "Nồi gia nhiệt dầu",
  "Hệ thống ống áp lực",
  ...
```

## 2. `src/lib/equipment/spec-fields.ts` — thêm mục I "Nồi gia nhiệt dầu"

Thêm entry mới vào `EQUIPMENT_SPEC_FIELDS`, ngay sau `"Nồi hơi"` (nếu đã có từ
PROMPT-39) hoặc sau `"Bình áp lực"`:

```ts
"Nồi gia nhiệt dầu": [
  { key: "loai_ma_hieu", label: "Loại, mã hiệu", unit: null },
  { key: "nuoc_che_tao", label: "Nước chế tạo", unit: null },
  { key: "cong_suat", label: "Công suất", unit: "kcal/h" },
  { key: "ap_suat_thiet_ke", label: "Áp suất thiết kế", unit: "bar" },
  { key: "ap_suat_lam_viec_lon_nhat", label: "Áp suất làm việc lớn nhất", unit: "bar" },
  { key: "moi_chat_lam_viec", label: "Môi chất làm việc", unit: null },
  { key: "nhiet_do_lam_viec_lon_nhat", label: "Nhiệt độ làm việc lớn nhất", unit: "°C" },
  { key: "nhien_lieu_su_dung", label: "Nhiên liệu sử dụng", unit: null },
  { key: "cong_dung", label: "Công dụng của nồi", unit: null },
],
```

(Số chế tạo/Năm chế tạo/Nhà chế tạo dùng thẳng `serial_number`/`manufacture_year`/
`manufacturer` có sẵn trên `equipment`, không lặp lại — giống Bình áp lực/Nồi hơi.)

## 3. `src/lib/reports/shared.ts` — thêm `ReportMetadataNoiGiaNhietDau`

Thêm interface mới (đặt sau `ReportMetadataNoiHoi`), và thêm field
`noi_gia_nhiet_dau?: ReportMetadataNoiGiaNhietDau | null;` vào `ReportMetadata`:

```ts
export interface ReportMetadataNoiGiaNhietDau {
  // ----- 1. Kiểm tra hồ sơ (3 mảng ĐỘ DÀI CỐ ĐỊNH) -----
  // LƯU Ý: nhóm "lần đầu" chỉ có 4 phần tử (khác Bình áp lực/Nồi hơi đều là 5).
  ho_so_lan_dau: { co: boolean | null }[]; // 4 phần tử
  ho_so_dinh_ky: { co: boolean | null }[]; // 6 phần tử
  ho_so_bat_thuong: { co: boolean | null }[]; // 8 phần tử
  ho_so_nhan_xet: string | null;
  ho_so_ket_qua: "dat" | "khong_dat" | null;

  // ----- 2. Thiết bị, dụng cụ phục vụ kiểm định (bảng động) -----
  thiet_bi_dung_cu: {
    ten_goi_ma_hieu: string;
    thang_do: string;
    so_nhan_dang: string;
    so_gcn_kdhc: string;
    han_kdhc: string;
  }[];

  // ----- 3.1 (phụ) Tình trạng của các thiết bị kiểm tra an toàn, dụng cụ đo kiểm -----
  // LƯU Ý: dòng thứ 3 là "Nhiệt kế" (không phải "Đo mức" như Bình áp lực/Nồi hơi) --
  // nồi gia nhiệt dầu dùng dầu tải nhiệt tuần hoàn kín, không có mức nước để đo.
  van_an_toan_kieu_loai: string | null;
  van_an_toan_kich_co: string | null;
  van_an_toan_so_luong: string | null;
  ap_ke_thang_do: string | null;
  ap_ke_cap_cx: string | null;
  ap_ke_so_tem_kd: string | null;
  ap_ke_han_kd: string | null;
  nhiet_ke_kieu_loai: string | null;
  nhiet_ke_so_tem_kdhc: string | null;
  nhiet_ke_so_luong: string | null;
  kiem_tra_ngoai_trong_nhan_xet: string | null;
  kiem_tra_ngoai_trong_ket_qua: "dat" | "khong_dat" | null;

  // ----- 3.2 Kết quả áp dụng biện pháp kiểm tra thay thế (nếu có) -----
  // Giống hệt cấu trúc mục 3.2 của Nồi hơi (ReportMetadataNoiHoi.kiem_tra_thay_the).
  kiem_tra_thay_the: {
    ly_do_khong_kiem_tra_trong: string | null;
    bien_phap_da_ap_dung: string | null;
    pham_vi_kiem_tra: string | null;
    ket_qua_kiem_tra: string | null;
    can_cu_ket_luan: string | null;
    ket_luan_danh_gia: string | null;
  };

  // ----- 4. Thử nghiệm (CẢ Thử bền VÀ Thử kín -- giống Bình áp lực) -----
  thu_ben: {
    moi_chat: string | null;
    ap_suat_bar: string | null;
    thoi_gian_phut: string | null;
    ro_ri: "khong" | "co" | null;
    bien_dang_nut: "khong" | "co" | null;
    tut_ap: "khong" | "co" | null;
    khong_thu: boolean;
  };
  thu_kin: {
    moi_chat: string | null;
    ap_suat_bar: string | null;
    thoi_gian_phut: string | null;
    ro_ri: "khong" | "co" | null;
    tut_ap: "khong" | "co" | null;
    khong_thu: boolean;
  };
  ly_do_khong_thu: string | null;
  thu_nghiem_nhan_xet: string | null;
  thu_nghiem_ket_qua: "dat" | "khong_dat" | null;

  // ----- 5. Thử vận hành -- 4 hạng mục ĐÃ nằm trong checklist generic
  // (migration 0023, item_order 15-18). Mẫu giấy KHÔNG có dòng "Nhận xét/
  // Đánh giá kết quả" riêng cho mục này (giống Bình áp lực, khác Nồi hơi) --
  // KHÔNG thêm field ở đây, không có gì để lưu thêm.

  // ----- IV Kết luận (riêng) -----
  // Mục IV.3 "Áp suất làm việc lớn nhất" và IV.4 "Nhiệt độ làm việc lớn nhất"
  // tái dùng THẲNG spec_values.ap_suat_lam_viec_lon_nhat/nhiet_do_lam_viec_lon_nhat,
  // KHÔNG lặp lại ở đây (giống hệt Bình áp lực).
  ap_suat_cai_dat_cung_kiem_dinh: string | null; // "Hiệu chỉnh cùng quá trình kiểm định"
  ap_suat_cai_dat_khong_cung_kiem_dinh: string | null; // "Hiệu chỉnh không cùng quá trình kiểm định"
  so_gcn_ket_qua: string | null;
  ngay_cap_gcn: string | null;
  don_vi_cap_gcn: string | null;
}
```

## 4. `src/lib/reports/noi-gia-nhiet-dau.ts` — module build data mới (mirror `binh-ap-luc.ts`/`noi-hoi.ts`)

```ts
import {
  CHECKED,
  UNCHECKED,
  buildCommonReportData,
  type BuildReportDataInput,
  type ReportMetadataNoiGiaNhietDau,
} from "@/lib/reports/shared";

function checkedIf(condition: boolean): string {
  return condition ? CHECKED : UNCHECKED;
}

function buildHoSoGroupTags(
  data: Record<string, unknown>,
  key: "hs1" | "hs2" | "hs3",
  items: { co: boolean | null }[] | undefined,
  len: number
): void {
  for (let i = 1; i <= len; i++) {
    const item = items?.[i - 1];
    data[`${key}_${i}_co`] = checkedIf(item?.co === true);
    data[`${key}_${i}_kco`] = checkedIf(item?.co === false);
  }
}

export function buildNoiGiaNhietDauReportData(input: BuildReportDataInput): Record<string, unknown> {
  const { equipment, inspectionHistory } = input;
  const spec = equipment.spec_values ?? {};
  const ngnd: ReportMetadataNoiGiaNhietDau | null | undefined =
    inspectionHistory.report_metadata?.noi_gia_nhiet_dau;

  const data = buildCommonReportData(input);

  // ----- Mục I - Thông số cơ bản -----
  data.loai_ma_hieu = spec.loai_ma_hieu ?? "";
  data.nuoc_che_tao = spec.nuoc_che_tao ?? "";
  data.cong_suat = spec.cong_suat ?? "";
  data.ap_suat_thiet_ke = spec.ap_suat_thiet_ke ?? "";
  data.ap_suat_lam_viec_lon_nhat = spec.ap_suat_lam_viec_lon_nhat ?? "";
  data.moi_chat_lam_viec = spec.moi_chat_lam_viec ?? "";
  data.nhiet_do_lam_viec_lon_nhat = spec.nhiet_do_lam_viec_lon_nhat ?? "";
  data.nhien_lieu_su_dung = spec.nhien_lieu_su_dung ?? "";
  data.cong_dung = spec.cong_dung ?? "";

  // ----- Mục 1 - Kiểm tra hồ sơ -----
  buildHoSoGroupTags(data, "hs1", ngnd?.ho_so_lan_dau, 4);
  buildHoSoGroupTags(data, "hs2", ngnd?.ho_so_dinh_ky, 6);
  buildHoSoGroupTags(data, "hs3", ngnd?.ho_so_bat_thuong, 8);
  data.ho_so_nhan_xet = ngnd?.ho_so_nhan_xet ?? "";
  data.cb_hoso_dat = checkedIf(ngnd?.ho_so_ket_qua === "dat");
  data.cb_hoso_kdat = checkedIf(ngnd?.ho_so_ket_qua === "khong_dat");

  // ----- Mục 2 - Thiết bị, dụng cụ (loop {#thiet_bi_dung_cu}) -----
  data.thiet_bi_dung_cu = (ngnd?.thiet_bi_dung_cu ?? []).map((row, i) => ({
    stt: i + 1,
    ten_goi_ma_hieu: row.ten_goi_ma_hieu || "",
    thang_do: row.thang_do || "",
    so_nhan_dang: row.so_nhan_dang || "",
    so_gcn_kdhc: row.so_gcn_kdhc || "",
    han_kdhc: row.han_kdhc || "",
  }));

  // ----- Mục 3.1 (phụ) - Tình trạng thiết bị kiểm tra an toàn -----
  data.van_an_toan_kieu_loai = ngnd?.van_an_toan_kieu_loai ?? "";
  data.van_an_toan_kich_co = ngnd?.van_an_toan_kich_co ?? "";
  data.van_an_toan_so_luong = ngnd?.van_an_toan_so_luong ?? "";
  data.ap_ke_thang_do = ngnd?.ap_ke_thang_do ?? "";
  data.ap_ke_cap_cx = ngnd?.ap_ke_cap_cx ?? "";
  data.ap_ke_so_tem_kd = ngnd?.ap_ke_so_tem_kd ?? "";
  data.ap_ke_han_kd = ngnd?.ap_ke_han_kd ?? "";
  data.nhiet_ke_kieu_loai = ngnd?.nhiet_ke_kieu_loai ?? "";
  data.nhiet_ke_so_tem_kdhc = ngnd?.nhiet_ke_so_tem_kdhc ?? "";
  data.nhiet_ke_so_luong = ngnd?.nhiet_ke_so_luong ?? "";
  data.kiem_tra_ngoai_trong_nhan_xet = ngnd?.kiem_tra_ngoai_trong_nhan_xet ?? "";
  data.cb_ktnt_dat = checkedIf(ngnd?.kiem_tra_ngoai_trong_ket_qua === "dat");
  data.cb_ktnt_kdat = checkedIf(ngnd?.kiem_tra_ngoai_trong_ket_qua === "khong_dat");

  // ----- Mục 3.2 - Kết quả áp dụng biện pháp kiểm tra thay thế -----
  const ktt = ngnd?.kiem_tra_thay_the;
  data.ktt_ly_do = ktt?.ly_do_khong_kiem_tra_trong ?? "";
  data.ktt_bien_phap = ktt?.bien_phap_da_ap_dung ?? "";
  data.ktt_pham_vi = ktt?.pham_vi_kiem_tra ?? "";
  data.ktt_ket_qua = ktt?.ket_qua_kiem_tra ?? "";
  data.ktt_can_cu = ktt?.can_cu_ket_luan ?? "";
  data.ktt_ket_luan = ktt?.ket_luan_danh_gia ?? "";

  // ----- Mục 4 - Thử nghiệm (Thử bền + Thử kín) -----
  const thuBen = ngnd?.thu_ben;
  data.thu_ben_moi_chat = thuBen?.moi_chat ?? "";
  data.thu_ben_ap_suat = thuBen?.ap_suat_bar ?? "";
  data.thu_ben_thoi_gian = thuBen?.thoi_gian_phut ?? "";
  data.cb_tb_khong_thu = checkedIf(thuBen?.khong_thu === true);
  data.cb_tb_ro_ri_khong = checkedIf(thuBen?.ro_ri === "khong");
  data.cb_tb_ro_ri_co = checkedIf(thuBen?.ro_ri === "co");
  data.cb_tb_biendang_khong = checkedIf(thuBen?.bien_dang_nut === "khong");
  data.cb_tb_biendang_co = checkedIf(thuBen?.bien_dang_nut === "co");
  data.cb_tb_tutap_khong = checkedIf(thuBen?.tut_ap === "khong");
  data.cb_tb_tutap_co = checkedIf(thuBen?.tut_ap === "co");

  const thuKin = ngnd?.thu_kin;
  data.thu_kin_moi_chat = thuKin?.moi_chat ?? "";
  data.thu_kin_ap_suat = thuKin?.ap_suat_bar ?? "";
  data.thu_kin_thoi_gian = thuKin?.thoi_gian_phut ?? "";
  data.cb_tk_khong_thu = checkedIf(thuKin?.khong_thu === true);
  data.cb_tk_ro_ri_khong = checkedIf(thuKin?.ro_ri === "khong");
  data.cb_tk_ro_ri_co = checkedIf(thuKin?.ro_ri === "co");
  data.cb_tk_tutap_khong = checkedIf(thuKin?.tut_ap === "khong");
  data.cb_tk_tutap_co = checkedIf(thuKin?.tut_ap === "co");

  data.ly_do_khong_thu = ngnd?.ly_do_khong_thu ?? "";
  data.thu_nghiem_nhan_xet = ngnd?.thu_nghiem_nhan_xet ?? "";
  data.cb_tn_dat = checkedIf(ngnd?.thu_nghiem_ket_qua === "dat");
  data.cb_tn_kdat = checkedIf(ngnd?.thu_nghiem_ket_qua === "khong_dat");

  // ----- Mục 5 - Thử vận hành: KHÔNG có field report_metadata riêng, 4 hạng
  // mục render qua checklist generic cb_15_dat..cb_18_dat (không có cb_kdanhgia
  // trên mẫu giấy nhưng vẫn OK để tag thừa trong template nếu không dùng).

  // ----- Mục IV - Kết luận riêng -----
  data.ap_suat_cai_dat_cung_kiem_dinh = ngnd?.ap_suat_cai_dat_cung_kiem_dinh ?? "";
  data.ap_suat_cai_dat_khong_cung_kiem_dinh = ngnd?.ap_suat_cai_dat_khong_cung_kiem_dinh ?? "";
  data.so_gcn_ket_qua = ngnd?.so_gcn_ket_qua ?? "";
  data.ngay_cap_gcn = ngnd?.ngay_cap_gcn ?? "";
  data.don_vi_cap_gcn = ngnd?.don_vi_cap_gcn ?? "";

  return data;
}
```

Lưu ý: KHÔNG có hạng mục nào trong 18 hạng mục checklist cần `value_fields` (migration
0023 toàn bộ `value_fields = '[]'`) -- không có tag `gt_${n}_*` nào cần tính tới, khác
hẳn Nồi hơi.

## 5. `src/app/(dashboard)/equipment/[id]/inspect/noi-gia-nhiet-dau-extra-form.tsx` — form mới

Copy cấu trúc từ `noi-hoi-extra-form.tsx` (forwardRef + useImperativeHandle expose
`buildMetadata(): ReportMetadataNoiGiaNhietDau`), đổi:

- Label mục 1 (hồ sơ) theo đúng nội dung PDF Nồi gia nhiệt dầu (khác Nồi hơi) — nhóm
  "lần đầu" CHỈ 4 dòng (không phải 5), lấy nguyên văn từ trích dẫn `pdftotext` ở cuối
  file này.
- Khối mục 3.1 phụ: 3 dòng Van an toàn / Áp kế / **Nhiệt kế** (Kiểu loại, Số tem
  KĐ/HC, Số lượng) — KHÔNG có "Đo mức" hay "Thiết bị báo hiệu mức nước" (khác Nồi hơi).
- Khối mục 3.2 "Kiểm tra thay thế": copy y hệt khối đã làm ở `noi-hoi-extra-form.tsx`
  (6 ô, gói trong `<details>` thu gọn mặc định).
- Mục 4 "Thử nghiệm": có CẢ 2 khối Thử bền VÀ Thử kín (copy từ
  `binh-ap-luc-extra-form.tsx`, không phải chỉ 1 khối như `noi-hoi-extra-form.tsx`).
- KHÔNG có khối "5. Thử vận hành - Đánh giá tổng" (khác Nồi hơi) -- mục 5 không có gì
  để nhập thêm ngoài checklist generic đã tự hiện ở trên.
- Mục IV: 2 ô text "Hiệu chỉnh cùng quá trình kiểm định (bar)" / "Hiệu chỉnh không
  cùng quá trình kiểm định (bar)" + 3 ô "Số GCN kết quả" / "Ngày cấp GCN" / "Đơn vị
  cấp GCN" — copy nguyên khối tương ứng từ `binh-ap-luc-extra-form.tsx` mục IV, đổi
  tên field theo interface ở mục 3 (`ap_suat_cai_dat_cung_kiem_dinh` thay vì
  `..._van_hanh`).
- KHÔNG có khối "Loại kiểm tra" (Cả ngoài+trong/Chỉ ngoài) -- giống Nồi hơi, không có
  ở mẫu này.

## 6. Hook vào `inspect-checklist-form.tsx` (mirror `isNoiHoi` hiện có)

```ts
import { NoiGiaNhietDauExtraForm, type NoiGiaNhietDauExtraFormHandle } from "./noi-gia-nhiet-dau-extra-form";
...
const isNoiGiaNhietDau = equipment.type === "Nồi gia nhiệt dầu";
const noiGiaNhietDauRef = useRef<NoiGiaNhietDauExtraFormHandle>(null);
...
if (hinhThuc && !isBinhApLuc && !isNoiHoi && !isNoiGiaNhietDau) { ... } // khối "Kiểm tra hồ sơ kỹ thuật" chung
...
kiem_tra_ho_so: isBinhApLuc || isNoiHoi || isNoiGiaNhietDau ? null : ...
ghi_nhan_khac: isBinhApLuc || isNoiHoi || isNoiGiaNhietDau ? null : ...
binh_ap_luc: isBinhApLuc ? (...) : null,
noi_hoi: isNoiHoi ? (...) : null,
noi_gia_nhiet_dau: isNoiGiaNhietDau ? (noiGiaNhietDauRef.current?.buildMetadata() ?? null) : null,
...
{isNoiGiaNhietDau && <NoiGiaNhietDauExtraForm ref={noiGiaNhietDauRef} hinhThuc={hinhThuc} />}
...
{!isBinhApLuc && !isNoiHoi && !isNoiGiaNhietDau && ( /* khối "Ghi nhận khác" */ )}
```

Cập nhật đủ CẢ 3 cờ `isBinhApLuc`/`isNoiHoi`/`isNoiGiaNhietDau` ở mọi chỗ đang check 2
cờ đầu (tìm toàn bộ `isBinhApLuc || isNoiHoi` hiện có trong file, thêm `|| isNoiGiaNhietDau`).

## 7. `src/lib/reports/registry.ts` — đăng ký

```ts
import { buildNoiGiaNhietDauReportData } from "@/lib/reports/noi-gia-nhiet-dau";
...
"Nồi gia nhiệt dầu": {
  templateUrl: "/report-templates/noi-gia-nhiet-dau.docx",
  buildData: buildNoiGiaNhietDauReportData,
},
```

File `public/report-templates/noi-gia-nhiet-dau.docx` sẽ do mentor build và đặt vào
repo ở commit riêng — KHÔNG tạo file .docx giả trong PROMPT này, chỉ đăng ký đường dẫn.

## 8. Kiểm tra sau khi code xong

- `npm run build` / `tsc --noEmit` sạch.
- Vào `/equipment/new`, xác nhận dropdown "Loại thiết bị" (nhóm KTAT) có thêm "Nồi
  gia nhiệt dầu" ngay sau "Bình áp lực"; chọn loại này, xác nhận mục I hiện đúng 9
  field spec mới.
- Vào trang kiểm định thiết bị loại này, xác nhận: 18 hạng mục checklist (migration
  0023) hiện đúng qua `checklist-item-card.tsx` (không có ô giá trị nào), và
  `NoiGiaNhietDauExtraForm` hiện đầy đủ các khối mục 1/2/3.1 phụ/3.2/4 (2 khối Thử
  bền+Thử kín)/IV.
- CHƯA xuất được Word (chưa có file .docx) — để PROMPT/bước sau khi mentor đã đưa
  file mẫu vào `public/report-templates/noi-gia-nhiet-dau.docx`.

---

## Phụ lục: trích dẫn nguyên văn PDF (pdftotext -layout, trang 12-16) để đối chiếu
## khi viết label — KHÔNG cần mở lại PDF gốc

### Mục 1. Kiểm tra hồ sơ — Lần đầu (4 dòng, KHÁC Nồi hơi/Bình áp lực là 5 dòng)
1. Lý lịch nồi gia nhiệt dầu theo mẫu QCVN: 01-2008/BLĐTBXH; Chứng chỉ vật liệu kim
   loại chế tạo, kim loại hàn bao gồm các chỉ tiêu cơ tính và thành phần hóa học;
   Tính toán sức bền các bộ phận chịu áp lực; Bản vẽ cấu tạo ghi đủ các kích thước
   chính; Kết quả kiểm tra chất lượng mối hàn; Biên bản nghiệm thử xuất xưởng;
   Hướng dẫn vận hành, bảo dưỡng sửa chữa.
2. Các chứng chỉ kiểm tra về thiết bị đo lường, cơ cấu an toàn: Giấy chứng nhận kết
   quả kiểm định/hiệu chuẩn thiết bị đo lường.
3. Biên bản nghiệm thu lắp đặt.
4. Các tài liệu khác: Báo cáo kiểm tra tiếp địa chống sét, an toàn điện .... (nếu có)

### Mục 1. Kiểm tra hồ sơ — Định kỳ (6 dòng)
1. Lý lịch nồi gia nhiệt dầu theo mẫu QCVN: 01-2008/BLĐTBXH
2. Biên bản Kiểm định và Giấy chứng nhận kết quả kiểm định lần trước
3. Hồ sơ về quản lý sử dụng, kiểm tra, vận hành, bảo dưỡng
4. Biên bản thanh tra, kiểm tra của cơ quan có thẩm quyền
5. Các chứng chỉ kiểm tra về thiết bị đo lường, cơ cấu an toàn: Giấy chứng nhận kết
   quả kiểm định/hiệu chuẩn thiết bị đo lường.
6. Các tài liệu khác: Báo cáo kiểm tra tiếp địa chống sét, an toàn điện .... (nếu có)

### Mục 1. Kiểm tra hồ sơ — Bất thường (8 dòng)
1. Lý lịch nồi gia nhiệt dầu theo mẫu QCVN: 01-2008/BLĐTBXH
2. Biên bản Kiểm định và Giấy chứng nhận kết quả kiểm định lần trước
3. Hồ sơ về quản lý sử dụng, kiểm tra, vận hành, bảo dưỡng
4. Các chứng chỉ kiểm tra về thiết bị đo lường, cơ cấu an toàn: Giấy chứng nhận kết
   quả kiểm định/hiệu chuẩn thiết bị đo lường.
5. Trường hợp cải tạo, sửa chữa: Hồ sơ thiết kế cải tạo, sửa chữa; Hồ sơ hàn trong
   quá trình cải tạo, sửa chữa; Biên bản thử nghiệm sau cải tạo, sửa chữa.
6. Trường hợp thay đổi vị trí lắp đặt (đối với nồi cố định): Hồ sơ lắp đặt và các
   biên bản nghiệm thu lắp đặt, chạy thử.
7. Trường hợp kiểm định theo yêu cầu của cơ quan chức năng: Biên bản yêu cầu kiểm
   định của cơ quan chức năng và các hồ sơ có liên quan.
8. Các tài liệu khác: Báo cáo kiểm tra tiếp địa chống sét, an toàn điện .... (nếu có)

### Mục 2. Thiết bị, dụng cụ phục vụ kiểm định (bảng động)
Cột: Tên gọi – Mã hiệu | Thang đo | Số nhận dạng | Số GCN KĐ/HC | Hạn KĐ/HC

### Mục 3.1 (phụ) — Tình trạng của các thiết bị kiểm tra an toàn, dụng cụ đo kiểm
1. Van an toàn — Kiểu loại / Kích cỡ / Số lượng
2. Áp kế — Thang đo / Cấp CX / Số tem kiểm định / Hạn kiểm định
3. Nhiệt kế — Kiểu loại / Số tem kiểm định-hiệu chuẩn / Số lượng

### Mục 3.2 — Kết quả áp dụng biện pháp kiểm tra thay thế (nếu có)
"Trường hợp áp dụng biện pháp kiểm tra thay thế theo mục 8.3.2 của quy trình, kiểm
định viên ghi bổ sung các nội dung sau:"
- Lý do không thực hiện được kiểm tra bên trong: …
- Biện pháp kiểm tra thay thế đã áp dụng: …
- Phạm vi kiểm tra: …
- Kết quả kiểm tra: …
- Căn cứ kết luận: …
- Kết luận đánh giá: …

### Mục 4. Thử nghiệm (Thử bền + Thử kín)
Tên phép thử | Môi chất thử | Áp suất thử (bar) | Thời gian thử (phút) | Đánh giá kết
quả thử (Kết quả thử: Tình trạng rò rỉ/Tình trạng biến dạng, nứt/Độ tụt áp -- mỗi
dòng Không/Có) | Không thử.
Thử bền: cả 3 dòng (rò rỉ, biến dạng nứt, độ tụt áp).
Thử kín: chỉ 2 dòng (rò rỉ, độ tụt áp) -- giống hệt Bình áp lực.
"Lý do không thử: Ghi rõ lý do. Không yêu cầu thử, chưa tới hạn thử, hoặc chấp nhận
kết quả thử của đơn vị chế tạo/lắp đặt/sử dụng (đính kèm Biên bản thử số …… ngày …. )"
- Nhận xét: …
- Đánh giá kết quả: Đạt ☐ ; Không đạt ☐

### Mục 5. Thử vận hành (4 hạng mục, CHỈ Đạt/Không đạt, KHÔNG có dòng Nhận xét/Đánh
giá kết quả riêng -- sau bảng đi thẳng vào "IV - KẾT LUẬN")
1. Tình trạng làm việc của nồi
2. Tình trạng làm việc của thiết bị đo lường
3. Tình trạng làm việc của van an toàn
4. Tình trạng làm việc của thiết bị phụ trợ

### IV - KẾT LUẬN VÀ KIẾN NGHỊ
1. Nồi được kiểm định có kết quả: Đạt ☐ ; Không đạt ☐
2. Đã được dán tem kiểm định số: … ; Tại vị trí: …
3. Áp suất làm việc lớn nhất: … bar
4. Nhiệt độ làm việc lớn nhất: … °C
5. Áp suất cài đặt của van an toàn:
   - Hiệu chỉnh cùng quá trình kiểm định: … bar
   - Hiệu chỉnh không cùng quá trình kiểm định: … bar
   (Nếu có Giấy chứng nhận thì ghi số GCN……., ngày cấp ...….., đơn vị cấp…………)
6. Các kiến nghị: … / Thời gian thực hiện kiến nghị: …

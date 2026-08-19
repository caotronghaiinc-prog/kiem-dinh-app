# PROMPT-39: Nồi hơi — spec fields (mục I) + report_metadata (phần "còn lại") + form + registry

Mirror chính xác pattern đã dùng cho "Bình áp lực" (PROMPT-33). Migration checklist
(mục 3.1 = 13 hạng mục, mục 5 = 16 hạng mục, tổng 29 dòng) đã có sẵn ở
`supabase/migrations/0022_seed_checklist_noi_hoi.sql` — KHÔNG cần đụng tới, chỉ cần
đọc file này để biết item_order 1-29 tương ứng hạng mục nào (dùng khi review, không
cần sửa).

Nguồn: `uploads/QTKD Noi hoi.pdf` trang 13-18 (không có trong repo, xem lại nội dung
trích dẫn bên dưới — đã đối chiếu trực tiếp ảnh chụp, đủ để code không cần mở lại PDF).

## 1. `src/lib/equipment/spec-fields.ts` — thêm mục I "Nồi hơi"

Thêm entry mới vào `EQUIPMENT_SPEC_FIELDS`, ngay sau `"Bình áp lực"`:

```ts
"Nồi hơi": [
  { key: "loai_ma_hieu", label: "Loại, mã hiệu", unit: null },
  { key: "cong_suat", label: "Công suất", unit: "tấn/giờ" },
  { key: "nhien_lieu_su_dung", label: "Nhiên liệu sử dụng", unit: null },
  { key: "ap_suat_thiet_ke", label: "Áp suất thiết kế", unit: "bar" },
  { key: "ap_suat_lam_viec_lon_nhat", label: "Áp suất làm việc", unit: "bar" },
  { key: "nhiet_do_thiet_ke_hoi_bao_hoa", label: "Nhiệt độ thiết kế hơi bão hòa", unit: "°C" },
  { key: "nhiet_do_thiet_ke_hoi_qua_nhiet", label: "Nhiệt độ thiết kế hơi quá nhiệt (nếu có)", unit: "°C" },
  { key: "cong_dung", label: "Công dụng", unit: null },
],
```

(Số chế tạo/Năm chế tạo/Nhà chế tạo dùng thẳng `serial_number`/`manufacture_year`/
`manufacturer` có sẵn trên `equipment`, không lặp lại — giống Bình áp lực.)

## 2. `src/lib/reports/shared.ts` — thêm `ReportMetadataNoiHoi`

Thêm interface mới (đặt sau `ReportMetadataBinhApLuc`), và thêm field `noi_hoi?:
ReportMetadataNoiHoi | null;` vào `ReportMetadata`:

```ts
export interface ReportMetadataNoiHoi {
  // ----- 1. Kiểm tra hồ sơ (3 mảng ĐỘ DÀI CỐ ĐỊNH, giữ đúng thứ tự) -----
  ho_so_lan_dau: { co: boolean | null }[]; // 5 phần tử
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

  // ----- 3.1 (phụ) Các thiết bị đo lường, bảo vệ, an toàn và tự động -----
  van_an_toan_kieu_loai: string | null;
  van_an_toan_kich_co: string | null;
  van_an_toan_so_luong: string | null;
  ap_ke_thang_do: string | null;
  ap_ke_cap_cx: string | null;
  ap_ke_so_tem_kd: string | null;
  ap_ke_han_kd: string | null;
  do_muc_kieu_loai: string | null;
  do_muc_so_luong: string | null;
  bao_hieu_muc_nuoc_kieu_loai: string | null;
  bao_hieu_muc_nuoc_so_luong: string | null;
  thiet_bi_khac_mo_ta: string | null; // "Số lượng, chủng loại, kích cỡ" -- 1 ô free text
  kiem_tra_ngoai_trong_nhan_xet: string | null;
  kiem_tra_ngoai_trong_ket_qua: "dat" | "khong_dat" | null;

  // ----- 3.2 Kết quả áp dụng biện pháp kiểm tra thay thế (nếu có) -----
  kiem_tra_thay_the: {
    ly_do_khong_kiem_tra_trong: string | null;
    bien_phap_da_ap_dung: string | null;
    pham_vi_kiem_tra: string | null;
    ket_qua_kiem_tra: string | null;
    can_cu_ket_luan: string | null;
    ket_luan_danh_gia: string | null;
  };

  // ----- 4. Thử nghiệm (CHỈ Thử bền -- không có Thử kín) -----
  thu_ben: {
    moi_chat: string | null;
    ap_suat_bar: string | null;
    thoi_gian_phut: string | null;
    ro_ri: "khong" | "co" | null;
    bien_dang_nut: "khong" | "co" | null;
    tut_ap: "khong" | "co" | null;
    khong_thu: boolean;
  };
  ly_do_khong_thu: string | null;
  thu_nghiem_nhan_xet: string | null;
  thu_nghiem_ket_qua: "dat" | "khong_dat" | null;

  // ----- 5. Thử vận hành -- 16 hạng mục ĐÃ nằm trong checklist generic
  // (migration 0022), CHỈ cần nhận xét/đánh giá tổng ở đây -----
  thu_van_hanh_nhan_xet: string | null;
  thu_van_hanh_ket_qua: "dat" | "khong_dat" | null;

  // ----- IV Kết luận (riêng) -----
  // Mục IV.3 "Áp suất làm việc lớn nhất cho phép" tái dùng THẲNG
  // spec_values.ap_suat_lam_viec_lon_nhat, KHÔNG lặp lại ở đây (giống Bình áp lực).
  nhiet_do_hoi_bao_hoa: string | null; // IV.4 - nhiệt độ làm việc hơi bão hòa (khác nhiệt độ THIẾT KẾ ở mục I)
  nhiet_do_hoi_qua_nhiet: string | null; // IV.4 - nhiệt độ làm việc hơi quá nhiệt (nếu có)
  van_an_toan_dat: {
    hoi_bao_hoa: { ap_suat_mo: string | null; ap_suat_dong: string | null; so_gcn_ngay_cap: string | null };
    hoi_qua_nhiet: { ap_suat_mo: string | null; ap_suat_dong: string | null; so_gcn_ngay_cap: string | null };
  };
}
```

## 3. `src/lib/reports/noi-hoi.ts` — module build data mới (mirror `binh-ap-luc.ts`)

```ts
import {
  CHECKED,
  UNCHECKED,
  buildCommonReportData,
  type BuildReportDataInput,
  type ReportMetadataNoiHoi,
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

export function buildNoiHoiReportData(input: BuildReportDataInput): Record<string, unknown> {
  const { equipment, inspectionHistory } = input;
  const spec = equipment.spec_values ?? {};
  const nh: ReportMetadataNoiHoi | null | undefined = inspectionHistory.report_metadata?.noi_hoi;

  const data = buildCommonReportData(input);

  // ----- Mục I - Thông số cơ bản -----
  data.loai_ma_hieu = spec.loai_ma_hieu ?? "";
  data.cong_suat = spec.cong_suat ?? "";
  data.nhien_lieu_su_dung = spec.nhien_lieu_su_dung ?? "";
  data.ap_suat_thiet_ke = spec.ap_suat_thiet_ke ?? "";
  data.ap_suat_lam_viec_lon_nhat = spec.ap_suat_lam_viec_lon_nhat ?? "";
  data.nhiet_do_thiet_ke_hoi_bao_hoa = spec.nhiet_do_thiet_ke_hoi_bao_hoa ?? "";
  data.nhiet_do_thiet_ke_hoi_qua_nhiet = spec.nhiet_do_thiet_ke_hoi_qua_nhiet ?? "";
  data.cong_dung = spec.cong_dung ?? "";

  // ----- Mục 1 - Kiểm tra hồ sơ -----
  buildHoSoGroupTags(data, "hs1", nh?.ho_so_lan_dau, 5);
  buildHoSoGroupTags(data, "hs2", nh?.ho_so_dinh_ky, 6);
  buildHoSoGroupTags(data, "hs3", nh?.ho_so_bat_thuong, 8);
  data.ho_so_nhan_xet = nh?.ho_so_nhan_xet ?? "";
  data.cb_hoso_dat = checkedIf(nh?.ho_so_ket_qua === "dat");
  data.cb_hoso_kdat = checkedIf(nh?.ho_so_ket_qua === "khong_dat");

  // ----- Mục 2 - Thiết bị, dụng cụ (loop {#thiet_bi_dung_cu}) -----
  data.thiet_bi_dung_cu = (nh?.thiet_bi_dung_cu ?? []).map((row, i) => ({
    stt: i + 1,
    ten_goi_ma_hieu: row.ten_goi_ma_hieu || "",
    thang_do: row.thang_do || "",
    so_nhan_dang: row.so_nhan_dang || "",
    so_gcn_kdhc: row.so_gcn_kdhc || "",
    han_kdhc: row.han_kdhc || "",
  }));

  // ----- Mục 3.1 (phụ) - Các thiết bị đo lường, bảo vệ, an toàn và tự động -----
  data.van_an_toan_kieu_loai = nh?.van_an_toan_kieu_loai ?? "";
  data.van_an_toan_kich_co = nh?.van_an_toan_kich_co ?? "";
  data.van_an_toan_so_luong = nh?.van_an_toan_so_luong ?? "";
  data.ap_ke_thang_do = nh?.ap_ke_thang_do ?? "";
  data.ap_ke_cap_cx = nh?.ap_ke_cap_cx ?? "";
  data.ap_ke_so_tem_kd = nh?.ap_ke_so_tem_kd ?? "";
  data.ap_ke_han_kd = nh?.ap_ke_han_kd ?? "";
  data.do_muc_kieu_loai = nh?.do_muc_kieu_loai ?? "";
  data.do_muc_so_luong = nh?.do_muc_so_luong ?? "";
  data.bao_hieu_muc_nuoc_kieu_loai = nh?.bao_hieu_muc_nuoc_kieu_loai ?? "";
  data.bao_hieu_muc_nuoc_so_luong = nh?.bao_hieu_muc_nuoc_so_luong ?? "";
  data.thiet_bi_khac_mo_ta = nh?.thiet_bi_khac_mo_ta ?? "";
  data.kiem_tra_ngoai_trong_nhan_xet = nh?.kiem_tra_ngoai_trong_nhan_xet ?? "";
  data.cb_ktnt_dat = checkedIf(nh?.kiem_tra_ngoai_trong_ket_qua === "dat");
  data.cb_ktnt_kdat = checkedIf(nh?.kiem_tra_ngoai_trong_ket_qua === "khong_dat");

  // ----- Mục 3.2 - Kết quả áp dụng biện pháp kiểm tra thay thế -----
  const ktt = nh?.kiem_tra_thay_the;
  data.ktt_ly_do = ktt?.ly_do_khong_kiem_tra_trong ?? "";
  data.ktt_bien_phap = ktt?.bien_phap_da_ap_dung ?? "";
  data.ktt_pham_vi = ktt?.pham_vi_kiem_tra ?? "";
  data.ktt_ket_qua = ktt?.ket_qua_kiem_tra ?? "";
  data.ktt_can_cu = ktt?.can_cu_ket_luan ?? "";
  data.ktt_ket_luan = ktt?.ket_luan_danh_gia ?? "";

  // ----- Mục 4 - Thử nghiệm (chỉ Thử bền) -----
  const thuBen = nh?.thu_ben;
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
  data.ly_do_khong_thu = nh?.ly_do_khong_thu ?? "";
  data.thu_nghiem_nhan_xet = nh?.thu_nghiem_nhan_xet ?? "";
  data.cb_tn_dat = checkedIf(nh?.thu_nghiem_ket_qua === "dat");
  data.cb_tn_kdat = checkedIf(nh?.thu_nghiem_ket_qua === "khong_dat");

  // ----- Mục 5 - Thử vận hành (nhận xét/đánh giá tổng; 16 hạng mục đã
  // render qua checklist generic cb_${n}_dat/kdat/kdanhgia + gt_${n}_* ) -----
  data.thu_van_hanh_nhan_xet = nh?.thu_van_hanh_nhan_xet ?? "";
  data.cb_tvh_dat = checkedIf(nh?.thu_van_hanh_ket_qua === "dat");
  data.cb_tvh_kdat = checkedIf(nh?.thu_van_hanh_ket_qua === "khong_dat");

  // ----- Mục IV - Kết luận riêng -----
  data.nhiet_do_hoi_bao_hoa = nh?.nhiet_do_hoi_bao_hoa ?? "";
  data.nhiet_do_hoi_qua_nhiet = nh?.nhiet_do_hoi_qua_nhiet ?? "";
  data.van_hbh_ap_suat_mo = nh?.van_an_toan_dat?.hoi_bao_hoa?.ap_suat_mo ?? "";
  data.van_hbh_ap_suat_dong = nh?.van_an_toan_dat?.hoi_bao_hoa?.ap_suat_dong ?? "";
  data.van_hbh_so_gcn = nh?.van_an_toan_dat?.hoi_bao_hoa?.so_gcn_ngay_cap ?? "";
  data.van_hqn_ap_suat_mo = nh?.van_an_toan_dat?.hoi_qua_nhiet?.ap_suat_mo ?? "";
  data.van_hqn_ap_suat_dong = nh?.van_an_toan_dat?.hoi_qua_nhiet?.ap_suat_dong ?? "";
  data.van_hqn_so_gcn = nh?.van_an_toan_dat?.hoi_qua_nhiet?.so_gcn_ngay_cap ?? "";

  return data;
}
```

Lưu ý quan trọng: 8 hạng mục mục 5 có `value_fields` với key `gt_thap`/`gt_cao`
(migration 0022) — `buildCommonReportData` tự sinh tag `gt_${item_order}_gt_thap` và
`gt_${item_order}_gt_cao` (vd `gt_17_gt_thap`, `gt_17_gt_cao` cho hạng mục 2.3 "Bộ quá
nhiệt" — item_order=17). Không cần `valueFieldKeyAliases` vì key trong migration đã
đặt sẵn đúng ý định dùng làm tag Word — nhưng PHẢI kiểm tra kỹ khi dựng mẫu Word để tag
đúng thứ tự item_order (xem comment migration 0022 để tra item_order ↔ item_code).

## 4. `src/app/(dashboard)/equipment/[id]/inspect/noi-hoi-extra-form.tsx` — form mới

Copy nguyên cấu trúc từ `binh-ap-luc-extra-form.tsx` (forwardRef +
useImperativeHandle expose `buildMetadata(): ReportMetadataNoiHoi`), đổi:

- Label mục 1 (hồ sơ) theo đúng nội dung PDF Nồi hơi (khác Bình áp lực) — 5/6/8 dòng,
  lấy nguyên văn từ trích dẫn `pdftotext` ở cuối file này (mục "III - NỘI DUNG KIỂM
  ĐỊNH / 1. Kiểm tra hồ sơ").
- Bỏ khối `loai_kiem_tra`/`van_thu_truc_tiep`/`van_chap_nhan_ket_qua` (không có ở Nồi
  hơi) — thay bằng khối UI mới cho mục 3.1 phụ (5 thiết bị: Van an toàn/Áp kế/Đo
  mức/Thiết bị báo mức nước/Các thiết bị khác) + khối mục 3.2 "Kiểm tra thay thế" (6 ô
  textarea, ẩn mặc định trong `<details>` hoặc tương tự vì "nếu có") + khối mục IV.5
  bảng van an toàn 2 dòng x 3 cột (Van hơi bão hòa/Van hơi quá nhiệt).
- Mục 4 "Thử nghiệm": CHỈ 1 khối Thử bền (bỏ khối Thử kín so với Bình áp lực).
- Thêm 2 field input mới ở mục IV: "Nhiệt độ làm việc hơi bão hòa (°C)", "Nhiệt độ làm
  việc hơi quá nhiệt (°C)".
- Thêm 2 cặp RadioPillGroup Đạt/Không đạt mới không có ở Bình áp lực:
  `kiem_tra_ngoai_trong_ket_qua` (đã có sẵn tên giống Bình áp lực, giữ nguyên),
  `thu_nghiem_ket_qua` và `thu_van_hanh_ket_qua` (2 cái này Bình áp lực KHÔNG có,
  Nồi hơi có in "- Đánh giá kết quả: Đạt/Không đạt" ở cuối mục 4 và cuối mục 5 trên
  giấy — xác nhận qua pdftotext, xem trích dẫn cuối file).

## 5. Hook vào `inspect-checklist-form.tsx` (mirror dòng 135, 136, 389, 709 hiện tại
   cho Bình áp lực)

```ts
import { NoiHoiExtraForm, type NoiHoiExtraFormHandle } from "./noi-hoi-extra-form";
...
const isNoiHoi = equipment.type === "Nồi hơi";
const noiHoiRef = useRef<NoiHoiExtraFormHandle>(null);
...
noi_hoi: isNoiHoi ? (noiHoiRef.current?.buildMetadata() ?? null) : null,
...
{isNoiHoi && <NoiHoiExtraForm ref={noiHoiRef} hinhThuc={hinhThuc} />}
```

Nhớ mở rộng điều kiện ẩn khối "Kiểm tra hồ sơ kỹ thuật"/"Ghi nhận khác" mặc định
(dòng ~619, ~711 hiện tại) để cũng loại trừ `isNoiHoi`, giống cách đang loại trừ
`isBinhApLuc`.

## 6. `src/lib/reports/registry.ts` — đăng ký

```ts
import { buildNoiHoiReportData } from "@/lib/reports/noi-hoi";
...
"Nồi hơi": {
  templateUrl: "/report-templates/noi-hoi.docx",
  buildData: buildNoiHoiReportData,
},
```

File `public/report-templates/noi-hoi.docx` sẽ do mentor build và đặt vào repo ở
PROMPT/commit riêng — KHÔNG tạo file .docx giả trong PROMPT này, chỉ đăng ký đường dẫn.

## 7. Kiểm tra sau khi code xong

- `npm run build` / `npm run lint` sạch.
- Vào `/equipment/new`, tạo 1 thiết bị `type = "Nồi hơi"`, xác nhận mục I hiện đúng 8
  field spec mới.
- Vào trang kiểm định thiết bị đó, xác nhận: 29 hạng mục checklist (migration 0022)
  hiện đúng qua `checklist-item-card.tsx` (bao gồm 8 hạng mục có 2 ô "Giá trị thấp/Giá
  trị cao"), và `NoiHoiExtraForm` hiện đầy đủ các khối mục 1/2/3.1 phụ/3.2/4/5/IV.
- CHƯA xuất được Word (chưa có file .docx) — việc đó để PROMPT/bước sau khi mentor đã
  đưa file mẫu vào `public/report-templates/noi-hoi.docx`.

---

## Phụ lục: trích dẫn nguyên văn PDF (pdftotext -layout, trang 13-18) để đối chiếu khi
## viết label — KHÔNG cần mở lại PDF gốc

### Mục 1. Kiểm tra hồ sơ — Lần đầu (5 dòng)
1. Lý lịch nồi hơi, nồi đun nước nóng theo mẫu QCVN: 01-2008/BLĐTBXH
2. Hồ sơ xuất xưởng thiết bị: Chứng chỉ vật liệu kim loại chế tạo, kim loại hàn bao
   gồm các chỉ tiêu cơ tính và thành phần hóa học; Tính toán sức bền các bộ phận chịu
   áp lực; Bản vẽ chế tạo có đầy đủ kích thước; Các chứng chỉ kiểm tra chất lượng mối
   hàn (theo TCVN 12728:2019 hoặc nhà chế tạo nếu cao hơn); Biên bản thử thuỷ lực xuất
   xưởng; Các bản hướng dẫn sử dụng, lắp đặt bảo dưỡng và bảo quản thiết bị.
3. Các chứng chỉ kiểm tra về thiết bị đo lường, cơ cấu an toàn: Giấy chứng nhận kết
   quả kiểm định/hiệu chuẩn thiết bị đo lường.
4. Hồ sơ lắp đặt (lắp ráp chế tạo): Thiết kế lắp đặt; Chứng chỉ vật liệu bổ sung của
   kim loại chế tạo, kim loại hàn khi lắp đặt; Hồ sơ kỹ thuật công tác hàn bộ phận
   chịu áp lực; Các biên bản nghiệm thu từng bộ phận (nếu có); Biên bản nghiệm thu lắp
   đặt, lắp ráp sau khi chế tạo.
5. Các tài liệu khác: Báo cáo kiểm tra tiếp địa chống sét, an toàn điện .... (nếu có)

### Mục 1. Kiểm tra hồ sơ — Định kỳ (6 dòng)
1. Lý lịch nồi hơi, nồi đun nước nóng theo mẫu QCVN: 01-2008/BLĐTBXH
2. Biên bản kiểm định và Giấy chứng nhận kết quả kiểm định lần trước
3. Hồ sơ về quản lý sử dụng, kiểm tra, vận hành, bảo dưỡng
4. Biên bản thanh tra, kiểm tra của cơ quan có thẩm quyền (nếu có)
5. Các chứng chỉ kiểm tra về thiết bị đo lường, cơ cấu an toàn: Giấy chứng nhận kết
   quả kiểm định/hiệu chuẩn thiết bị đo lường.
6. Các tài liệu khác: Báo cáo kiểm tra tiếp địa chống sét, an toàn điện .... (nếu có)

### Mục 1. Kiểm tra hồ sơ — Bất thường (8 dòng)
1. Lý lịch nồi hơi, nồi đun nước nóng theo mẫu QCVN 01:2008/BLĐTBXH
2. Biên bản kiểm định và Giấy chứng nhận kết quả kiểm định lần trước
3. Hồ sơ về quản lý sử dụng, kiểm tra, vận hành, bảo dưỡng
4. Các chứng chỉ kiểm tra về thiết bị đo lường, cơ cấu an toàn: Giấy chứng nhận kết
   quả kiểm định/hiệu chuẩn thiết bị đo lường.
5. Trường hợp cải tạo, sửa chữa: Hồ sơ thiết kế cải tạo, sửa chữa; Hồ sơ hàn trong quá
   trình cải tạo, sửa chữa; Biên bản nghiệm thu sau cải tạo, sửa chữa.
6. Trường hợp thay đổi vị trí lắp đặt: Hồ sơ lắp đặt và các biên bản nghiệm thu lắp
   đặt, chạy thử.
7. Trường hợp kiểm định theo yêu cầu của cơ quan chức năng: Biên bản kiểm tra của cơ
   quan chức năng và các hồ sơ có liên quan.
8. Các tài liệu khác: Báo cáo kiểm tra tiếp địa chống sét, an toàn điện .... (nếu có)

### Mục 2. Thiết bị, dụng cụ phục vụ kiểm định (bảng động)
Cột: Tên gọi – Mã hiệu | Thang đo | Số nhận dạng | Số GCN KĐ/HC | Hạn KĐ/HC

### Mục 3.1 (phụ) — Các thiết bị đo lường, bảo vệ, an toàn và tự động
1. Van an toàn — Kiểu loại / Kích cỡ / Số lượng
2. Áp kế — Thang đo / Cấp CX / Số tem kiểm định / Hạn kiểm định
3. Đo mức — Kiểu loại / Số lượng
4. Thiết bị báo hiệu mức nước và bảo vệ cạn nước — Kiểu loại / Số lượng
5. Các thiết bị khác (nhiệt kế đo nhiệt độ nước cấp, nhiệt độ hơi quá nhiệt, nhiệt độ
   khói; đồng hồ đo lưu lượng hơi, lưu lượng nước) — Số lượng, chủng loại, kích cỡ

### Mục 3.2 — Kết quả áp dụng biện pháp kiểm tra thay thế (nếu có)
"Trường hợp áp dụng biện pháp kiểm tra thay thế theo mục 8.3.3 của quy trình, ghi bổ
sung các nội dung sau:"
- Lý do không thực hiện được kiểm tra bên trong: …
- Biện pháp kiểm tra thay thế đã áp dụng: …
- Phạm vi kiểm tra: …
- Kết quả kiểm tra: …
- Căn cứ kết luận: …
- Kết luận đánh giá: …

### Mục 4. Thử nghiệm
Tên phép thử: "Thử bền" | Môi chất thử | Áp suất thử (bar) | Thời gian thử (phút) |
Đánh giá kết quả thử (Tình trạng rò rỉ / Tình trạng biến dạng, nứt / Độ tụt áp — mỗi
dòng có Có/Không) | Không thử.
"Lý do không thử (nếu có): Ghi rõ lý do (Chưa tới hạn thử, …) hoặc Chấp nhận kết quả
thử của đơn vị chế tạo/lắp đặt (chỉ áp dụng đối với trường hợp kiểm định lần đầu) đính
kèm Biên bản thử của cơ sở chế tạo/lắp đặt số …… ngày …., Biên bản nghiệm thu lắp đặt
(nếu có) số …… ngày ..."
- Nhận xét: …
- Đánh giá kết quả: Đạt ☐ ; Không đạt ☐

### Mục 5. Thử vận hành — chốt cuối bảng 16 hạng mục
- Nhận xét: …
- Đánh giá kết quả: Đạt ☐ ; Không đạt ☐

### IV - KẾT LUẬN VÀ KIẾN NGHỊ
1. Nồi hơi (hoặc nồi đun nước nóng) được kiểm định có kết quả: Đạt ☐ ; Không đạt ☐
2. Đã được dán tem kiểm định số: … , Tại vị trí: …
3. Áp suất làm việc lớn nhất cho phép: … bar
4. Nhiệt độ làm việc hơi bão hòa: … °C ; Nhiệt độ làm việc hơi quá nhiệt (nếu có): … °C
5. Áp suất đặt của van an toàn — bảng 2 dòng x 3 cột:
   | Vị trí | Áp suất mở (bar) | Áp suất đóng (bar) | Số giấy chứng nhận, ngày cấp
     (khi không cân chỉnh van cùng quá trình thử vận hành, nếu có cấp GCN) |
   - Van hơi bão hòa
   - Van hơi quá nhiệt
6. Các kiến nghị: … / Thời hạn thực hiện kiến nghị: …

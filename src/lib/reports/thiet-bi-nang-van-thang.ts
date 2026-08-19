// PROMPT-29: map dữ liệu kiểm định "Thiết bị nâng - Vận thăng nâng hàng"
// sang object phẳng để truyền thẳng vào docxtemplater.render(data). Mirror
// thiet-bi-nang-pa-lang.ts -- phần chung nằm ở shared.ts
// (buildCommonReportData), module này chỉ còn khối "Thông số cơ bản"/
// "Kết luận" riêng của Vận thăng nâng hàng.
//
// Không cần bảng alias tên field value_fields -- đã đối chiếu trực tiếp
// tag thật trong mẫu Word (mau-bien-ban/BBKD-Van-thang-v1.docx, unzip xem
// word/document.xml) với key value_fields seed ở migration 0019: khớp
// thẳng 100% (kể cả field mới gt_17_dien_tro_noi_dat_chong_set, không
// xuất hiện ở loại thiết bị nào khác).
//
// Giống Palăng/Tời: mẫu Word Vận thăng nâng hàng KHÔNG có "tầm với" trong
// kết luận -- chỉ có trong_tai_toi_da, không có tam_voi_toi_da. Checklist
// (22 hạng mục, has_presence_flag) khác Palăng/Tời -- gần cấu trúc Cầu
// trục hơn -- nhưng không ảnh hưởng module này vì logic checklist đã nằm
// hết trong buildCommonReportData(), tự đọc has_presence_flag/value_fields
// động theo item_order thật.
import {
  buildCommonReportData,
  type BuildReportDataInput,
} from "@/lib/reports/shared";

export function buildThietBiNangVanThangReportData(
  input: BuildReportDataInput
): Record<string, unknown> {
  const { equipment } = input;
  const spec = equipment.spec_values ?? {};

  const data = buildCommonReportData(input);

  // ----- Thông số cơ bản (spec_values, PROMPT-29) -----
  data.loai_thiet_bi = spec.loai_thiet_bi ?? "";
  data.ma_hieu = spec.ma_hieu ?? "";
  data.trong_tai = spec.trong_tai ?? "";
  data.van_toc_nang = spec.van_toc_nang ?? "";
  data.chieu_cao_nang = spec.chieu_cao_nang ?? "";
  data.cong_dung = spec.cong_dung ?? "";

  // ----- Kết luận mục 2: "trọng tải lớn nhất ... tấn" -- tái dùng
  // spec.trong_tai, giống cách trong_tai_toi_da tái dùng spec.trong_tai ở
  // các module còn lại.
  data.trong_tai_toi_da = spec.trong_tai ?? "";

  return data;
}

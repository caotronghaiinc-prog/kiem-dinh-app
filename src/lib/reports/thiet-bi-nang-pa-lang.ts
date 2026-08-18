// PROMPT-25: map dữ liệu kiểm định "Thiết bị nâng - Palăng" sang object
// phẳng để truyền thẳng vào docxtemplater.render(data). Mirror
// thiet-bi-nang-can-truc.ts -- phần chung nằm ở shared.ts
// (buildCommonReportData), module này chỉ còn khối "Thông số cơ bản"/
// "Kết luận" riêng của Palăng.
//
// Khác Cầu trục: KHÔNG cần bảng alias tên field value_fields -- đã đối
// chiếu trực tiếp tag thật trong mẫu Word (mau-bien-ban/BBKD-Pa-lang-v1.docx,
// unzip xem word/document.xml) với key value_fields seed ở migration 0017:
// khớp thẳng 100% (vd gt_18_tai_trong_su_dung/gt_18_tai_trong_thu), không
// lệch tên như cầu trục (nơi mẫu dùng tai_su_dung/tai_thu, không có
// "trong").
//
// Khác Cần trục: mẫu Word Palăng KHÔNG có "tầm với" trong kết luận -- chỉ
// có trong_tai_toi_da, không có tam_voi_toi_da.
import {
  buildCommonReportData,
  type BuildReportDataInput,
} from "@/lib/reports/shared";

export function buildThietBiNangPaLangReportData(
  input: BuildReportDataInput
): Record<string, unknown> {
  const { equipment } = input;
  const spec = equipment.spec_values ?? {};

  const data = buildCommonReportData(input);

  // ----- Thông số cơ bản (spec_values, PROMPT-25) -----
  data.ma_hieu = spec.ma_hieu ?? "";
  data.trong_tai = spec.trong_tai ?? "";
  data.van_toc_nang_ha = spec.van_toc_nang_ha ?? "";
  data.van_toc_di_chuyen = spec.van_toc_di_chuyen ?? "";
  data.chieu_dai_duong_chay = spec.chieu_dai_duong_chay ?? "";
  data.do_cao_nang_moc = spec.do_cao_nang_moc ?? "";
  data.cong_dung = spec.cong_dung ?? "";

  // ----- Kết luận mục 2: "trọng tải lớn nhất ... tấn" -- tái dùng
  // spec.trong_tai, giống cách trong_tai_toi_da tái dùng spec.trong_tai ở
  // module Cầu trục/Cần trục.
  data.trong_tai_toi_da = spec.trong_tai ?? "";

  return data;
}

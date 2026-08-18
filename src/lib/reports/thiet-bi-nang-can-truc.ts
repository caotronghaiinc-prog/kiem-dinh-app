// PROMPT-23: map dữ liệu kiểm định "Thiết bị nâng - Cần trục" sang object
// phẳng để truyền thẳng vào docxtemplater.render(data). Mirror
// thiet-bi-nang-cau-truc.ts -- phần chung nằm ở shared.ts
// (buildCommonReportData), module này chỉ còn khối "Thông số cơ bản"/
// "Kết luận" riêng của Cần trục.
//
// Khác Cầu trục: KHÔNG cần bảng alias tên field value_fields -- đã đối
// chiếu trực tiếp tag thật trong mẫu Word (mau-bien-ban/
// BBKD-Thiet-bi-nang-kieu-can-v3.docx, unzip xem word/document.xml) với
// key value_fields seed ở migration 0016: khớp thẳng 100% (vd
// gt_20_tai_su_dung_tam_voi_nho_nhat), không lệch tên như cầu trục.
import {
  buildCommonReportData,
  type BuildReportDataInput,
} from "@/lib/reports/shared";

export function buildThietBiNangCanTrucReportData(
  input: BuildReportDataInput
): Record<string, unknown> {
  const { equipment } = input;
  const spec = equipment.spec_values ?? {};

  const data = buildCommonReportData(input);

  // ----- Thông số cơ bản (spec_values, PROMPT-22) -----
  data.ma_hieu = spec.ma_hieu ?? "";
  data.trong_tai = spec.trong_tai ?? "";
  data.van_toc_nang = spec.van_toc_nang ?? "";
  data.van_toc_quay = spec.van_toc_quay ?? "";
  data.van_toc_di_chuyen_may_truc = spec.van_toc_di_chuyen_may_truc ?? "";
  data.tam_voi = spec.tam_voi ?? "";
  data.do_cao_nang_moc_khi_thu = spec.do_cao_nang_moc_khi_thu ?? "";
  data.trong_tai_tam_voi_lon_nhat = spec.trong_tai_tam_voi_lon_nhat ?? "";
  data.cong_dung = spec.cong_dung ?? "";

  // ----- Kết luận mục 2: "trọng tải lớn nhất ... tấn, ở tầm với ... m" --
  // tái dùng spec.trong_tai/spec.tam_voi, giống cách trong_tai_toi_da tái
  // dùng spec.trong_tai ở module Cầu trục.
  data.trong_tai_toi_da = spec.trong_tai ?? "";
  data.tam_voi_toi_da = spec.tam_voi ?? "";

  return data;
}

// PROMPT-27: map dữ liệu kiểm định "Thiết bị nâng - Tời" sang object phẳng
// để truyền thẳng vào docxtemplater.render(data). Mirror
// thiet-bi-nang-pa-lang.ts -- phần chung nằm ở shared.ts
// (buildCommonReportData), module này chỉ còn khối "Thông số cơ bản"/
// "Kết luận" riêng của Tời.
//
// Không cần bảng alias tên field value_fields -- đã đối chiếu trực tiếp
// tag thật trong mẫu Word (mau-bien-ban/BBKD-Toi-v1.docx, unzip xem
// word/document.xml) với key value_fields seed ở migration 0018: khớp
// thẳng 100% (vd gt_18_tai_trong_su_dung/gt_18_tai_trong_thu), giống hệt
// Palăng (migration 0018 mirror cấu trúc 0017).
//
// Giống Palăng: mẫu Word Tời KHÔNG có "tầm với" trong kết luận -- chỉ có
// trong_tai_toi_da, không có tam_voi_toi_da.
import {
  buildCommonReportData,
  type BuildReportDataInput,
} from "@/lib/reports/shared";

export function buildThietBiNangToiReportData(
  input: BuildReportDataInput
): Record<string, unknown> {
  const { equipment } = input;
  const spec = equipment.spec_values ?? {};

  const data = buildCommonReportData(input);

  // ----- Thông số cơ bản (spec_values, PROMPT-27) -----
  data.ma_hieu = spec.ma_hieu ?? "";
  data.trong_tai = spec.trong_tai ?? "";
  data.van_toc_toi = spec.van_toc_toi ?? "";
  data.chieu_cao_nang_chieu_dai_keo = spec.chieu_cao_nang_chieu_dai_keo ?? "";
  data.goc_nghieng_lon_nhat = spec.goc_nghieng_lon_nhat ?? "";
  data.cong_dung = spec.cong_dung ?? "";

  // ----- Kết luận mục 2: "trọng tải lớn nhất ... tấn" -- tái dùng
  // spec.trong_tai, giống cách trong_tai_toi_da tái dùng spec.trong_tai ở
  // các module còn lại.
  data.trong_tai_toi_da = spec.trong_tai ?? "";

  return data;
}

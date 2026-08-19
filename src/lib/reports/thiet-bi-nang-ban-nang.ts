// PROMPT-31: map dữ liệu kiểm định "Thiết bị nâng - Bàn nâng hàng" sang
// object phẳng để truyền thẳng vào docxtemplater.render(data). Mirror
// thiet-bi-nang-pa-lang.ts -- phần chung nằm ở shared.ts
// (buildCommonReportData), module này chỉ còn khối "Thông số cơ bản"/
// "Kết luận" riêng của Bàn nâng hàng. Loại thiết bị cuối cùng trong nhóm 6
// sub-type "Thiết bị nâng".
//
// Không cần bảng alias tên field value_fields -- đã đối chiếu trực tiếp
// tag thật trong mẫu Word (mau-bien-ban/BBKD-Ban-nang-v1.docx, unzip xem
// word/document.xml) với key value_fields seed ở migration 0020: khớp
// thẳng 100%.
//
// Giống Palăng/Tời/Vận thăng: mẫu Word Bàn nâng hàng KHÔNG có "tầm với"
// trong kết luận -- chỉ có trong_tai_toi_da, không có tam_voi_toi_da.
// Checklist (20 hạng mục, has_presence_flag) có mẫu cờ Có/không có khác
// hẳn mọi loại trước (hạng mục 7/8/11/12 có cờ -- điểm khác biệt duy nhất
// so với các loại thiết bị nâng khác) nhưng không ảnh hưởng module này vì
// logic checklist đã nằm hết trong buildCommonReportData(), tự đọc
// has_presence_flag/value_fields động theo item_order thật.
import {
  buildCommonReportData,
  type BuildReportDataInput,
} from "@/lib/reports/shared";

export function buildThietBiNangBanNangReportData(
  input: BuildReportDataInput
): Record<string, unknown> {
  const { equipment } = input;
  const spec = equipment.spec_values ?? {};

  const data = buildCommonReportData(input);

  // ----- Thông số cơ bản (spec_values, PROMPT-31) -----
  data.ma_hieu = spec.ma_hieu ?? "";
  data.trong_tai = spec.trong_tai ?? "";
  data.chieu_cao_nang = spec.chieu_cao_nang ?? "";
  data.van_toc_nang = spec.van_toc_nang ?? "";
  data.kich_thuoc_ban_nang = spec.kich_thuoc_ban_nang ?? "";
  data.cong_dung = spec.cong_dung ?? "";

  // ----- Kết luận mục 2: "trọng tải lớn nhất ... tấn" -- tái dùng
  // spec.trong_tai, giống cách trong_tai_toi_da tái dùng spec.trong_tai ở
  // các module còn lại.
  data.trong_tai_toi_da = spec.trong_tai ?? "";

  return data;
}

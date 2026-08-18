// PROMPT-21: map dữ liệu kiểm định "Thiết bị nâng - Cầu trục" sang object
// phẳng để truyền thẳng vào docxtemplater.render(data). Hàm THUẦN (không
// gọi Supabase/DOM) -- mọi dữ liệu cần thiết phải truyền vào qua input,
// dễ test độc lập.
//
// PROMPT-23: phần chung cho mọi loại thiết bị (checklist, hồ sơ, ghi nhận
// khác, chứng kiến, kiểm định viên, ảnh, ngày tháng...) đã tách sang
// shared.ts -- module này chỉ còn khối "Thông số cơ bản"/"Kết luận" riêng
// của Cầu trục. Xem registry.ts.
import {
  buildCommonReportData,
  type BuildReportDataInput,
  type ReportChecklistItem,
  type ReportChecklistResult,
  type ReportCustomer,
  type ReportEquipment,
  type ReportInspectionHistory,
  type ReportInspectorEntry,
  type ReportMetadata,
  type ReportNextInspectionInput,
  type ReportPhoto,
  type ReportPreviousInspection,
  type ReportTemplate,
  type ReportValueField,
  type ReportWitnessEntry,
} from "@/lib/reports/shared";

export type {
  BuildReportDataInput,
  ReportChecklistItem,
  ReportChecklistResult,
  ReportCustomer,
  ReportEquipment,
  ReportInspectionHistory,
  ReportInspectorEntry,
  ReportMetadata,
  ReportNextInspectionInput,
  ReportPhoto,
  ReportPreviousInspection,
  ReportTemplate,
  ReportValueField,
  ReportWitnessEntry,
};

// PROMPT-18/0013 seed 2 field "tai_trong_su_dung"/"tai_trong_thu" cho hạng
// mục 19/20/21, nhưng mẫu Word (v9) dùng tag {gt_19_tai_su_dung}/
// {gt_19_tai_thu} (không có "trong"). Phát hiện khi đối chiếu tag thật
// trong file .docx với dữ liệu đã seed -- không sửa lại DB (tránh động vào
// migration đã chạy), chỉ alias tên KEY khi build tag Word. Xem báo cáo
// PROMPT-21 gửi kèm.
const VALUE_FIELD_KEY_ALIASES: Record<string, string> = {
  tai_trong_su_dung: "tai_su_dung",
  tai_trong_thu: "tai_thu",
};

export function buildThietBiNangCauTrucReportData(
  input: BuildReportDataInput
): Record<string, unknown> {
  const { equipment } = input;
  const spec = equipment.spec_values ?? {};

  const data = buildCommonReportData(input, VALUE_FIELD_KEY_ALIASES);

  // ----- Thông số cơ bản (spec_values, PROMPT-20) -----
  data.ma_hieu = spec.ma_hieu ?? "";
  data.trong_tai = spec.trong_tai ?? "";
  data.trong_tai_cong_xon = spec.trong_tai_cong_xon ?? "";
  data.van_toc_nang_ha = spec.van_toc_nang_ha ?? "";
  data.van_toc_xe_con = spec.van_toc_xe_con ?? "";
  data.van_toc_di_chuyen = spec.van_toc_di_chuyen ?? "";
  data.khau_do = spec.khau_do ?? "";
  data.do_cao_nang_moc = spec.do_cao_nang_moc ?? "";
  data.cong_dung = spec.cong_dung ?? "";
  data.trong_tai_toi_da = spec.trong_tai ?? "";

  return data;
}

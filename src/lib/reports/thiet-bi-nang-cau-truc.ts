// PROMPT-21: map dữ liệu kiểm định "Thiết bị nâng - Cầu trục" sang object
// phẳng để truyền thẳng vào docxtemplater.render(data). Hàm THUẦN (không
// gọi Supabase/DOM) -- mọi dữ liệu cần thiết phải truyền vào qua input,
// dễ test độc lập.
//
// Ký tự checkbox lấy NGUYÊN VĂN từ yêu cầu PROMPT-21 (đã kiểm chứng chạy
// đúng với docxtemplater trên máy tác giả prompt) -- KHÔNG gõ lại tay để
// tránh lệch mã Unicode giữa ☑/☒ hay biến thể encoding.
export const CHECKED = "☑";
export const UNCHECKED = "☐";

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

export interface ReportCustomer {
  company_name: string;
  address: string | null;
}

export interface ReportEquipment {
  code: string;
  type: string | null;
  serial_number: string | null;
  manufacture_year: number | null;
  manufacturer: string | null;
  notes: string | null;
  location: string | null;
  spec_values: Record<string, string> | null;
  customer: ReportCustomer | null;
}

export interface ReportTemplate {
  source_document: string | null;
}

export interface ReportInspectorEntry {
  ten: string;
  so_hieu: string | null;
}

export interface ReportWitnessEntry {
  ten: string;
  chuc_vu: string | null;
}

export interface ReportMetadata {
  hinh_thuc_kiem_dinh?: "lan_dau" | "dinh_ky_hang_nam" | "dinh_ky" | "bat_thuong" | null;
  ly_do_bat_thuong?: string | null;
  kiem_dinh_vien?: ReportInspectorEntry[];
  nguoi_chung_kien?: ReportWitnessEntry[];
  dia_diem_lap_bien_ban?: string | null;
  kien_nghi?: string | null;
  so_tem?: string | null;
  vi_tri_tem?: string | null;
  kiem_tra_ho_so?: { day_du: boolean; ly_do: string | null } | null;
  ghi_nhan_khac?: string | null;
}

export interface ReportInspectionHistory {
  inspection_date: string; // yyyy-mm-dd
  report_number: string | null;
  new_expiry_date: string | null; // yyyy-mm-dd | null
  result: "pass" | "fail" | "pending" | null;
  report_metadata: ReportMetadata | null;
}

export interface ReportPreviousInspection {
  inspection_date: string; // yyyy-mm-dd
}

export interface ReportValueField {
  key: string;
  label: string;
  unit: string | null;
}

export interface ReportChecklistItem {
  id: string;
  item_order: number;
  has_presence_flag: boolean;
  value_fields: ReportValueField[];
}

export interface ReportChecklistResult {
  checklist_item_id: string;
  result: "dat" | "khong_dat" | "khong_danh_gia";
  presence_value: "co" | "khong_co" | null;
  values: Record<string, string> | null;
  note: string | null;
}

export interface ReportPhoto {
  category: "tong_the" | "chi_tiet_khong_dat";
  storage_path: string;
}

/** 2 field hỏi trong dialog xuất báo cáo -- thuộc về LẦN KIỂM ĐỊNH SAU, hệ
 * thống hiện chưa có chỗ lưu nên hỏi ngay lúc xuất thay vì lúc ghi nhận. */
export interface ReportNextInspectionInput {
  hinh_thuc_kd_lan_sau: string;
  ly_do_rut_ngan: string;
}

export interface BuildReportDataInput {
  equipment: ReportEquipment;
  template: ReportTemplate;
  inspectionHistory: ReportInspectionHistory;
  checklistItems: ReportChecklistItem[];
  checklistResults: ReportChecklistResult[];
  photos: ReportPhoto[];
  previousInspection: ReportPreviousInspection | null;
  nextInspectionForm: ReportNextInspectionInput;
}

function formatDateVi(isoDate: string): string {
  const [y, m, d] = isoDate.split("-");
  return `${d}/${m}/${y}`;
}

function splitIsoDateParts(isoDate: string): { day: string; month: string; year: string } {
  const [y, m, d] = isoDate.split("-");
  return { day: String(Number(d)), month: String(Number(m)), year: y };
}

export function buildThietBiNangCauTrucReportData(
  input: BuildReportDataInput
): Record<string, unknown> {
  const { equipment, template, inspectionHistory, checklistItems, checklistResults, photos, previousInspection, nextInspectionForm } =
    input;
  const metadata = inspectionHistory.report_metadata ?? {};
  const spec = equipment.spec_values ?? {};

  const data: Record<string, unknown> = {};

  // ----- Checklist A/B/C -- tag động theo item_order thật, không hardcode danh sách -----
  for (const item of checklistItems) {
    const result = checklistResults.find((r) => r.checklist_item_id === item.id);
    const n = item.item_order;
    data[`cb_${n}_dat`] = result?.result === "dat" ? CHECKED : UNCHECKED;
    data[`cb_${n}_kdat`] = result?.result === "khong_dat" ? CHECKED : UNCHECKED;
    if (item.has_presence_flag) {
      data[`pf_${n}`] = result?.presence_value === "co" ? CHECKED : UNCHECKED;
    }
    for (const field of item.value_fields) {
      const tagKey = VALUE_FIELD_KEY_ALIASES[field.key] ?? field.key;
      data[`gt_${n}_${tagKey}`] = result?.values?.[field.key] ?? "";
    }
  }

  // Lý do không đạt (gộp tự động từ note của các hạng mục khong_dat) --
  // xem ghi chú trong báo cáo PROMPT-21: chọn tự gộp thay vì thêm 1 field
  // report_metadata mới, vì đúng với gợi ý chính trong yêu cầu và không
  // cần thêm UI.
  const khongDatLines = checklistItems
    .map((item) => {
      const result = checklistResults.find((r) => r.checklist_item_id === item.id);
      if (result?.result !== "khong_dat") return null;
      const note = result.note?.trim();
      return `Hạng mục ${item.item_order}: ${note || "(không có ghi chú)"}`;
    })
    .filter((line): line is string => line !== null);
  data.ly_do_khong_dat_checklist = khongDatLines.join("\n");

  // ----- Hình thức kiểm định -----
  const hinhThuc = metadata.hinh_thuc_kiem_dinh ?? null;
  data.cb_lan_dau = hinhThuc === "lan_dau" ? CHECKED : UNCHECKED;
  data.cb_dk_hang_nam = hinhThuc === "dinh_ky_hang_nam" ? CHECKED : UNCHECKED;
  data.cb_dinh_ky = hinhThuc === "dinh_ky" ? CHECKED : UNCHECKED;
  data.cb_bat_thuong = hinhThuc === "bat_thuong" ? CHECKED : UNCHECKED;
  data.ly_do_bat_thuong = metadata.ly_do_bat_thuong ?? "";

  // ----- Kiểm tra hồ sơ kỹ thuật -----
  const hoSo = metadata.kiem_tra_ho_so ?? null;
  const rowKey = hinhThuc === "lan_dau" ? "hs1" : hinhThuc === "bat_thuong" ? "hs3" : "hs2";
  for (const key of ["hs1", "hs2", "hs3"]) {
    data[`cb_${key}_dd`] = UNCHECKED;
    data[`cb_${key}_kdd`] = UNCHECKED;
  }
  if (hoSo) {
    data[`cb_${rowKey}_dd`] = hoSo.day_du ? CHECKED : UNCHECKED;
    data[`cb_${rowKey}_kdd`] = hoSo.day_du ? UNCHECKED : CHECKED;
  }
  data.cb_hoso_dat = hoSo?.day_du === true ? CHECKED : UNCHECKED;
  data.cb_hoso_kdat = hoSo?.day_du === false ? CHECKED : UNCHECKED;
  data.ly_do_khong_dat_ho_so = hoSo?.day_du === false ? hoSo.ly_do ?? "" : "";

  // ----- Ghi nhận khác (1 đoạn text tự do, không có cấu trúc tên/yêu cầu riêng) -----
  data.ghi_nhan_khac_ten = "";
  data.ghi_nhan_khac_yeu_cau = "";
  data.ghi_nhan_khac_ghi_chu = metadata.ghi_nhan_khac ?? "";
  data.cb_gnk_dat = UNCHECKED;
  data.cb_gnk_kdat = UNCHECKED;

  // ----- Kết quả tổng -----
  data.cb_dat_tong = inspectionHistory.result === "pass" ? CHECKED : UNCHECKED;
  data.cb_khong_dat_tong = inspectionHistory.result === "pass" ? UNCHECKED : CHECKED;

  // ----- Người chứng kiến (loop {#chung_kien}) -- fallback 1 dòng trống để không mất dòng ký -----
  const witnesses = metadata.nguoi_chung_kien ?? [];
  data.chung_kien =
    witnesses.length > 0
      ? witnesses.map((w, i) => ({ stt: i + 1, ten: w.ten || "......", chuc_vu: w.chuc_vu || "......" }))
      : [{ stt: 1, ten: "......", chuc_vu: "......" }];

  // ----- Kiểm định viên -----
  const inspectors = metadata.kiem_dinh_vien ?? [];
  data.ten_kdv_1 = inspectors[0]?.ten ?? "";
  data.so_hieu_kdv_1 = inspectors[0]?.so_hieu ?? "";
  data.ten_kdv_2 = inspectors[1]?.ten ?? "";
  data.so_hieu_kdv_2 = inspectors[1]?.so_hieu ?? "";

  // ----- Ngày kiểm định lần trước -----
  if (previousInspection) {
    data.ngay_kd_lan_truoc = formatDateVi(previousInspection.inspection_date);
    data.don_vi_kd_truoc = "INCERT";
  } else {
    data.ngay_kd_lan_truoc = "";
    data.don_vi_kd_truoc = "";
  }

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

  // Cột có sẵn trên equipment, KHÔNG phải spec_values.
  data.so_che_tao = equipment.serial_number ?? "";
  data.nam_san_xuat = equipment.manufacture_year ? String(equipment.manufacture_year) : "";
  data.nha_che_tao = equipment.manufacturer ?? "";
  data.thong_tin_khac = equipment.notes ?? "";

  // ----- Field 1-1 đơn giản -----
  data.so_bien_ban = inspectionHistory.report_number ?? "";
  data.ten_khach_hang = equipment.customer?.company_name ?? "";
  data.dia_chi_tru_so = equipment.customer?.address ?? "";
  data.dia_chi_lap_dat = equipment.location ?? "";
  data.quy_trinh_ap_dung = template.source_document ?? "";
  // "Thời gian kiểm định" -- suy luận từ vị trí trong mẫu (đứng ngay sau
  // "Địa chỉ lắp đặt", trước "Chứng kiến kiểm định") khớp với "Đã tiến
  // hành kiểm định:..." ở form gốc PROMPT-18 -- dùng ngày kiểm định của
  // chính lần này, KHÔNG phải report_metadata.dia_diem_lap_bien_ban như
  // gộp chung trong yêu cầu gốc. Đây là 1 diễn giải cần bạn xác nhận lại,
  // xem báo cáo PROMPT-21.
  data.thoi_gian_kiem_dinh = formatDateVi(inspectionHistory.inspection_date);
  data.dia_diem_lap = metadata.dia_diem_lap_bien_ban ?? "";
  data.kien_nghi = metadata.kien_nghi ?? "";
  // "Thời hạn thực hiện kiến nghị" -- tag có trong mẫu Word nhưng KHÔNG có
  // trường nhập tương ứng ở PROMPT-19/19b (chỉ mới bổ sung vi_tri_tem ở
  // PROMPT-21). Để trống tạm, cần bạn quyết định có bổ sung UI hay không.
  data.thoi_han_kien_nghi = "";
  data.so_tem = metadata.so_tem ?? "";
  data.vi_tri_tem = metadata.vi_tri_tem ?? "";

  const lap = splitIsoDateParts(inspectionHistory.inspection_date);
  data.ngay_lap = lap.day;
  data.thang_lap = lap.month;
  data.nam_lap = lap.year;

  if (inspectionHistory.new_expiry_date) {
    const next = splitIsoDateParts(inspectionHistory.new_expiry_date);
    data.ngay_kd_lan_sau = next.day;
    data.thang_kd_lan_sau = next.month;
    data.nam_kd_lan_sau = next.year;
  } else {
    data.ngay_kd_lan_sau = "";
    data.thang_kd_lan_sau = "";
    data.nam_kd_lan_sau = "";
  }

  data.hinh_thuc_kd_lan_sau = nextInspectionForm.hinh_thuc_kd_lan_sau;
  data.ly_do_rut_ngan = nextInspectionForm.ly_do_rut_ngan ?? "";

  // Số đăng ký chứng nhận của tổ chức kiểm định -- KHÔNG có chỗ lưu giá
  // trị thật trong hệ thống, và đây là số đăng ký thật của công ty (dữ
  // liệu pháp lý) -- để trống, KHÔNG bịa số. Cần bạn cung cấp giá trị thật
  // rồi mới hardcode hoặc thêm chỗ lưu phù hợp.
  data.so_dang_ky_chung_nhan = "";

  // ----- Ảnh (tag {%anh} bên trong loop -- value = storage_path, dùng làm key tra map buffer/size) -----
  data.anh_tong_the = photos
    .filter((p) => p.category === "tong_the")
    .map((p) => ({ anh: p.storage_path }));
  data.anh_khong_dat = photos
    .filter((p) => p.category === "chi_tiet_khong_dat")
    .map((p) => ({ anh: p.storage_path }));

  return data;
}

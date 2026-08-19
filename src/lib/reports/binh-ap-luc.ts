// PROMPT-35: map dữ liệu kiểm định "Bình áp lực" sang object phẳng để
// truyền thẳng vào docxtemplater.render(data). Mirror các module Thiết bị
// nâng -- gọi buildCommonReportData(input) lấy phần chung (checklist 17
// hạng mục III.3+III.5, hình thức kiểm định, chứng kiến, kiểm định viên,
// ảnh, ngày tháng, field 1-1...) rồi GHI ĐÈ/THÊM toàn bộ phần riêng của
// mẫu I-V (khác hẳn A/B/C của Thiết bị nâng).
//
// Không cần valueFieldKeyAliases -- 17 hạng mục checklist (migration 0021)
// không có value_fields nào cả (has_presence_flag/value_fields đều rỗng
// cho toàn bộ 17 dòng).
//
// Mọi field đọc từ report_metadata.binh_ap_luc đều phải AN TOÀN khi field
// này null (kiểm định viên chưa điền phần mở rộng) -- không throw, trả về
// ""/mảng rỗng/UNCHECKED hết thay vì chặn xuất báo cáo.
import {
  CHECKED,
  UNCHECKED,
  buildCommonReportData,
  type BuildReportDataInput,
  type ReportMetadataBinhApLuc,
} from "@/lib/reports/shared";

function checkedIf(condition: boolean): string {
  return condition ? CHECKED : UNCHECKED;
}

/** 1 nhóm hồ sơ (III.1) -- tag {key}_{i}_co/{key}_{i}_kco, i chạy 1..len. */
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

export function buildBinhApLucReportData(input: BuildReportDataInput): Record<string, unknown> {
  const { equipment, inspectionHistory } = input;
  const spec = equipment.spec_values ?? {};
  // report_metadata.binh_ap_luc có thể null (kiểm định viên chưa điền phần
  // mở rộng) -- mọi truy cập bên dưới đều qua optional chaining, không
  // throw, để trống/UNCHECKED hết thay vì chặn xuất báo cáo.
  const bal: ReportMetadataBinhApLuc | null | undefined = inspectionHistory.report_metadata?.binh_ap_luc;

  const data = buildCommonReportData(input);

  // ----- Mục I - Thông số cơ bản (spec_values, PROMPT-33) -----
  data.loai_ma_hieu = spec.loai_ma_hieu ?? "";
  data.nuoc_che_tao = spec.nuoc_che_tao ?? "";
  data.dung_tich = spec.dung_tich ?? "";
  data.ap_suat_thiet_ke = spec.ap_suat_thiet_ke ?? "";
  data.ap_suat_lam_viec_lon_nhat = spec.ap_suat_lam_viec_lon_nhat ?? "";
  data.moi_chat_lam_viec = spec.moi_chat_lam_viec ?? "";
  data.nhiet_do_lam_viec_lon_nhat = spec.nhiet_do_lam_viec_lon_nhat ?? "";
  data.cong_dung = spec.cong_dung ?? "";
  // ap_suat_lam_viec_lon_nhat/nhiet_do_lam_viec_lon_nhat dùng lại nguyên 2
  // tag trên ở mục IV luôn -- không set field riêng.

  // ----- Mục III.1 - Kiểm tra hồ sơ -----
  buildHoSoGroupTags(data, "hs1", bal?.ho_so_lan_dau, 5);
  buildHoSoGroupTags(data, "hs2", bal?.ho_so_dinh_ky, 6);
  buildHoSoGroupTags(data, "hs3", bal?.ho_so_bat_thuong, 8);
  data.ho_so_nhan_xet = bal?.ho_so_nhan_xet ?? "";
  // GHI ĐÈ cb_hoso_dat/cb_hoso_kdat -- buildCommonReportData đã set 2 tag
  // này từ kiem_tra_ho_so (luôn null cho Bình áp lực, xem
  // inspect-checklist-form.tsx), phải ghi đè bằng ho_so_ket_qua thật.
  data.cb_hoso_dat = checkedIf(bal?.ho_so_ket_qua === "dat");
  data.cb_hoso_kdat = checkedIf(bal?.ho_so_ket_qua === "khong_dat");

  // ----- Mục III.2 - Thiết bị, dụng cụ (loop {#thiet_bi_dung_cu}) -----
  data.thiet_bi_dung_cu = (bal?.thiet_bi_dung_cu ?? []).map((row, i) => ({
    stt: i + 1,
    ten_goi_ma_hieu: row.ten_goi_ma_hieu || "",
    thang_do: row.thang_do || "",
    so_nhan_dang: row.so_nhan_dang || "",
    so_gcn_kdhc: row.so_gcn_kdhc || "",
    han_kdhc: row.han_kdhc || "",
  }));

  // ----- Mục III.3 (phụ) - Tình trạng thiết bị kiểm tra an toàn -----
  data.cb_kt_ca_ngoai_trong = checkedIf(bal?.loai_kiem_tra === "ca_ngoai_trong");
  data.cb_kt_chi_ngoai = checkedIf(bal?.loai_kiem_tra === "chi_ngoai");
  data.ly_do_khong_kiem_tra_trong = bal?.ly_do_khong_kiem_tra_trong ?? "";
  data.van_an_toan_kieu_loai = bal?.van_an_toan_kieu_loai ?? "";
  data.van_an_toan_kich_co = bal?.van_an_toan_kich_co ?? "";
  data.van_an_toan_so_luong = bal?.van_an_toan_so_luong ?? "";
  data.ap_ke_thang_do = bal?.ap_ke_thang_do ?? "";
  data.ap_ke_cap_cx = bal?.ap_ke_cap_cx ?? "";
  data.ap_ke_so_tem_kd = bal?.ap_ke_so_tem_kd ?? "";
  data.ap_ke_han_kd = bal?.ap_ke_han_kd ?? "";
  data.do_muc_kieu_loai = bal?.do_muc_kieu_loai ?? "";
  data.do_muc_so_luong = bal?.do_muc_so_luong ?? "";
  data.kiem_tra_ngoai_trong_nhan_xet = bal?.kiem_tra_ngoai_trong_nhan_xet ?? "";
  data.cb_ktnt_dat = checkedIf(bal?.kiem_tra_ngoai_trong_ket_qua === "dat");
  data.cb_ktnt_kdat = checkedIf(bal?.kiem_tra_ngoai_trong_ket_qua === "khong_dat");

  // ----- Mục III.4 - Thử nghiệm -----
  const thuBen = bal?.thu_ben;
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

  const thuKin = bal?.thu_kin;
  data.thu_kin_moi_chat = thuKin?.moi_chat ?? "";
  data.thu_kin_ap_suat = thuKin?.ap_suat_bar ?? "";
  data.thu_kin_thoi_gian = thuKin?.thoi_gian_phut ?? "";
  data.cb_tk_khong_thu = checkedIf(thuKin?.khong_thu === true);
  data.cb_tk_ro_ri_khong = checkedIf(thuKin?.ro_ri === "khong");
  data.cb_tk_ro_ri_co = checkedIf(thuKin?.ro_ri === "co");
  data.cb_tk_tutap_khong = checkedIf(thuKin?.tut_ap === "khong");
  data.cb_tk_tutap_co = checkedIf(thuKin?.tut_ap === "co");

  data.ly_do_khong_thu = bal?.ly_do_khong_thu ?? "";
  data.thu_nghiem_nhan_xet = bal?.thu_nghiem_nhan_xet ?? "";

  // ----- Mục III.5.1 - Thử van an toàn -----
  data.cb_van_tt_dat = checkedIf(bal?.van_thu_truc_tiep === "dat");
  data.cb_van_tt_kdat = checkedIf(bal?.van_thu_truc_tiep === "khong_dat");
  data.cb_van_tt_khongapdung = checkedIf(bal?.van_thu_truc_tiep === "khong_ap_dung");
  data.cb_van_cd_khongapdung = checkedIf(bal?.van_thu_chuyen_dung_ap_dung === false);
  data.van_phe_duyet_ngay = bal?.van_phe_duyet_ngay ?? "";
  data.van_ap_suat_cai_dat = bal?.van_ap_suat_cai_dat ?? "";
  data.cb_van_niemchi_dat = checkedIf(bal?.van_tinh_trang_niem_chi === "dat");
  data.cb_van_niemchi_kdat = checkedIf(bal?.van_tinh_trang_niem_chi === "khong_dat");
  data.cb_van_hoso_dat = checkedIf(bal?.van_ho_so_day_du === "dat");
  data.cb_van_hoso_kdat = checkedIf(bal?.van_ho_so_day_du === "khong_dat");
  data.cb_van_apsuat_dat = checkedIf(bal?.van_ap_suat_phu_hop === "dat");
  data.cb_van_apsuat_kdat = checkedIf(bal?.van_ap_suat_phu_hop === "khong_dat");
  data.cb_van_chapnhan = checkedIf(bal?.van_chap_nhan_ket_qua === "chap_nhan");
  data.cb_van_khongchapnhan = checkedIf(bal?.van_chap_nhan_ket_qua === "khong_chap_nhan");

  // ----- Mục IV - Kết luận riêng -----
  data.ap_suat_cai_dat_cung_van_hanh = bal?.ap_suat_cai_dat_cung_van_hanh ?? "";
  data.ap_suat_cai_dat_khong_cung_van_hanh = bal?.ap_suat_cai_dat_khong_cung_van_hanh ?? "";
  data.so_gcn_ket_qua = bal?.so_gcn_ket_qua ?? "";
  data.ngay_cap_gcn = bal?.ngay_cap_gcn ?? "";
  data.don_vi_cap_gcn = bal?.don_vi_cap_gcn ?? "";

  return data;
}

// PROMPT-41: map dữ liệu kiểm định "Nồi gia nhiệt dầu" sang object phẳng để
// truyền thẳng vào docxtemplater.render(data). Mirror binh-ap-luc.ts/noi-hoi.ts.
//
// KHÔNG có hạng mục nào trong 18 hạng mục checklist cần value_fields
// (migration 0023 toàn bộ value_fields = '[]') -- không có tag gt_${n}_*
// nào cần tính tới, khác hẳn Nồi hơi.
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

/** 1 nhóm hồ sơ (mục 1) -- tag {key}_{i}_co/{key}_{i}_kco, i chạy 1..len. */
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
  // report_metadata.noi_gia_nhiet_dau có thể null (kiểm định viên chưa điền
  // phần mở rộng) -- mọi truy cập bên dưới đều qua optional chaining.
  const ngnd: ReportMetadataNoiGiaNhietDau | null | undefined =
    inspectionHistory.report_metadata?.noi_gia_nhiet_dau;

  const data = buildCommonReportData(input);

  // ----- Mục I - Thông số cơ bản (spec_values, PROMPT-41) -----
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
  // GHI ĐÈ cb_hoso_dat/cb_hoso_kdat -- buildCommonReportData đã set 2 tag
  // này từ kiem_tra_ho_so (luôn null cho Nồi gia nhiệt dầu, giống Bình áp
  // lực/Nồi hơi), phải ghi đè bằng ho_so_ket_qua thật.
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
  // mục render qua checklist generic cb_15_dat..cb_18_dat (không có
  // cb_kdanhgia trên mẫu giấy nhưng vẫn OK để tag thừa trong template nếu
  // không dùng).

  // ----- Mục IV - Kết luận riêng -----
  data.ap_suat_cai_dat_cung_kiem_dinh = ngnd?.ap_suat_cai_dat_cung_kiem_dinh ?? "";
  data.ap_suat_cai_dat_khong_cung_kiem_dinh = ngnd?.ap_suat_cai_dat_khong_cung_kiem_dinh ?? "";
  data.so_gcn_ket_qua = ngnd?.so_gcn_ket_qua ?? "";
  data.ngay_cap_gcn = ngnd?.ngay_cap_gcn ?? "";
  data.don_vi_cap_gcn = ngnd?.don_vi_cap_gcn ?? "";

  return data;
}

// PROMPT-39: map dữ liệu kiểm định "Nồi hơi" sang object phẳng để truyền
// thẳng vào docxtemplater.render(data). Mirror binh-ap-luc.ts (PROMPT-33).
//
// CHƯA có mẫu Word (public/report-templates/noi-hoi.docx) -- mentor sẽ đưa
// file vào ở PROMPT/commit riêng sau. Module này chỉ chuẩn bị sẵn data,
// chưa xuất được thật cho tới khi có mẫu.
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

export function buildNoiHoiReportData(input: BuildReportDataInput): Record<string, unknown> {
  const { equipment, inspectionHistory } = input;
  const spec = equipment.spec_values ?? {};
  // report_metadata.noi_hoi có thể null (kiểm định viên chưa điền phần mở
  // rộng) -- mọi truy cập bên dưới đều qua optional chaining, không throw.
  const nh: ReportMetadataNoiHoi | null | undefined = inspectionHistory.report_metadata?.noi_hoi;

  const data = buildCommonReportData(input);

  // ----- Mục I - Thông số cơ bản (spec_values, PROMPT-39) -----
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
  // GHI ĐÈ cb_hoso_dat/cb_hoso_kdat -- buildCommonReportData đã set 2 tag
  // này từ kiem_tra_ho_so (luôn null cho Nồi hơi, giống Bình áp lực), phải
  // ghi đè bằng ho_so_ket_qua thật.
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

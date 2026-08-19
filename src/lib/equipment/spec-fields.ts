export interface EquipmentSpecField {
  key: string;
  label: string;
  unit: string | null;
}

// PROMPT-20: field thông số kỹ thuật có CẤU TRÚC theo loại thiết bị, lưu vào
// equipment.spec_values (jsonb) -- chuẩn bị dữ liệu cho PROMPT-21 (xuất biên
// bản Word tự động điền). Loại thiết bị nào KHÔNG có trong map này trả về
// mảng rỗng -- vẫn dùng cột `specifications` (text tự do) như cũ, không đổi.
//
// KHÔNG định nghĩa field trùng với cột đã có sẵn trên equipment: số chế tạo
// dùng serial_number, năm sản xuất dùng manufacture_year, nhà chế tạo dùng
// manufacturer, thông tin khác dùng notes.
export const EQUIPMENT_SPEC_FIELDS: Record<string, EquipmentSpecField[]> = {
  "Thiết bị nâng - Cầu trục": [
    { key: "ma_hieu", label: "Mã hiệu", unit: null },
    { key: "trong_tai", label: "Trọng tải thiết kế/thực tế", unit: "tấn" },
    { key: "trong_tai_cong_xon", label: "Trọng tải ở đầu tự do của công xôn", unit: "tấn" },
    { key: "van_toc_nang_ha", label: "Vận tốc nâng/hạ", unit: "m/ph" },
    { key: "van_toc_xe_con", label: "Vận tốc di chuyển xe con", unit: "m/ph" },
    { key: "van_toc_di_chuyen", label: "Vận tốc di chuyển thiết bị", unit: "m/ph" },
    { key: "khau_do", label: "Khẩu độ, công xôn", unit: "m" },
    { key: "do_cao_nang_moc", label: "Độ cao nâng móc", unit: "m" },
    { key: "cong_dung", label: "Công dụng", unit: null },
  ],
  "Thiết bị nâng - Cần trục": [
    { key: "ma_hieu", label: "Mã hiệu", unit: null },
    { key: "trong_tai", label: "Trọng tải thiết kế/thực tế (max)", unit: "tấn" },
    { key: "van_toc_nang", label: "Vận tốc nâng", unit: "m/ph" },
    { key: "van_toc_quay", label: "Vận tốc quay", unit: "v/ph" },
    { key: "van_toc_di_chuyen_may_truc", label: "Vận tốc di chuyển máy trục", unit: "m/ph" },
    { key: "tam_voi", label: "Tầm với thiết kế/thực tế", unit: "m" },
    { key: "do_cao_nang_moc_khi_thu", label: "Độ cao nâng móc khi thử (max)", unit: "m" },
    {
      key: "trong_tai_tam_voi_lon_nhat",
      label: "Trọng tải ở tầm với lớn nhất thiết kế/thực tế",
      unit: "tấn",
    },
    { key: "cong_dung", label: "Công dụng", unit: null },
  ],
  "Thiết bị nâng - Palăng": [
    { key: "ma_hieu", label: "Mã hiệu", unit: null },
    { key: "trong_tai", label: "Trọng tải thiết kế/thực tế", unit: "tấn" },
    { key: "van_toc_nang_ha", label: "Vận tốc nâng/hạ", unit: "m/ph" },
    { key: "van_toc_di_chuyen", label: "Vận tốc di chuyển thiết bị", unit: "m/ph" },
    { key: "chieu_dai_duong_chay", label: "Chiều dài đường chạy", unit: "m" },
    { key: "do_cao_nang_moc", label: "Độ cao nâng móc", unit: "m" },
    { key: "cong_dung", label: "Công dụng", unit: null },
  ],
  "Thiết bị nâng - Tời": [
    { key: "ma_hieu", label: "Mã hiệu", unit: null },
    { key: "trong_tai", label: "Trọng tải thiết kế/thực tế", unit: "tấn" },
    { key: "van_toc_toi", label: "Vận tốc tời", unit: "m/ph" },
    { key: "chieu_cao_nang_chieu_dai_keo", label: "Chiều cao nâng/Chiều dài kéo", unit: "m" },
    { key: "goc_nghieng_lon_nhat", label: "Góc nghiêng lớn nhất", unit: "độ" },
    { key: "cong_dung", label: "Công dụng", unit: null },
  ],
  "Thiết bị nâng - Vận thăng nâng hàng": [
    { key: "loai_thiet_bi", label: "Loại thiết bị", unit: null },
    { key: "ma_hieu", label: "Mã hiệu", unit: null },
    { key: "trong_tai", label: "Trọng tải thiết kế/sử dụng", unit: "tấn" },
    { key: "van_toc_nang", label: "Vận tốc nâng", unit: "m/ph" },
    { key: "chieu_cao_nang", label: "Chiều cao nâng thiết kế/thực tế", unit: "m" },
    { key: "cong_dung", label: "Công dụng", unit: null },
  ],
};

export function getEquipmentSpecFields(type: string | null | undefined): EquipmentSpecField[] {
  if (!type) return [];
  return EQUIPMENT_SPEC_FIELDS[type] ?? [];
}

// PROMPT-22: tiêu đề khối field trong equipment-form.tsx từng bị hardcode
// "Thông số kỹ thuật cầu trục" (PROMPT-20, lúc chỉ có 1 loại) -- sai khi
// chọn loại khác (vd Cần trục vẫn hiện chữ "cầu trục"). Suy ra tên hiển thị
// từ chính chuỗi type ("Thiết bị nâng - Cầu trục" -> "cầu trục") để tự đúng
// với mọi loại thêm sau này trong EQUIPMENT_SPEC_FIELDS, không cần sửa lại
// component mỗi khi thêm loại mới.
export function getSpecSectionLabel(type: string | null | undefined): string {
  if (!type) return "";
  const suffix = type.includes(" - ") ? type.split(" - ").pop() : type;
  return (suffix ?? "").toLowerCase();
}

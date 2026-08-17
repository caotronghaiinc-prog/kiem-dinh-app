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
};

export function getEquipmentSpecFields(type: string | null | undefined): EquipmentSpecField[] {
  if (!type) return [];
  return EQUIPMENT_SPEC_FIELDS[type] ?? [];
}

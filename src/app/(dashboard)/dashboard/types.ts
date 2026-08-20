/**
 * Dùng cho Widget 1 (Cảnh báo hạn kiểm định) và Widget 4 (Thiết bị theo
 * trạng thái) -- cả 2 widget này tính màu đỏ/vàng/xanh từ CHÍNH expiry_date
 * qua getExpiryStatus(), không dùng cột equipment.status (status không phân
 * biệt được đỏ/vàng, xem ghi chú ở page.tsx). Query đã lọc sẵn
 * status != 'inactive' ở tầng DB nên type này không cần field status.
 */
export interface EquipmentAlertRow {
  id: string;
  code: string;
  name: string;
  expiry_date: string | null;
  // Quan hệ nhiều-1 (nhiều equipment -> 1 customer) nên Supabase trả về
  // object đơn, không phải mảng.
  customer: { company_name: string } | null;
}

// PROMPT-43: Widget "Cảnh báo hạn hiệu chuẩn dụng cụ đo" (mirror Widget 1) --
// calibration_not_applicable = true bị loại khỏi đếm màu VÀ danh sách gần
// hết hạn ngay ở dashboard/page.tsx trước khi truyền xuống widget (coi như
// không có hạn cần theo dõi), nên type này không cần field đó.
export interface ToolAlertRow {
  id: string;
  code: string;
  name: string;
  calibration_due_date: string | null;
}

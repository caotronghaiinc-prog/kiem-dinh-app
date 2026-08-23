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

// PROMPT-51: Widget "Yêu cầu xin sửa đang chờ duyệt" -- chỉ hiện cho admin,
// tự ẩn hoàn toàn khi không có yêu cầu pending nào (khác ExpiryAlertWidget/
// CalibrationAlertWidget luôn hiện kèm trạng thái rỗng -- widget này gắn với
// 1 hành động admin cần làm, không có gì để duyệt thì không cần chiếm chỗ
// trên dashboard).
export interface EditRequestAlertRow {
  id: string;
  reason: string;
  created_at: string;
  requested_by_name: string | null;
  equipment_id: string;
  equipment_code: string;
  equipment_name: string;
}

// PROMPT-57: Widget "Hợp đồng còn công nợ" -- tự ẩn hoàn toàn khi không có
// hợp đồng nào còn nợ (mirror EditRequestAlertRow, không phải mirror
// CalibrationAlertWidget). debt = total_value - paid_total, tính sẵn ở
// page.tsx để widget không cần biết logic tính toán.
export interface ContractDebtAlertRow {
  id: string;
  code: string;
  contract_no: string;
  customer_name: string | null;
  debt: number;
}

// PROMPT-63: Widget "Chứng chỉ sắp/đã hết hạn" -- chỉ hiện cho admin (mirror
// EditRequestAlertWidget), tính màu đỏ/vàng/xanh từ CHÍNH expiry_date qua
// getExpiryStatus(), không cache trạng thái riêng.
export interface CertificateAlertRow {
  id: string;
  profile_id: string;
  certificate_type: string | null;
  certificate_number: string | null;
  expiry_date: string;
  profile: { full_name: string | null } | null;
}

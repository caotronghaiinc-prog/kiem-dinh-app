import type { InspectionResult } from "@/lib/inspection/result";

export interface EquipmentDetail {
  id: string;
  code: string;
  name: string;
  type: string | null;
  manufacturer: string | null;
  manufacture_year: number | null;
  serial_number: string | null;
  specifications: string | null;
  location: string | null;
  last_inspection_date: string | null;
  expiry_date: string | null;
  inspection_cycle: number | null;
  status: string;
  notes: string | null;
  // PROMPT-20: thông số kỹ thuật có cấu trúc theo loại thiết bị (jsonb) --
  // xem src/lib/equipment/spec-fields.ts. Loại thiết bị chưa định nghĩa
  // field thì luôn là {}.
  spec_values: Record<string, string> | null;
  customer_id: string;
  // Quan hệ nhiều-1 (nhiều equipment -> 1 customer) nên Supabase trả về
  // object đơn, không phải mảng.
  customer: { company_name: string } | null;
}

export interface InspectionPhotoRow {
  id: string;
  category: "tong_the" | "chi_tiet_khong_dat";
  storage_path: string;
}

export interface InspectionHistoryDetailRow {
  id: string;
  inspection_date: string;
  result: InspectionResult | null;
  report_number: string | null;
  new_expiry_date: string | null;
  notes: string | null;
  attachment_url: string | null;
  // PROMPT-50: bản ghi đã xuất biên bản Word thì bị khóa -- inspector không
  // sửa được nữa (RLS migration 0002), admin luôn sửa được. Dùng để ẩn/hiện
  // nút "Sửa" ở inspection-history-section.tsx.
  is_locked: boolean;
  // Quan hệ nhiều-1 (nhiều inspection_history -> 1 profiles) nên Supabase
  // trả về object đơn, không phải mảng.
  inspector: { full_name: string | null } | null;
  // Quan hệ 1-nhiều (PROMPT-19b) -- Supabase trả về mảng.
  photos: InspectionPhotoRow[];
  // PROMPT-51: yêu cầu "xin mở khóa" đang chờ Admin duyệt (nếu có) -- null
  // nghĩa là chưa có yêu cầu nào đang pending cho bản ghi này. Dùng để hiện
  // nút "Xin sửa" (inspector, chưa có pending)/badge "Đang chờ Admin duyệt"
  // (inspector, đã có pending)/nút duyệt-từ chối (admin) ở
  // inspection-history-section.tsx.
  pending_edit_request: {
    id: string;
    reason: string;
    requested_by_name: string | null;
    created_at: string;
  } | null;
}

import type { UserRole } from "@/lib/types/profile";

/**
 * Dùng cho bảng danh sách /employees. latest_labor_contract_end_date = ngày
 * kết thúc của hợp đồng lao động có start_date MỚI NHẤT của người này (quy
 * ước tối giản PROMPT-65, KHÔNG phải khái niệm "hợp đồng đang hiệu lực") --
 * null nếu chưa có hợp đồng nào HOẶC hợp đồng mới nhất là loại "Không xác
 * định thời hạn" (không bao giờ cảnh báo) -- page.tsx tự tính, không cache
 * trong DB.
 */
export interface EmployeeListItem {
  id: string;
  full_name: string | null;
  email: string;
  role: UserRole;
  phone: string | null;
  active: boolean;
  job_title: string | null;
  latest_labor_contract_end_date: string | null;
}

/** Dùng cho trang chi tiết /employees/[id]. */
export interface EmployeeDetail {
  id: string;
  full_name: string | null;
  email: string;
  role: UserRole;
  phone: string | null;
  active: boolean;
  job_title: string | null;
  date_of_birth: string | null;
  cccd_number: string | null;
  start_date: string | null;
  permanent_address: string | null;
}

/** Cho bảng chứng chỉ ở trang chi tiết nhân viên (mirror CalibrationRow, tools/types.ts). */
export interface CertificateRow {
  id: string;
  certificate_type: string | null;
  certificate_number: string | null;
  issued_by: string | null;
  issued_date: string | null;
  expiry_date: string;
  equipment_types: string[];
  scope_note: string | null;
  file_path: string | null;
  note: string | null;
}

/** Cho bảng hợp đồng lao động ở trang chi tiết nhân viên (PROMPT-65, mirror CertificateRow). */
export interface LaborContractRow {
  id: string;
  contract_type: "thu_viec" | "xac_dinh_thoi_han" | "khong_xac_dinh_thoi_han";
  contract_no: string | null;
  signed_date: string;
  start_date: string;
  end_date: string | null;
  file_path: string | null;
  note: string | null;
}

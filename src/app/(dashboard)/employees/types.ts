import type { UserRole } from "@/lib/types/profile";

/** Dùng cho bảng danh sách /employees. */
export interface EmployeeListItem {
  id: string;
  full_name: string | null;
  email: string;
  role: UserRole;
  phone: string | null;
  active: boolean;
}

/** Dùng cho trang chi tiết /employees/[id]. */
export interface EmployeeDetail {
  id: string;
  full_name: string | null;
  email: string;
  role: UserRole;
  phone: string | null;
  active: boolean;
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

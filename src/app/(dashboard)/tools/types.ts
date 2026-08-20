export interface ProfileOption {
  id: string;
  label: string;
}

export interface ActiveLoanSummary {
  borrower: { full_name: string | null } | null;
  borrowed_at: string;
  work_location: string | null;
}

/** Dùng cho bảng danh sách /tools -- gồm lượt mượn đang mở (nếu có). */
export interface ToolListItem {
  id: string;
  code: string;
  name: string;
  model: string | null;
  serial_number: string | null;
  calibration_due_date: string | null;
  calibration_not_applicable: boolean;
  // Quan hệ nhiều-1 (nhiều inspection_tools -> 1 profiles) nên Supabase trả
  // về object đơn, không phải mảng.
  custodian: { full_name: string | null } | null;
  activeLoan: ActiveLoanSummary | null;
}

/** Full row shape dùng cho form thêm/sửa dụng cụ (không cần loan). */
export interface ToolRecord {
  id: string;
  code: string;
  name: string;
  model: string | null;
  serial_number: string | null;
  ownership_doc: string | null;
  calibration_due_date: string | null;
  calibration_not_applicable: boolean;
  calibration_cert_no: string | null;
  custodian_id: string | null;
  default_location: string | null;
  status: string;
  note: string | null;
}

/** Cho bảng lịch sử mượn/trả ở trang chi tiết dụng cụ. */
export interface LoanRow {
  id: string;
  borrowed_at: string;
  expected_return_at: string | null;
  returned_at: string | null;
  work_location: string | null;
  note: string | null;
  borrower: { full_name: string | null } | null;
  customer: { company_name: string } | null;
}

export interface CustomerOption {
  id: string;
  company_name: string;
}

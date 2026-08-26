export type ContractStatus = "dang_thuc_hien" | "hoan_thanh" | "da_thanh_ly" | "huy";

/** Dùng cho bảng danh sách /contracts. */
export interface ContractListItem {
  id: string;
  code: string;
  contract_no: string;
  total_value: number;
  paid_total: number;
  status: ContractStatus;
  // Quan hệ nhiều-1 (nhiều contracts -> 1 customers) nên Supabase trả về
  // object đơn, không phải mảng.
  customer: { company_name: string } | null;
}

/**
 * Full row dùng cho form sửa (không cần paid_total -- cột cache, không sửa
 * tay). 6 field PROMPT-66 (site_location...work_request_document_no) là dữ
 * liệu cho "Giấy đề nghị thực hiện công việc" -- bản chất hợp đồng thu gọn
 * công ty <-> kiểm định viên, nhập 1 lần ở đây, đọc thẳng lúc xuất.
 */
export interface ContractRecord {
  id: string;
  code: string;
  contract_no: string;
  customer_id: string;
  title: string | null;
  signed_date: string | null;
  total_value: number;
  status: ContractStatus;
  contract_file_path: string | null;
  note: string | null;
  site_location: string | null;
  execution_time_note: string | null;
  contract_type_note: string | null;
  using_unit_name: string | null;
  using_unit_address: string | null;
  work_request_document_no: string | null;
}

/** Tên kiểm định viên dùng cho "Kiểm định viên tham gia"/"Người đề nghị" (PROMPT-66). */
export interface ContractPerson {
  id: string;
  full_name: string | null;
}

export type AcceptanceResult = "dat" | "co_van_de";

/**
 * Dùng cho trang chi tiết -- đủ field hiển thị + paid_total (cache, chỉ
 * đọc) + 8 cột thông tin nghiệm thu (PROMPT-61, migration 0033). address/
 * contact_name của customer cần thêm để làm giá trị gợi ý mặc định ở dialog
 * nghiệm thu và điền phần "ĐẠI DIỆN BÊN A" khi xuất biên bản.
 */
export interface ContractDetail extends ContractRecord {
  paid_total: number;
  customer: {
    company_name: string;
    address: string | null;
    contact_name: string | null;
    tax_code: string | null; // PROMPT-66: Mã số thuế Bên A
    phone: string | null; // PROMPT-66: SĐT liên hệ Bên A
  } | null;
  acceptance_date: string | null;
  acceptance_location: string | null;
  acceptance_result: AcceptanceResult | null;
  acceptance_note: string | null;
  representative_a_name: string | null;
  representative_a_title: string | null;
  acceptance_copies_note: string | null;
  acceptance_file_path: string | null;
  technicalResponsibles: ContractPerson[]; // PROMPT-66: tổ kiểm định viên tham gia
  requester: ContractPerson | null; // PROMPT-66: 1 người trong nhóm trên, đứng tên ký
}

export interface ContractEquipmentRow {
  id: string; // id dòng contract_equipment (dùng để "Gỡ"/"Sửa")
  equipment_id: string;
  unit: string | null;
  unit_price: number;
  quantity: number;
  so_tem: string | null;
  ngay_kiem_dinh: string | null;
  equipment: {
    code: string;
    name: string;
    type: string | null;
    serial_number: string | null;
    spec_values: Record<string, string> | null;
  } | null;
}

export interface ContractPaymentRow {
  id: string;
  amount: number;
  paid_date: string;
  method: string | null;
  note: string | null;
  // Quan hệ nhiều-1 (nhiều contract_payments -> 1 profiles) nên Supabase
  // trả về object đơn, không phải mảng.
  created_by: { full_name: string | null } | null;
}

export interface CustomerOption {
  id: string;
  code: string;
  company_name: string;
}

export interface EquipmentOption {
  id: string;
  code: string;
  name: string;
  type: string | null;
}

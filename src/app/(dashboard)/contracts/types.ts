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

/** Full row dùng cho form sửa (không cần paid_total -- cột cache, không sửa tay). */
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
}

/** Dùng cho trang chi tiết -- đủ field hiển thị + paid_total (cache, chỉ đọc). */
export interface ContractDetail extends ContractRecord {
  paid_total: number;
  customer: { company_name: string } | null;
}

export interface ContractEquipmentRow {
  id: string; // id dòng contract_equipment (dùng để "Gỡ"/"Sửa")
  equipment_id: string;
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

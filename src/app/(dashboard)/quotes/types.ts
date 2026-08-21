export type QuoteStatus = "nhap" | "da_gui" | "da_chap_nhan" | "tu_choi" | "het_han";

/** Dùng cho bảng danh sách /quotes. */
export interface QuoteListItem {
  id: string;
  code: string;
  customer_id: string | null;
  customer_name_snapshot: string;
  total_value: number;
  status: QuoteStatus;
  valid_until: string | null;
}

/** Full row dùng cho form sửa (không cần total_value -- cột cache, không sửa tay). */
export interface QuoteRecord {
  id: string;
  code: string;
  customer_id: string | null;
  customer_name_snapshot: string;
  customer_address_snapshot: string | null;
  customer_contact_snapshot: string | null;
  customer_phone_snapshot: string | null;
  customer_tax_code_snapshot: string | null;
  title: string | null;
  valid_until: string | null;
  status: QuoteStatus;
  note: string | null;
  quote_file_path: string | null;
}

/** Dùng cho trang chi tiết -- đủ field hiển thị + cache/liên kết (chỉ đọc). */
export interface QuoteDetail extends QuoteRecord {
  total_value: number;
  converted_contract_id: string | null;
}

export interface QuoteItemRow {
  id: string;
  equipment_id: string | null;
  item_name: string;
  unit: string | null;
  quantity: number;
  unit_price: number;
  note: string | null;
  equipment: { code: string; name: string } | null;
}

export interface CustomerOption {
  id: string;
  code: string;
  company_name: string;
  address: string | null;
  contact_name: string | null;
  phone: string | null;
  tax_code: string | null;
}

export interface EquipmentOption {
  id: string;
  code: string;
  name: string;
  type: string | null;
}

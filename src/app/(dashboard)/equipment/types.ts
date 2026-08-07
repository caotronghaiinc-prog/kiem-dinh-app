export interface EquipmentListItem {
  id: string;
  code: string;
  name: string;
  type: string | null;
  expiry_date: string | null;
  // Quan hệ nhiều-1 (nhiều equipment -> 1 customer) nên Supabase trả về
  // object đơn, không phải mảng.
  customer: { company_name: string } | null;
}

export interface FilterOption {
  value: string;
  label: string;
}

export interface CustomerOption {
  id: string;
  code: string;
  company_name: string;
}

/** Full row shape used by the add/edit equipment form. */
export interface EquipmentRecord {
  id: string;
  code: string;
  customer_id: string;
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
  // Chỉ có khi fetch kèm join, dùng hiển thị read-only ở form sửa.
  customer?: { code: string; company_name: string } | null;
}

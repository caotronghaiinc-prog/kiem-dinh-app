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
